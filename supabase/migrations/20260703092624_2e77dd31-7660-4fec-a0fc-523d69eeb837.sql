CREATE OR REPLACE FUNCTION public.check_and_record_usage(_tool_slug text, _guest_hash text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan text; _limit int; _used int;
  _since timestamptz := (now() - interval '24 hours');
  _ip text := COALESCE(inet_client_addr()::text, 'unknown');
  _final_hash text;
BEGIN
  _plan := public.get_effective_plan(_uid);
  SELECT daily_limit INTO _limit FROM public.plan_limits WHERE plan = _plan;
  IF _limit IS NULL THEN _limit := 0; END IF;

  IF _uid IS NOT NULL THEN
    SELECT count(*) INTO _used FROM public.tool_usage WHERE user_id = _uid AND created_at >= _since;
  ELSE
    IF _guest_hash IS NULL OR length(_guest_hash) < 8 THEN
      RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', _limit, 'plan', _plan, 'remaining', 0, 'error', 'missing_guest_hash');
    END IF;
    _final_hash := encode(sha256((_guest_hash || '|' || _ip)::bytea), 'hex');
    SELECT count(*) INTO _used FROM public.guest_usage WHERE guest_hash = _final_hash AND created_at >= _since;
  END IF;

  IF _limit >= 0 AND _used >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'used', _used, 'limit', _limit, 'plan', _plan, 'remaining', 0);
  END IF;

  IF _uid IS NOT NULL THEN
    INSERT INTO public.tool_usage (user_id, tool_slug) VALUES (_uid, _tool_slug);
  ELSE
    INSERT INTO public.guest_usage (guest_hash, tool_slug) VALUES (_final_hash, _tool_slug);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'used', _used+1, 'limit', _limit, 'plan', _plan,
    'remaining', CASE WHEN _limit < 0 THEN -1 ELSE _limit - (_used+1) END);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_usage_status(_guest_hash text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan text; _limit int; _used int := 0;
  _since timestamptz := (now() - interval '24 hours');
  _ip text := COALESCE(inet_client_addr()::text, 'unknown');
  _final_hash text;
BEGIN
  _plan := public.get_effective_plan(_uid);
  SELECT daily_limit INTO _limit FROM public.plan_limits WHERE plan = _plan;
  IF _uid IS NOT NULL THEN
    SELECT count(*) INTO _used FROM public.tool_usage WHERE user_id = _uid AND created_at >= _since;
  ELSIF _guest_hash IS NOT NULL AND length(_guest_hash) >= 8 THEN
    _final_hash := encode(sha256((_guest_hash || '|' || _ip)::bytea), 'hex');
    SELECT count(*) INTO _used FROM public.guest_usage WHERE guest_hash = _final_hash AND created_at >= _since;
  END IF;
  RETURN jsonb_build_object('plan', _plan, 'used', _used, 'limit', _limit,
    'remaining', CASE WHEN _limit < 0 THEN -1 ELSE GREATEST(_limit - _used, 0) END);
END;
$$;