-- =============================================================================
-- AI-Foto card item workflow smoke test
-- =============================================================================
-- Verifies the database side of the AI-Foto card item workbench:
-- card_item RLS/grants, approval metadata constraint, audit RPC authorization,
-- and report_exports preview registration.
--
-- psql-friendly usage:
--   psql "<db-url>" -v ON_ERROR_STOP=1 \
--     -v ai_foto_dpo_user_id=<existing-staging-auth-user-id> \
--     -f supabase/smoke-tests/20260805124500_ai_foto_card_item_workflow_smoke.sql
--
-- The test runs inside a transaction and rolls back fixture rows.
-- Do not run against production.
-- =============================================================================

\if :{?ai_foto_dpo_user_id}
\else
  \echo 'Missing required variable: ai_foto_dpo_user_id'
  \quit 1
\endif

BEGIN;

\echo '0. create AI-Foto card item workflow fixtures'
INSERT INTO public.organizations (id, name, plan_type)
VALUES (
  '00000000-0000-0000-0000-000000000401',
  'AI-Foto Card Item Smoke Org',
  'shadow_only'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  plan_type = EXCLUDED.plan_type,
  updated_at = now();

INSERT INTO public.user_roles (user_id, org_id, role)
VALUES (
  :'ai_foto_dpo_user_id'::uuid,
  '00000000-0000-0000-0000-000000000401',
  'dpo'
)
ON CONFLICT (user_id, role) DO UPDATE SET
  org_id = EXCLUDED.org_id;

INSERT INTO public.scan_wave (
  id,
  org_id,
  name,
  starts_at,
  ends_at,
  status,
  wave_token_hash,
  product_code,
  method_version
)
VALUES (
  '00000000-0000-0000-0000-000000000402',
  '00000000-0000-0000-0000-000000000401',
  'AI-Foto card item smoke wave',
  now() - interval '1 day',
  now() + interval '7 days',
  'active',
  digest('ai-foto-card-item-smoke-token', 'sha256'),
  'ai_foto',
  'ai-foto-scan-v1'
)
ON CONFLICT (id) DO UPDATE SET
  org_id = EXCLUDED.org_id,
  name = EXCLUDED.name,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  status = EXCLUDED.status,
  wave_token_hash = EXCLUDED.wave_token_hash,
  product_code = EXCLUDED.product_code,
  method_version = EXCLUDED.method_version,
  updated_at = now();

\echo '1. authenticated DPO can create and update own-org card_item rows'
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'ai_foto_dpo_user_id', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'ai_foto_dpo_user_id', 'role', 'authenticated')::text,
  true
);
SELECT set_config('sai.ai_foto_dpo_user_id', :'ai_foto_dpo_user_id', true);

INSERT INTO public.card_item (
  id,
  org_id,
  scan_wave_id,
  card_type,
  source_kind,
  cluster_key,
  title,
  observation,
  respondent_count,
  evidence_level,
  evidence_refs,
  interpretation,
  status,
  analysis_version,
  created_by
)
VALUES (
  '00000000-0000-0000-0000-000000000403',
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000402',
  'waarde',
  'application_cluster',
  'chatgpt|drafting',
  'Waardesignaal uit AI-Foto smoke',
  'Vijf respondenten noemen tijdbesparing in gestructureerde antwoorden.',
  5,
  'aannemelijk',
  jsonb_build_array(
    jsonb_build_object(
      'field', 'valueEvidenceCode',
      'sourceId', '00000000-0000-0000-0000-000000000404',
      'value', 'measurable'
    )
  ),
  'De toepassing lijkt geschikt voor verdere bespreking met proceseigenaar en DPO.',
  'consultant_reviewed',
  'ai-foto-analysis-v1',
  :'ai_foto_dpo_user_id'::uuid
);

UPDATE public.card_item
   SET follow_up_direction = 'Bespreek borging en meetbaarheid in de volgende werksessie.',
       proposed_owner_role = 'proceseigenaar',
       review_date = current_date + 30
 WHERE id = '00000000-0000-0000-0000-000000000403';

DO $$
BEGIN
  IF NOT has_table_privilege('authenticated', 'public.card_item', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated should have explicit INSERT grant on card_item';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.card_item
     WHERE id = '00000000-0000-0000-0000-000000000403'
       AND status = 'consultant_reviewed'
       AND proposed_owner_role = 'proceseigenaar'
  ) THEN
    RAISE EXCEPTION 'DPO could not insert/update own-org card_item through RLS';
  END IF;
