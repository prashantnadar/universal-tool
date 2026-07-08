-- Add idempotency to usage tables
ALTER TABLE public.tool_usage
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.guest_usage
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;

-- Unique constraint per user (partial index so old rows are eligible for reuse via cleanup)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tool_usage_user_idem
  ON public.tool_usage (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_guest_usage_hash_idem
  ON public.guest_usage (guest_hash, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Replace check_and_record_usage with idempotent version
CREATE OR REPLACE FUNCTION public.check_and_record_usage(
  _tool_slug text,
  _idempotency_key uuid,
  _guest_hash text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan text; _limit int; _used int;
  _since timestamptz := (now() - interval '24 hours');
  _ip text := COALESCE(inet_client_addr()::text, 'unknown');
  _final_hash text;
  _existing uuid;
BEGIN
  IF _idempotency_key IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', 0,
      'plan', 'guest', 'remaining', 0, 'error', 'missing_idempotency_key');
  END IF;

  _plan := public.get_effective_plan(_uid);
  SELECT daily_limit INTO _limit FROM public.plan_limits WHERE plan = _plan;
  IF _limit IS NULL THEN _limit := 0; END IF;

  -- Guest path: hash IP+fingerprint server-side
  IF _uid IS NULL THEN
    IF _guest_hash IS NULL OR length(_guest_hash) < 8 THEN
      RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', _limit,
        'plan', _plan, 'remaining', 0, 'error', 'missing_guest_hash');
    END IF;
    _final_hash := encode(sha256((_guest_hash || '|' || _ip)::bytea), 'hex');
  END IF;

  -- Idempotency check: same key → same answer, no double charge
  IF _uid IS NOT NULL THEN
    SELECT id INTO _existing FROM public.tool_usage
      WHERE user_id = _uid AND idempotency_key = _idempotency_key
      LIMIT 1;
  ELSE
    SELECT id INTO _existing FROM public.guest_usage
      WHERE guest_hash = _final_hash AND idempotency_key = _idempotency_key
      LIMIT 1;
  END IF;

  IF _existing IS NOT NULL THEN
    -- Recompute counters but don't insert again
    IF _uid IS NOT NULL THEN
      SELECT count(*) INTO _used FROM public.tool_usage WHERE user_id = _uid AND created_at >= _since;
    ELSE
      SELECT count(*) INTO _used FROM public.guest_usage WHERE guest_hash = _final_hash AND created_at >= _since;
    END IF;
    RETURN jsonb_build_object('allowed', true, 'used', _used, 'limit', _limit,
      'plan', _plan, 'remaining', CASE WHEN _limit < 0 THEN -1 ELSE GREATEST(_limit - _used, 0) END,
      'idempotent', true);
  END IF;

  -- Fresh request: check limit
  IF _uid IS NOT NULL THEN
    SELECT count(*) INTO _used FROM public.tool_usage WHERE user_id = _uid AND created_at >= _since;
  ELSE
    SELECT count(*) INTO _used FROM public.guest_usage WHERE guest_hash = _final_hash AND created_at >= _since;
  END IF;

  IF _limit >= 0 AND _used >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'used', _used, 'limit', _limit,
      'plan', _plan, 'remaining', 0);
  END IF;

  -- Record (unique index protects against concurrent duplicates)
  BEGIN
    IF _uid IS NOT NULL THEN
      INSERT INTO public.tool_usage (user_id, tool_slug, idempotency_key)
        VALUES (_uid, _tool_slug, _idempotency_key);
    ELSE
      INSERT INTO public.guest_usage (guest_hash, tool_slug, idempotency_key)
        VALUES (_final_hash, _tool_slug, _idempotency_key);
    END IF;
  EXCEPTION WHEN unique_violation THEN
    -- Concurrent duplicate: treat as idempotent success
    RETURN jsonb_build_object('allowed', true, 'used', _used, 'limit', _limit,
      'plan', _plan, 'remaining', CASE WHEN _limit < 0 THEN -1 ELSE GREATEST(_limit - _used, 0) END,
      'idempotent', true);
  END;

  RETURN jsonb_build_object('allowed', true, 'used', _used + 1, 'limit', _limit,
    'plan', _plan, 'remaining', CASE WHEN _limit < 0 THEN -1 ELSE _limit - (_used + 1) END);
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_record_usage(text, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_and_record_usage(text, uuid, text) TO authenticated, anon;

-- Drop the older 2-arg version so callers don't accidentally use it
DROP FUNCTION IF EXISTS public.check_and_record_usage(text, text);

-- Refund: only removes the caller's own reservation (auth.uid() scoped)
CREATE OR REPLACE FUNCTION public.refund_usage(
  _idempotency_key uuid,
  _guest_hash text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _ip text := COALESCE(inet_client_addr()::text, 'unknown');
  _final_hash text;
  _deleted int;
BEGIN
  IF _idempotency_key IS NULL THEN
    RETURN jsonb_build_object('refunded', false, 'error', 'missing_idempotency_key');
  END IF;

  IF _uid IS NOT NULL THEN
    WITH del AS (
      DELETE FROM public.tool_usage
      WHERE user_id = _uid AND idempotency_key = _idempotency_key
        AND created_at >= now() - interval '24 hours'
      RETURNING 1
    ) SELECT count(*) INTO _deleted FROM del;
  ELSE
    IF _guest_hash IS NULL OR length(_guest_hash) < 8 THEN
      RETURN jsonb_build_object('refunded', false, 'error', 'missing_guest_hash');
    END IF;
    _final_hash := encode(sha256((_guest_hash || '|' || _ip)::bytea), 'hex');
    WITH del AS (
      DELETE FROM public.guest_usage
      WHERE guest_hash = _final_hash AND idempotency_key = _idempotency_key
        AND created_at >= now() - interval '24 hours'
      RETURNING 1
    ) SELECT count(*) INTO _deleted FROM del;
  END IF;

  RETURN jsonb_build_object('refunded', _deleted > 0);
END;
$$;

REVOKE ALL ON FUNCTION public.refund_usage(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.refund_usage(uuid, text) TO authenticated, anon;