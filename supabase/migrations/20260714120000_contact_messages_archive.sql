-- ============================================================================
-- Archived Contact Messages
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_list_archived_contact_messages(
    _limit integer DEFAULT 100,
    _offset integer DEFAULT 0
)
RETURNS TABLE(
    id uuid,
    name text,
    email text,
    subject text,
    message text,
    is_read boolean,
    created_at timestamptz,
    deleted_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'forbidden';
    END IF;

    INSERT INTO public.audit_logs (
        actor_id,
        action,
        metadata
    )
    VALUES (
        auth.uid(),
        'admin_archived_contact_messages_read',
        jsonb_build_object(
            'limit', _limit,
            'offset', _offset
        )
    );

    RETURN QUERY
    SELECT
        cm.id,
        cm.name,
        cm.email,
        cm.subject,
        cm.message,
        cm.is_read,
        cm.created_at,
        cm.deleted_at
    FROM public.contact_messages cm
    WHERE cm.deleted_at IS NOT NULL
    ORDER BY cm.deleted_at DESC
    LIMIT _limit
    OFFSET _offset;

END;
$$;


-- ============================================================================
-- Restore Archived Contact Message
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_restore_contact_message(
    _id uuid
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'forbidden';
    END IF;

    UPDATE public.contact_messages
    SET deleted_at = NULL
    WHERE id = _id;

    INSERT INTO public.audit_logs (
        actor_id,
        action,
        target_id,
        target_type,
        metadata
    )
    VALUES (
        auth.uid(),
        'admin_restore_contact_message',
        _id,
        'contact_message',
        '{}'::jsonb
    );

END;
$$;


-- ============================================================================
-- Permanently Delete Contact Message (Super Admin Only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_permanent_delete_contact_message(
    _id uuid
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    -- Only Super Admin
    IF auth.uid() <> 'f0a17059-c9ac-46e1-859c-82bd1487f069'::uuid THEN
        RAISE EXCEPTION 'Only Super Admin can permanently delete messages.';
    END IF;

    DELETE
    FROM public.contact_messages
    WHERE id = _id;

    INSERT INTO public.audit_logs (
        actor_id,
        action,
        target_id,
        target_type,
        metadata
    )
    VALUES (
        auth.uid(),
        'admin_permanent_delete_contact_message',
        _id,
        'contact_message',
        '{}'::jsonb
    );

END;
$$;

-- ============================================================================
-- Permissions
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.admin_list_archived_contact_messages(integer, integer)
FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.admin_restore_contact_message(uuid)
FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.admin_permanent_delete_contact_message(uuid)
FROM PUBLIC, anon;


GRANT EXECUTE ON FUNCTION public.admin_list_archived_contact_messages(integer, integer)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_restore_contact_message(uuid)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_permanent_delete_contact_message(uuid)
TO authenticated;