END $$;

\echo '2. approval metadata constraint rejects approved rows without approver metadata'
DO $$
DECLARE
  v_dpo_user_id uuid := current_setting('sai.ai_foto_dpo_user_id')::uuid;
BEGIN
  BEGIN
    INSERT INTO public.card_item (
      org_id,
      scan_wave_id,
      card_type,
      source_kind,
      cluster_key,
      title,
      observation,
      respondent_count,
      evidence_refs,
      status,
      analysis_version,
      created_by
    )
    VALUES (
      '00000000-0000-0000-0000-000000000401',
      '00000000-0000-0000-0000-000000000402',
      'aandacht',
      'application_cluster',
      'chatgpt|drafting',
      'Aandachtspunt zonder metadata',
      'Deze rij hoort door de approval constraint te worden geweigerd.',
      5,
      jsonb_build_array(jsonb_build_object('field', 'outputControlCode', 'value', 'usually_no_check')),
      'approved',
      'ai-foto-analysis-v1',
      v_dpo_user_id
    );

    RAISE EXCEPTION 'approved card_item without approved_by/approved_at should fail';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;
END $$;

\echo '3. DPO can approve, record audit, and register an export preview'
UPDATE public.card_item
   SET status = 'approved',
       approved_by = :'ai_foto_dpo_user_id'::uuid,
       approved_at = now()
 WHERE id = '00000000-0000-0000-0000-000000000403';

SELECT public.record_ai_foto_card_item_audit(
  '00000000-0000-0000-0000-000000000401',
  'card_item.approved',
  '00000000-0000-0000-0000-000000000403',
  jsonb_build_object('source', 'smoke_test')
);

INSERT INTO public.report_exports (
  id,
  org_id,
  wave_id,
  export_type,
  filters,
  row_count,
  view_or_query_version,
  min_cell_size,
  k_anonymity_applied,
  suppressed_cell_count,
  export_status,
  created_by
)
VALUES (
  '00000000-0000-0000-0000-000000000405',
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000402',
  'ai_foto_cards',
  jsonb_build_object(
    'analysis_version', 'ai-foto-analysis-v1',
    'card_item_ids', jsonb_build_array('00000000-0000-0000-0000-000000000403'),
    'method_version', 'ai-foto-scan-v1',
    'preview_only', true
  ),
  1,
  'ai-foto-analysis-v1',
  5,
  5,
  0,
  'preview_ready',
  :'ai_foto_dpo_user_id'::uuid
);

SELECT public.record_ai_foto_card_item_audit(
  '00000000-0000-0000-0000-000000000401',
  'ai_foto.export_preview_recorded',
  '00000000-0000-0000-0000-000000000405',
  jsonb_build_object('item_count', 1)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM public.audit_events
     WHERE org_id = '00000000-0000-0000-0000-000000000401'
       AND event_type = 'card_item.approved'
       AND subject_table = 'card_item'
       AND subject_id = '00000000-0000-0000-0000-000000000403'
  ) THEN
    RAISE EXCEPTION 'card_item.approved audit event missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.report_exports
     WHERE id = '00000000-0000-0000-0000-000000000405'
       AND export_type = 'ai_foto_cards'
       AND export_status = 'preview_ready'
       AND filters->>'analysis_version' = 'ai-foto-analysis-v1'
  ) THEN
    RAISE EXCEPTION 'AI-Foto export preview row missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.audit_events
     WHERE org_id = '00000000-0000-0000-0000-000000000401'
       AND event_type = 'ai_foto.export_preview_recorded'
       AND subject_table = 'report_exports'
       AND subject_id = '00000000-0000-0000-0000-000000000405'
  ) THEN
    RAISE EXCEPTION 'export preview audit event missing';
  END IF;
END $$;

\echo '4. anon cannot call AI-Foto audit RPC'
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF has_function_privilege(
    'anon',
    'public.record_ai_foto_card_item_audit(uuid, text, uuid, jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon must not execute record_ai_foto_card_item_audit';
  END IF;
END $$;

ROLLBACK;

\echo 'AI-Foto card item workflow smoke passed'
