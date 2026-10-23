BEGIN;

-- AI-Foto card item workflow support.
-- Keeps card generation idempotent and audit logging behind an org-scoped
-- SECURITY DEFINER RPC instead of granting direct audit_events inserts.

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_item_ai_foto_idempotent
  ON public.card_item(
    org_id,
    COALESCE(scan_wave_id, '00000000-0000-0000-0000-000000000000'::uuid),
    analysis_version,
    card_type,
    source_kind,
    cluster_key
  );

CREATE OR REPLACE FUNCTION public.record_ai_foto_card_item_audit(
  p_org_id uuid,
  p_event_type text,
  p_subject_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'org_id_required';
  END IF;

  IF p_event_type NOT IN (
    'card_item.generated',
    'card_item.updated',
    'card_item.approved',
    'ai_foto.export_preview_recorded'
  ) THEN
    RAISE EXCEPTION 'unsupported_ai_foto_audit_event';
  END IF;

  IF NOT (
    public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(p_org_id)
  ) THEN
    RAISE EXCEPTION 'unauthorized: record_ai_foto_card_item_audit';
  END IF;

  INSERT INTO public.audit_events (
    org_id,
    event_type,
    actor_id,
    actor_kind,
    subject_table,
    subject_id,
    payload
  )
  VALUES (
    p_org_id,
    p_event_type,
    auth.uid(),
    'user',
    CASE
      WHEN p_event_type = 'ai_foto.export_preview_recorded' THEN 'report_exports'
      ELSE 'card_item'
    END,
    p_subject_id::text,
    COALESCE(p_payload, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_ai_foto_card_item_audit(uuid, text, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_foto_card_item_audit(uuid, text, uuid, jsonb)
  TO authenticated;

COMMIT;
