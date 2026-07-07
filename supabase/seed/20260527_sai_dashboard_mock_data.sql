-- =============================================================================
-- Shadow AI Scan V8.1 - dashboard mock/test data
-- =============================================================================
-- Run after:
--   1. supabase/seed/20260505_v8_1_reference_seed.sql
--   2. supabase/seed/20260504141000_sai_smoke_seed.sql
--
-- Purpose:
-- - persisted, deterministic dashboard test data for local/staging checks
-- - no UI mock data in production components
-- - safe to re-run: fixed IDs and upserts are used where rows are mutable
--
-- Test organization:
--   SAI Smoke Test Organisatie
--   00000000-0000-0000-0000-000000000101
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure the shared smoke-test organization and wave exist.
INSERT INTO public.organizations (id, name, plan_type)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  'SAI Smoke Test Organisatie',
  'shadow_only'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  plan_type = EXCLUDED.plan_type,
  updated_at = now();

INSERT INTO public.scan_wave (id, org_id, name, starts_at, ends_at, status)
VALUES (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000101',
  'Smoke test wave',
  now() - interval '14 days',
  now() + interval '14 days',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  status = EXCLUDED.status,
  updated_at = now();

-- One active scoring config is required for persisted risk output.
INSERT INTO public.scan_scoring_config (
  id,
  org_id,
  scoring_config_key,
  methodology_version,
  config_json,
  dashboard_min_cell_size,
  effective_from,
  is_active
)
SELECT
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000101',
  'sai-v8.1-dashboard-mock',
  'V8.1',
  '{"source":"dashboard_mock_seed"}'::jsonb,
  5,
  now() - interval '14 days',
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.scan_scoring_config
  WHERE org_id = '00000000-0000-0000-0000-000000000101'
    AND is_active = true
);

-- Code-context reference values used by the dashboard mock data. These are also
-- present in the full V8.1 reference seed, but keeping them here makes this
-- dashboard seed robust for partially seeded staging databases.
INSERT INTO public.ref_context (
  code,
  label_nl,
  exposure_weight,
  shadow_weight,
  trigger_codes,
  sort_order,
  is_active
)
VALUES
  ('intern_gebruik', 'Intern gebruik', 5, 0, ARRAY['context_multiplier_1_0']::text[], 11, true),
  ('klantgerichte_toepassing', 'Klantgerichte toepassing', 10, 0, ARRAY['context_multiplier_1_25']::text[], 20, true),
  ('beslisondersteuning', 'Beslisondersteuning', 15, 5, ARRAY['context_multiplier_1_4']::text[], 30, true),
  ('besluiten_over_personen', 'Besluiten over personen', 25, 10, ARRAY['context_multiplier_1_6', 'human_impact']::text[], 40, true),
  ('financieel_juridisch', 'Financieel en juridisch', 20, 8, ARRAY['context_multiplier_1_5', 'human_review_required']::text[], 50, true),
  ('kritieke_systemen', 'Kritieke systemen', 35, 20, ARRAY['context_multiplier_2_0', 'critical_systems']::text[], 70, true),
  ('nog_niet_duidelijk', 'Nog niet duidelijk', 10, 5, ARRAY['context_uncertain']::text[], 80, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  exposure_weight = EXCLUDED.exposure_weight,
  shadow_weight = EXCLUDED.shadow_weight,
  trigger_codes = EXCLUDED.trigger_codes,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Tools and org policy snapshots used by the mock runs.
INSERT INTO public.tools_library (
  tool_code,
  name,
  vendor,
  category,
  default_eu_ai_act_flag_code
)
VALUES
  ('chatgpt', 'ChatGPT', 'OpenAI', 'Algemene AI', 'none'),
  ('github_copilot', 'GitHub Copilot', 'GitHub', 'Code', 'none'),
  ('n8n', 'n8n', 'n8n', 'Data en automatisering', 'none')
ON CONFLICT (tool_code) DO UPDATE SET
  name = EXCLUDED.name,
  vendor = EXCLUDED.vendor,
  category = EXCLUDED.category,
  default_eu_ai_act_flag_code = EXCLUDED.default_eu_ai_act_flag_code,
  updated_at = now();

INSERT INTO public.org_tool_policy (
  org_id,
  tool_code,
  org_policy_status_code,
  eu_ai_act_flag_code,
  notes
)
VALUES
  (
    '00000000-0000-0000-0000-000000000101',
    'chatgpt',
    'under_review',
    'none',
    'Dashboard mock policy'
  ),
  (
    '00000000-0000-0000-0000-000000000101',
    'github_copilot',
    'restricted',
    'none',
    'Dashboard mock policy'
  ),
  (
    '00000000-0000-0000-0000-000000000101',
    'n8n',
    'newly_discovered',
    'none',
    'Dashboard mock policy'
  )
ON CONFLICT (org_id, tool_code) DO UPDATE SET
  org_policy_status_code = EXCLUDED.org_policy_status_code,
  eu_ai_act_flag_code = EXCLUDED.eu_ai_act_flag_code,
  notes = EXCLUDED.notes,
  updated_at = now();

INSERT INTO public.org_tool_policy_snapshot (
  org_id,
  tool_code,
  org_policy_status_code,
  eu_ai_act_flag_code,
  notes,
  content_hash,
  source_policy_id
)
SELECT
  policy.org_id,
  policy.tool_code,
  policy.org_policy_status_code,
  policy.eu_ai_act_flag_code,
  policy.notes,
  encode(
    digest(
      concat_ws(
        '|',
        policy.tool_code,
        policy.org_policy_status_code,
        policy.eu_ai_act_flag_code,
        coalesce(policy.notes, '')
      ),
      'sha256'
    ),
    'hex'
  ),
  policy.id
FROM public.org_tool_policy policy
WHERE policy.org_id = '00000000-0000-0000-0000-000000000101'
  AND policy.tool_code IN ('chatgpt', 'github_copilot', 'n8n')
ON CONFLICT (org_id, tool_code, content_hash) DO NOTHING;

WITH mock_runs (
  run_id,
  tool_id,
  use_case_id,
  risk_tool_id,
  tool_code,
  tool_name,
  policy_status,
  department_code,
  frequency_code,
  awareness_code,
  anonymization_code,
  extension_code,
  automation_code,
  skill_code,
  account_code,
  use_case_code,
  context_code,
  data_type_code,
  support_need_code,
  started_offset,
  completed_offset,
  consent_ambassador,
  shadow_score,
  exposure_score,
  priority_score,
  score_tier,
  review_class,
  trigger_codes,
  review_reason
) AS (
  VALUES
    ('00000000-0000-0000-0000-00000000a001'::uuid, '00000000-0000-0000-0000-00000000b001'::uuid, '00000000-0000-0000-0000-00000000c001'::uuid, '00000000-0000-0000-0000-00000000d001'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'marketing_communicatie', 'daily', 'vaag', 'soms', 'ja_bewust', 'alleen_chatbot', 'gemiddeld', 'prive_betaald', 'teksten_schrijven', null, 'internal_emails', 'clear_policy', 10, 9, true, 42, 47, 51, 'high', 'priority_review', ARRAY['personal_paid_account','internal_emails']::text[], 'personal_account'),
    ('00000000-0000-0000-0000-00000000a002'::uuid, '00000000-0000-0000-0000-00000000b002'::uuid, '00000000-0000-0000-0000-00000000c002'::uuid, '00000000-0000-0000-0000-00000000d002'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'sales_account', 'weekly', 'nee', 'nooit', 'nee', 'alleen_chatbot', 'beginner', 'personal_free', 'samenvatten_redigeren', null, 'customer_data', 'training', 9, 8, false, 45, 52, 56, 'high', 'priority_review', ARRAY['personal_free_account','customer_data']::text[], 'customer_data'),
    ('00000000-0000-0000-0000-00000000a003'::uuid, '00000000-0000-0000-0000-00000000b003'::uuid, '00000000-0000-0000-0000-00000000c003'::uuid, '00000000-0000-0000-0000-00000000d003'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'operations', 'weekly', 'vaag', 'soms', 'weet_niet', 'alleen_chatbot', 'gemiddeld', 'business_license', 'informatie_opzoeken', null, 'public_information', 'inspiration_examples', 8, 7, false, 18, 22, 24, 'low', 'standard', ARRAY[]::text[], null),
    ('00000000-0000-0000-0000-00000000a004'::uuid, '00000000-0000-0000-0000-00000000b004'::uuid, '00000000-0000-0000-0000-00000000c004'::uuid, '00000000-0000-0000-0000-00000000d004'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'hr_recruitment', 'daily', 'nee_niet_verdiept', 'nooit', 'ja_onzeker', 'alleen_chatbot', 'beginner', 'both', 'brainstormen', null, 'names', 'clear_policy', 7, 6, true, 48, 58, 62, 'high', 'priority_review', ARRAY['personal_account','names','browser_extension']::text[], 'personal_account'),
    ('00000000-0000-0000-0000-00000000a005'::uuid, '00000000-0000-0000-0000-00000000b005'::uuid, '00000000-0000-0000-0000-00000000c005'::uuid, '00000000-0000-0000-0000-00000000d005'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'finance_legal', 'monthly', 'ja_goed', 'altijd', 'nee', 'alleen_chatbot', 'gevorderd', 'business_license', 'vertalen', null, 'legal_documents', 'technical_advice', 6, 5, false, 16, 38, 41, 'elevated', 'priority_review', ARRAY['legal_documents']::text[], 'legal_data'),
    ('00000000-0000-0000-0000-00000000a006'::uuid, '00000000-0000-0000-0000-00000000b006'::uuid, '00000000-0000-0000-0000-00000000c006'::uuid, '00000000-0000-0000-0000-00000000d006'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'vaag', 'soms', 'ja_bewust', 'alleen_chatbot', 'gevorderd', 'business_license', 'code_schrijven', 'intern_gebruik', 'source_code_logic', 'technical_advice', 5, 4, false, 28, 55, 58, 'high', 'priority_review', ARRAY['source_code_logic','restricted_tool']::text[], 'restricted_tool'),
    ('00000000-0000-0000-0000-00000000a007'::uuid, '00000000-0000-0000-0000-00000000b007'::uuid, '00000000-0000-0000-0000-00000000c007'::uuid, '00000000-0000-0000-0000-00000000d007'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'nee', 'nooit', 'ja_onzeker', 'gekoppeld_apps', 'gemiddeld', 'both', 'code_schrijven', 'klantgerichte_toepassing', 'source_code_logic', 'clear_policy', 5, 4, true, 55, 68, 72, 'high', 'priority_review', ARRAY['restricted_tool','customer_facing_software','agentic_usage']::text[], 'restricted_tool'),
    ('00000000-0000-0000-0000-00000000a008'::uuid, '00000000-0000-0000-0000-00000000b008'::uuid, '00000000-0000-0000-0000-00000000c008'::uuid, '00000000-0000-0000-0000-00000000d008'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'weekly', 'vaag', 'soms', 'nee', 'alleen_chatbot', 'gevorderd', 'business_license', 'code_schrijven', 'beslisondersteuning', 'source_code_logic', 'technical_advice', 4, 3, false, 48, 61, 65, 'high', 'priority_review', ARRAY['restricted_tool','decision_support']::text[], 'decision_support'),
    ('00000000-0000-0000-0000-00000000a009'::uuid, '00000000-0000-0000-0000-00000000b009'::uuid, '00000000-0000-0000-0000-00000000c009'::uuid, '00000000-0000-0000-0000-00000000d009'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'nee_niet_verdiept', 'nooit', 'ja_bewust', 'weet_niet_zeker', 'gemiddeld', 'personal_paid', 'code_schrijven', 'kritieke_systemen', 'source_code_logic', 'training', 3, 2, false, 62, 82, 88, 'critical', 'priority_review', ARRAY['restricted_tool','critical_systems','personal_paid_account']::text[], 'critical_systems'),
    ('00000000-0000-0000-0000-00000000a010'::uuid, '00000000-0000-0000-0000-00000000b010'::uuid, '00000000-0000-0000-0000-00000000c010'::uuid, '00000000-0000-0000-0000-00000000d010'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'ja_goed', 'soms', 'nee', 'alleen_chatbot', 'expert', 'business_license', 'code_schrijven', 'financieel_juridisch', 'source_code_logic', 'technical_advice', 3, 2, false, 44, 57, 60, 'high', 'priority_review', ARRAY['restricted_tool','financial_legal_context']::text[], 'financial_legal_context'),
    ('00000000-0000-0000-0000-00000000a011'::uuid, '00000000-0000-0000-0000-00000000b011'::uuid, '00000000-0000-0000-0000-00000000c011'::uuid, '00000000-0000-0000-0000-00000000d011'::uuid, 'n8n', 'n8n', 'newly_discovered', 'operations', 'weekly', 'vaag', 'soms', 'nee', 'gekoppeld_apps', 'gemiddeld', 'business_license', 'automatisering', null, 'internal_documents', 'practice_together', 2, 1, false, 34, 58, 61, 'high', 'priority_review', ARRAY['newly_discovered_tool','automation']::text[], 'newly_discovered_tool'),
    ('00000000-0000-0000-0000-00000000a012'::uuid, '00000000-0000-0000-0000-00000000b012'::uuid, '00000000-0000-0000-0000-00000000c012'::uuid, '00000000-0000-0000-0000-00000000d012'::uuid, 'n8n', 'n8n', 'newly_discovered', 'sales_account', 'daily', 'nee', 'nooit', 'weet_niet', 'agents_reeks_taken', 'beginner', 'personal_free', 'workflow_uitvoeren', null, 'customer_data', 'clear_policy', 2, 1, false, 58, 75, 81, 'critical', 'priority_review', ARRAY['newly_discovered_tool','agentic_usage','customer_data']::text[], 'agentic_usage'),
    ('00000000-0000-0000-0000-00000000a013'::uuid, '00000000-0000-0000-0000-00000000b013'::uuid, '00000000-0000-0000-0000-00000000c013'::uuid, '00000000-0000-0000-0000-00000000d013'::uuid, 'n8n', 'n8n', 'newly_discovered', 'finance_legal', 'weekly', 'vaag', 'soms', 'nee', 'gekoppeld_apps', 'gemiddeld', 'both', 'data_analyseren', null, 'financial_data', 'technical_advice', 1, 0, false, 52, 66, 70, 'high', 'priority_review', ARRAY['newly_discovered_tool','financial_data']::text[], 'financial_data')
)
INSERT INTO public.survey_run (
  id,
  org_id,
  wave_id,
  locale,
  source,
  started_at,
  completed_at,
  consent_ambassador,
  created_at,
  updated_at
)
SELECT
  run_id,
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000201',
  'nl',
  'dashboard_mock_seed',
  now() - (started_offset || ' days')::interval,
  now() - (completed_offset || ' days')::interval,
  consent_ambassador,
  now() - (started_offset || ' days')::interval,
  now()
FROM mock_runs
ON CONFLICT (id) DO UPDATE SET
  completed_at = EXCLUDED.completed_at,
  consent_ambassador = EXCLUDED.consent_ambassador,
  updated_at = now();

WITH mock_runs (
  run_id,
  tool_id,
  use_case_id,
  risk_tool_id,
  tool_code,
  tool_name,
  policy_status,
  department_code,
  frequency_code,
  awareness_code,
  anonymization_code,
  extension_code,
  automation_code,
  skill_code,
  account_code,
  use_case_code,
  context_code,
  data_type_code,
  support_need_code,
  started_offset,
  completed_offset,
  consent_ambassador,
  shadow_score,
  exposure_score,
  priority_score,
  score_tier,
  review_class,
  trigger_codes,
  review_reason
) AS (
  VALUES
    ('00000000-0000-0000-0000-00000000a001'::uuid, '00000000-0000-0000-0000-00000000b001'::uuid, '00000000-0000-0000-0000-00000000c001'::uuid, '00000000-0000-0000-0000-00000000d001'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'marketing_communicatie', 'daily', 'vaag', 'soms', 'ja_bewust', 'alleen_chatbot', 'gemiddeld', 'prive_betaald', 'teksten_schrijven', null, 'internal_emails', 'clear_policy', 10, 9, true, 42, 47, 51, 'high', 'priority_review', ARRAY['personal_paid_account','internal_emails']::text[], 'personal_account'),
    ('00000000-0000-0000-0000-00000000a002'::uuid, '00000000-0000-0000-0000-00000000b002'::uuid, '00000000-0000-0000-0000-00000000c002'::uuid, '00000000-0000-0000-0000-00000000d002'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'sales_account', 'weekly', 'nee', 'nooit', 'nee', 'alleen_chatbot', 'beginner', 'personal_free', 'samenvatten_redigeren', null, 'customer_data', 'training', 9, 8, false, 45, 52, 56, 'high', 'priority_review', ARRAY['personal_free_account','customer_data']::text[], 'customer_data'),
    ('00000000-0000-0000-0000-00000000a003'::uuid, '00000000-0000-0000-0000-00000000b003'::uuid, '00000000-0000-0000-0000-00000000c003'::uuid, '00000000-0000-0000-0000-00000000d003'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'operations', 'weekly', 'vaag', 'soms', 'weet_niet', 'alleen_chatbot', 'gemiddeld', 'business_license', 'informatie_opzoeken', null, 'public_information', 'inspiration_examples', 8, 7, false, 18, 22, 24, 'low', 'standard', ARRAY[]::text[], null),
    ('00000000-0000-0000-0000-00000000a004'::uuid, '00000000-0000-0000-0000-00000000b004'::uuid, '00000000-0000-0000-0000-00000000c004'::uuid, '00000000-0000-0000-0000-00000000d004'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'hr_recruitment', 'daily', 'nee_niet_verdiept', 'nooit', 'ja_onzeker', 'alleen_chatbot', 'beginner', 'both', 'brainstormen', null, 'names', 'clear_policy', 7, 6, true, 48, 58, 62, 'high', 'priority_review', ARRAY['personal_account','names','browser_extension']::text[], 'personal_account'),
    ('00000000-0000-0000-0000-00000000a005'::uuid, '00000000-0000-0000-0000-00000000b005'::uuid, '00000000-0000-0000-0000-00000000c005'::uuid, '00000000-0000-0000-0000-00000000d005'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'finance_legal', 'monthly', 'ja_goed', 'altijd', 'nee', 'alleen_chatbot', 'gevorderd', 'business_license', 'vertalen', null, 'legal_documents', 'technical_advice', 6, 5, false, 16, 38, 41, 'elevated', 'priority_review', ARRAY['legal_documents']::text[], 'legal_data'),
    ('00000000-0000-0000-0000-00000000a006'::uuid, '00000000-0000-0000-0000-00000000b006'::uuid, '00000000-0000-0000-0000-00000000c006'::uuid, '00000000-0000-0000-0000-00000000d006'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'vaag', 'soms', 'ja_bewust', 'alleen_chatbot', 'gevorderd', 'business_license', 'code_schrijven', 'intern_gebruik', 'source_code_logic', 'technical_advice', 5, 4, false, 28, 55, 58, 'high', 'priority_review', ARRAY['source_code_logic','restricted_tool']::text[], 'restricted_tool'),
    ('00000000-0000-0000-0000-00000000a007'::uuid, '00000000-0000-0000-0000-00000000b007'::uuid, '00000000-0000-0000-0000-00000000c007'::uuid, '00000000-0000-0000-0000-00000000d007'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'nee', 'nooit', 'ja_onzeker', 'gekoppeld_apps', 'gemiddeld', 'both', 'code_schrijven', 'klantgerichte_toepassing', 'source_code_logic', 'clear_policy', 5, 4, true, 55, 68, 72, 'high', 'priority_review', ARRAY['restricted_tool','customer_facing_software','agentic_usage']::text[], 'restricted_tool'),
    ('00000000-0000-0000-0000-00000000a008'::uuid, '00000000-0000-0000-0000-00000000b008'::uuid, '00000000-0000-0000-0000-00000000c008'::uuid, '00000000-0000-0000-0000-00000000d008'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'weekly', 'vaag', 'soms', 'nee', 'alleen_chatbot', 'gevorderd', 'business_license', 'code_schrijven', 'beslisondersteuning', 'source_code_logic', 'technical_advice', 4, 3, false, 48, 61, 65, 'high', 'priority_review', ARRAY['restricted_tool','decision_support']::text[], 'decision_support'),
    ('00000000-0000-0000-0000-00000000a009'::uuid, '00000000-0000-0000-0000-00000000b009'::uuid, '00000000-0000-0000-0000-00000000c009'::uuid, '00000000-0000-0000-0000-00000000d009'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'nee_niet_verdiept', 'nooit', 'ja_bewust', 'weet_niet_zeker', 'gemiddeld', 'personal_paid', 'code_schrijven', 'kritieke_systemen', 'source_code_logic', 'training', 3, 2, false, 62, 82, 88, 'critical', 'priority_review', ARRAY['restricted_tool','critical_systems','personal_paid_account']::text[], 'critical_systems'),
    ('00000000-0000-0000-0000-00000000a010'::uuid, '00000000-0000-0000-0000-00000000b010'::uuid, '00000000-0000-0000-0000-00000000c010'::uuid, '00000000-0000-0000-0000-00000000d010'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'ja_goed', 'soms', 'nee', 'alleen_chatbot', 'expert', 'business_license', 'code_schrijven', 'financieel_juridisch', 'source_code_logic', 'technical_advice', 3, 2, false, 44, 57, 60, 'high', 'priority_review', ARRAY['restricted_tool','financial_legal_context']::text[], 'financial_legal_context'),
    ('00000000-0000-0000-0000-00000000a011'::uuid, '00000000-0000-0000-0000-00000000b011'::uuid, '00000000-0000-0000-0000-00000000c011'::uuid, '00000000-0000-0000-0000-00000000d011'::uuid, 'n8n', 'n8n', 'newly_discovered', 'operations', 'weekly', 'vaag', 'soms', 'nee', 'gekoppeld_apps', 'gemiddeld', 'business_license', 'automatisering', null, 'internal_documents', 'practice_together', 2, 1, false, 34, 58, 61, 'high', 'priority_review', ARRAY['newly_discovered_tool','automation']::text[], 'newly_discovered_tool'),
    ('00000000-0000-0000-0000-00000000a012'::uuid, '00000000-0000-0000-0000-00000000b012'::uuid, '00000000-0000-0000-0000-00000000c012'::uuid, '00000000-0000-0000-0000-00000000d012'::uuid, 'n8n', 'n8n', 'newly_discovered', 'sales_account', 'daily', 'nee', 'nooit', 'weet_niet', 'agents_reeks_taken', 'beginner', 'personal_free', 'workflow_uitvoeren', null, 'customer_data', 'clear_policy', 2, 1, false, 58, 75, 81, 'critical', 'priority_review', ARRAY['newly_discovered_tool','agentic_usage','customer_data']::text[], 'agentic_usage'),
    ('00000000-0000-0000-0000-00000000a013'::uuid, '00000000-0000-0000-0000-00000000b013'::uuid, '00000000-0000-0000-0000-00000000c013'::uuid, '00000000-0000-0000-0000-00000000d013'::uuid, 'n8n', 'n8n', 'newly_discovered', 'finance_legal', 'weekly', 'vaag', 'soms', 'nee', 'gekoppeld_apps', 'gemiddeld', 'both', 'data_analyseren', null, 'financial_data', 'technical_advice', 1, 0, false, 52, 66, 70, 'high', 'priority_review', ARRAY['newly_discovered_tool','financial_data']::text[], 'financial_data')
)
INSERT INTO public.survey_profile (
  survey_run_id,
  department_code,
  ai_frequency_code,
  data_awareness_code,
  anonymization_behavior_code,
  browser_extension_usage_code,
  automation_usage_code,
  ai_policy_awareness_code,
  ai_skill_level_code,
  processing_output_code,
  updated_at
)
SELECT
  run_id,
  department_code,
  frequency_code,
  CASE
    WHEN awareness_code = 'ja_goed' THEN 'ja_controle'
    WHEN awareness_code = 'vaag' THEN 'gedeeltelijk'
    WHEN awareness_code = 'nee' THEN 'nee_prive'
    ELSE 'nee_niet_verdiept'
  END,
  anonymization_code,
  extension_code,
  automation_code,
  CASE
    WHEN awareness_code IN ('ja_goed', 'vaag') THEN awareness_code
    ELSE 'nee'
  END,
  skill_code,
  'controle_handmatig',
  now()
FROM mock_runs
ON CONFLICT (survey_run_id) DO UPDATE SET
  department_code = EXCLUDED.department_code,
  ai_frequency_code = EXCLUDED.ai_frequency_code,
  data_awareness_code = EXCLUDED.data_awareness_code,
  anonymization_behavior_code = EXCLUDED.anonymization_behavior_code,
  browser_extension_usage_code = EXCLUDED.browser_extension_usage_code,
  automation_usage_code = EXCLUDED.automation_usage_code,
  ai_policy_awareness_code = EXCLUDED.ai_policy_awareness_code,
  ai_skill_level_code = EXCLUDED.ai_skill_level_code,
  processing_output_code = EXCLUDED.processing_output_code,
  updated_at = now();

WITH mock_runs (
  run_id,
  tool_id,
  use_case_id,
  risk_tool_id,
  tool_code,
  tool_name,
  policy_status,
  department_code,
  frequency_code,
  awareness_code,
  anonymization_code,
  extension_code,
  automation_code,
  skill_code,
  account_code,
  use_case_code,
  context_code,
  data_type_code,
  support_need_code,
  started_offset,
  completed_offset,
  consent_ambassador,
  shadow_score,
  exposure_score,
  priority_score,
  score_tier,
  review_class,
  trigger_codes,
  review_reason
) AS (
  VALUES
    ('00000000-0000-0000-0000-00000000a001'::uuid, '00000000-0000-0000-0000-00000000b001'::uuid, '00000000-0000-0000-0000-00000000c001'::uuid, '00000000-0000-0000-0000-00000000d001'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'marketing_communicatie', 'daily', 'vaag', 'soms', 'ja_bewust', 'alleen_chatbot', 'gemiddeld', 'prive_betaald', 'teksten_schrijven', null, 'internal_emails', 'clear_policy', 10, 9, true, 42, 47, 51, 'high', 'priority_review', ARRAY['personal_paid_account','internal_emails']::text[], 'personal_account'),
    ('00000000-0000-0000-0000-00000000a002'::uuid, '00000000-0000-0000-0000-00000000b002'::uuid, '00000000-0000-0000-0000-00000000c002'::uuid, '00000000-0000-0000-0000-00000000d002'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'sales_account', 'weekly', 'nee', 'nooit', 'nee', 'alleen_chatbot', 'beginner', 'personal_free', 'samenvatten_redigeren', null, 'customer_data', 'training', 9, 8, false, 45, 52, 56, 'high', 'priority_review', ARRAY['personal_free_account','customer_data']::text[], 'customer_data'),
    ('00000000-0000-0000-0000-00000000a003'::uuid, '00000000-0000-0000-0000-00000000b003'::uuid, '00000000-0000-0000-0000-00000000c003'::uuid, '00000000-0000-0000-0000-00000000d003'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'operations', 'weekly', 'vaag', 'soms', 'weet_niet', 'alleen_chatbot', 'gemiddeld', 'business_license', 'informatie_opzoeken', null, 'public_information', 'inspiration_examples', 8, 7, false, 18, 22, 24, 'low', 'standard', ARRAY[]::text[], null),
    ('00000000-0000-0000-0000-00000000a004'::uuid, '00000000-0000-0000-0000-00000000b004'::uuid, '00000000-0000-0000-0000-00000000c004'::uuid, '00000000-0000-0000-0000-00000000d004'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'hr_recruitment', 'daily', 'nee_niet_verdiept', 'nooit', 'ja_onzeker', 'alleen_chatbot', 'beginner', 'both', 'brainstormen', null, 'names', 'clear_policy', 7, 6, true, 48, 58, 62, 'high', 'priority_review', ARRAY['personal_account','names','browser_extension']::text[], 'personal_account'),
    ('00000000-0000-0000-0000-00000000a005'::uuid, '00000000-0000-0000-0000-00000000b005'::uuid, '00000000-0000-0000-0000-00000000c005'::uuid, '00000000-0000-0000-0000-00000000d005'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'finance_legal', 'monthly', 'ja_goed', 'altijd', 'nee', 'alleen_chatbot', 'gevorderd', 'business_license', 'vertalen', null, 'legal_documents', 'technical_advice', 6, 5, false, 16, 38, 41, 'elevated', 'priority_review', ARRAY['legal_documents']::text[], 'legal_data'),
    ('00000000-0000-0000-0000-00000000a006'::uuid, '00000000-0000-0000-0000-00000000b006'::uuid, '00000000-0000-0000-0000-00000000c006'::uuid, '00000000-0000-0000-0000-00000000d006'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'vaag', 'soms', 'ja_bewust', 'alleen_chatbot', 'gevorderd', 'business_license', 'code_schrijven', 'intern_gebruik', 'source_code_logic', 'technical_advice', 5, 4, false, 28, 55, 58, 'high', 'priority_review', ARRAY['source_code_logic','restricted_tool']::text[], 'restricted_tool'),
    ('00000000-0000-0000-0000-00000000a007'::uuid, '00000000-0000-0000-0000-00000000b007'::uuid, '00000000-0000-0000-0000-00000000c007'::uuid, '00000000-0000-0000-0000-00000000d007'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'nee', 'nooit', 'ja_onzeker', 'gekoppeld_apps', 'gemiddeld', 'both', 'code_schrijven', 'klantgerichte_toepassing', 'source_code_logic', 'clear_policy', 5, 4, true, 55, 68, 72, 'high', 'priority_review', ARRAY['restricted_tool','customer_facing_software','agentic_usage']::text[], 'restricted_tool'),
    ('00000000-0000-0000-0000-00000000a008'::uuid, '00000000-0000-0000-0000-00000000b008'::uuid, '00000000-0000-0000-0000-00000000c008'::uuid, '00000000-0000-0000-0000-00000000d008'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'weekly', 'vaag', 'soms', 'nee', 'alleen_chatbot', 'gevorderd', 'business_license', 'code_schrijven', 'beslisondersteuning', 'source_code_logic', 'technical_advice', 4, 3, false, 48, 61, 65, 'high', 'priority_review', ARRAY['restricted_tool','decision_support']::text[], 'decision_support'),
    ('00000000-0000-0000-0000-00000000a009'::uuid, '00000000-0000-0000-0000-00000000b009'::uuid, '00000000-0000-0000-0000-00000000c009'::uuid, '00000000-0000-0000-0000-00000000d009'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'nee_niet_verdiept', 'nooit', 'ja_bewust', 'weet_niet_zeker', 'gemiddeld', 'personal_paid', 'code_schrijven', 'kritieke_systemen', 'source_code_logic', 'training', 3, 2, false, 62, 82, 88, 'critical', 'priority_review', ARRAY['restricted_tool','critical_systems','personal_paid_account']::text[], 'critical_systems'),
    ('00000000-0000-0000-0000-00000000a010'::uuid, '00000000-0000-0000-0000-00000000b010'::uuid, '00000000-0000-0000-0000-00000000c010'::uuid, '00000000-0000-0000-0000-00000000d010'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'ja_goed', 'soms', 'nee', 'alleen_chatbot', 'expert', 'business_license', 'code_schrijven', 'financieel_juridisch', 'source_code_logic', 'technical_advice', 3, 2, false, 44, 57, 60, 'high', 'priority_review', ARRAY['restricted_tool','financial_legal_context']::text[], 'financial_legal_context'),
    ('00000000-0000-0000-0000-00000000a011'::uuid, '00000000-0000-0000-0000-00000000b011'::uuid, '00000000-0000-0000-0000-00000000c011'::uuid, '00000000-0000-0000-0000-00000000d011'::uuid, 'n8n', 'n8n', 'newly_discovered', 'operations', 'weekly', 'vaag', 'soms', 'nee', 'gekoppeld_apps', 'gemiddeld', 'business_license', 'automatisering', null, 'internal_documents', 'practice_together', 2, 1, false, 34, 58, 61, 'high', 'priority_review', ARRAY['newly_discovered_tool','automation']::text[], 'newly_discovered_tool'),
    ('00000000-0000-0000-0000-00000000a012'::uuid, '00000000-0000-0000-0000-00000000b012'::uuid, '00000000-0000-0000-0000-00000000c012'::uuid, '00000000-0000-0000-0000-00000000d012'::uuid, 'n8n', 'n8n', 'newly_discovered', 'sales_account', 'daily', 'nee', 'nooit', 'weet_niet', 'agents_reeks_taken', 'beginner', 'personal_free', 'workflow_uitvoeren', null, 'customer_data', 'clear_policy', 2, 1, false, 58, 75, 81, 'critical', 'priority_review', ARRAY['newly_discovered_tool','agentic_usage','customer_data']::text[], 'agentic_usage'),
    ('00000000-0000-0000-0000-00000000a013'::uuid, '00000000-0000-0000-0000-00000000b013'::uuid, '00000000-0000-0000-0000-00000000c013'::uuid, '00000000-0000-0000-0000-00000000d013'::uuid, 'n8n', 'n8n', 'newly_discovered', 'finance_legal', 'weekly', 'vaag', 'soms', 'nee', 'gekoppeld_apps', 'gemiddeld', 'both', 'data_analyseren', null, 'financial_data', 'technical_advice', 1, 0, false, 52, 66, 70, 'high', 'priority_review', ARRAY['newly_discovered_tool','financial_data']::text[], 'financial_data')
)
INSERT INTO public.survey_data_type (survey_run_id, data_type_code)
SELECT run_id, data_type_code
FROM mock_runs
ON CONFLICT (survey_run_id, data_type_code) DO NOTHING;

WITH mock_runs AS (
  SELECT *
  FROM (VALUES
    ('00000000-0000-0000-0000-00000000a001'::uuid, 'clear_policy'),
    ('00000000-0000-0000-0000-00000000a002'::uuid, 'training'),
    ('00000000-0000-0000-0000-00000000a003'::uuid, 'inspiration_examples'),
    ('00000000-0000-0000-0000-00000000a004'::uuid, 'clear_policy'),
    ('00000000-0000-0000-0000-00000000a005'::uuid, 'technical_advice'),
    ('00000000-0000-0000-0000-00000000a006'::uuid, 'technical_advice'),
    ('00000000-0000-0000-0000-00000000a007'::uuid, 'clear_policy'),
    ('00000000-0000-0000-0000-00000000a008'::uuid, 'technical_advice'),
    ('00000000-0000-0000-0000-00000000a009'::uuid, 'training'),
    ('00000000-0000-0000-0000-00000000a010'::uuid, 'technical_advice'),
    ('00000000-0000-0000-0000-00000000a011'::uuid, 'practice_together'),
    ('00000000-0000-0000-0000-00000000a012'::uuid, 'clear_policy'),
    ('00000000-0000-0000-0000-00000000a013'::uuid, 'technical_advice')
  ) AS rows(run_id, support_need_code)
)
INSERT INTO public.survey_support_need (survey_run_id, support_need_code)
SELECT run_id, support_need_code
FROM mock_runs
ON CONFLICT (survey_run_id, support_need_code) DO NOTHING;

WITH mock_runs (
  run_id,
  tool_id,
  use_case_id,
  risk_tool_id,
  tool_code,
  tool_name,
  policy_status,
  department_code,
  frequency_code,
  awareness_code,
  anonymization_code,
  extension_code,
  automation_code,
  skill_code,
  account_code,
  use_case_code,
  context_code,
  data_type_code,
  support_need_code,
  started_offset,
  completed_offset,
  consent_ambassador,
  shadow_score,
  exposure_score,
  priority_score,
  score_tier,
  review_class,
  trigger_codes,
  review_reason
) AS (
  VALUES
    ('00000000-0000-0000-0000-00000000a001'::uuid, '00000000-0000-0000-0000-00000000b001'::uuid, '00000000-0000-0000-0000-00000000c001'::uuid, '00000000-0000-0000-0000-00000000d001'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'marketing_communicatie', 'daily', 'vaag', 'soms', 'ja_bewust', 'alleen_chatbot', 'gemiddeld', 'prive_betaald', 'teksten_schrijven', null, 'internal_emails', 'clear_policy', 10, 9, true, 42, 47, 51, 'high', 'priority_review', ARRAY['personal_paid_account','internal_emails']::text[], 'personal_account'),
    ('00000000-0000-0000-0000-00000000a002'::uuid, '00000000-0000-0000-0000-00000000b002'::uuid, '00000000-0000-0000-0000-00000000c002'::uuid, '00000000-0000-0000-0000-00000000d002'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'sales_account', 'weekly', 'nee', 'nooit', 'nee', 'alleen_chatbot', 'beginner', 'personal_free', 'samenvatten_redigeren', null, 'customer_data', 'training', 9, 8, false, 45, 52, 56, 'high', 'priority_review', ARRAY['personal_free_account','customer_data']::text[], 'customer_data'),
    ('00000000-0000-0000-0000-00000000a003'::uuid, '00000000-0000-0000-0000-00000000b003'::uuid, '00000000-0000-0000-0000-00000000c003'::uuid, '00000000-0000-0000-0000-00000000d003'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'operations', 'weekly', 'vaag', 'soms', 'weet_niet', 'alleen_chatbot', 'gemiddeld', 'business_license', 'informatie_opzoeken', null, 'public_information', 'inspiration_examples', 8, 7, false, 18, 22, 24, 'low', 'standard', ARRAY[]::text[], null),
    ('00000000-0000-0000-0000-00000000a004'::uuid, '00000000-0000-0000-0000-00000000b004'::uuid, '00000000-0000-0000-0000-00000000c004'::uuid, '00000000-0000-0000-0000-00000000d004'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'hr_recruitment', 'daily', 'nee_niet_verdiept', 'nooit', 'ja_onzeker', 'alleen_chatbot', 'beginner', 'both', 'brainstormen', null, 'names', 'clear_policy', 7, 6, true, 48, 58, 62, 'high', 'priority_review', ARRAY['personal_account','names','browser_extension']::text[], 'personal_account'),
    ('00000000-0000-0000-0000-00000000a005'::uuid, '00000000-0000-0000-0000-00000000b005'::uuid, '00000000-0000-0000-0000-00000000c005'::uuid, '00000000-0000-0000-0000-00000000d005'::uuid, 'chatgpt', 'ChatGPT', 'under_review', 'finance_legal', 'monthly', 'ja_goed', 'altijd', 'nee', 'alleen_chatbot', 'gevorderd', 'business_license', 'vertalen', null, 'legal_documents', 'technical_advice', 6, 5, false, 16, 38, 41, 'elevated', 'priority_review', ARRAY['legal_documents']::text[], 'legal_data'),
    ('00000000-0000-0000-0000-00000000a006'::uuid, '00000000-0000-0000-0000-00000000b006'::uuid, '00000000-0000-0000-0000-00000000c006'::uuid, '00000000-0000-0000-0000-00000000d006'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'vaag', 'soms', 'ja_bewust', 'alleen_chatbot', 'gevorderd', 'business_license', 'code_schrijven', 'intern_gebruik', 'source_code_logic', 'technical_advice', 5, 4, false, 28, 55, 58, 'high', 'priority_review', ARRAY['source_code_logic','restricted_tool']::text[], 'restricted_tool'),
    ('00000000-0000-0000-0000-00000000a007'::uuid, '00000000-0000-0000-0000-00000000b007'::uuid, '00000000-0000-0000-0000-00000000c007'::uuid, '00000000-0000-0000-0000-00000000d007'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'nee', 'nooit', 'ja_onzeker', 'gekoppeld_apps', 'gemiddeld', 'both', 'code_schrijven', 'klantgerichte_toepassing', 'source_code_logic', 'clear_policy', 5, 4, true, 55, 68, 72, 'high', 'priority_review', ARRAY['restricted_tool','customer_facing_software','agentic_usage']::text[], 'restricted_tool'),
    ('00000000-0000-0000-0000-00000000a008'::uuid, '00000000-0000-0000-0000-00000000b008'::uuid, '00000000-0000-0000-0000-00000000c008'::uuid, '00000000-0000-0000-0000-00000000d008'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'weekly', 'vaag', 'soms', 'nee', 'alleen_chatbot', 'gevorderd', 'business_license', 'code_schrijven', 'beslisondersteuning', 'source_code_logic', 'technical_advice', 4, 3, false, 48, 61, 65, 'high', 'priority_review', ARRAY['restricted_tool','decision_support']::text[], 'decision_support'),
    ('00000000-0000-0000-0000-00000000a009'::uuid, '00000000-0000-0000-0000-00000000b009'::uuid, '00000000-0000-0000-0000-00000000c009'::uuid, '00000000-0000-0000-0000-00000000d009'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'nee_niet_verdiept', 'nooit', 'ja_bewust', 'weet_niet_zeker', 'gemiddeld', 'personal_paid', 'code_schrijven', 'kritieke_systemen', 'source_code_logic', 'training', 3, 2, false, 62, 82, 88, 'critical', 'priority_review', ARRAY['restricted_tool','critical_systems','personal_paid_account']::text[], 'critical_systems'),
    ('00000000-0000-0000-0000-00000000a010'::uuid, '00000000-0000-0000-0000-00000000b010'::uuid, '00000000-0000-0000-0000-00000000c010'::uuid, '00000000-0000-0000-0000-00000000d010'::uuid, 'github_copilot', 'GitHub Copilot', 'restricted', 'it_data_development', 'daily', 'ja_goed', 'soms', 'nee', 'alleen_chatbot', 'expert', 'business_license', 'code_schrijven', 'financieel_juridisch', 'source_code_logic', 'technical_advice', 3, 2, false, 44, 57, 60, 'high', 'priority_review', ARRAY['restricted_tool','financial_legal_context']::text[], 'financial_legal_context'),
    ('00000000-0000-0000-0000-00000000a011'::uuid, '00000000-0000-0000-0000-00000000b011'::uuid, '00000000-0000-0000-0000-00000000c011'::uuid, '00000000-0000-0000-0000-00000000d011'::uuid, 'n8n', 'n8n', 'newly_discovered', 'operations', 'weekly', 'vaag', 'soms', 'nee', 'gekoppeld_apps', 'gemiddeld', 'business_license', 'automatisering', null, 'internal_documents', 'practice_together', 2, 1, false, 34, 58, 61, 'high', 'priority_review', ARRAY['newly_discovered_tool','automation']::text[], 'newly_discovered_tool'),
    ('00000000-0000-0000-0000-00000000a012'::uuid, '00000000-0000-0000-0000-00000000b012'::uuid, '00000000-0000-0000-0000-00000000c012'::uuid, '00000000-0000-0000-0000-00000000d012'::uuid, 'n8n', 'n8n', 'newly_discovered', 'sales_account', 'daily', 'nee', 'nooit', 'weet_niet', 'agents_reeks_taken', 'beginner', 'personal_free', 'workflow_uitvoeren', null, 'customer_data', 'clear_policy', 2, 1, false, 58, 75, 81, 'critical', 'priority_review', ARRAY['newly_discovered_tool','agentic_usage','customer_data']::text[], 'agentic_usage'),
    ('00000000-0000-0000-0000-00000000a013'::uuid, '00000000-0000-0000-0000-00000000b013'::uuid, '00000000-0000-0000-0000-00000000c013'::uuid, '00000000-0000-0000-0000-00000000d013'::uuid, 'n8n', 'n8n', 'newly_discovered', 'finance_legal', 'weekly', 'vaag', 'soms', 'nee', 'gekoppeld_apps', 'gemiddeld', 'both', 'data_analyseren', null, 'financial_data', 'technical_advice', 1, 0, false, 52, 66, 70, 'high', 'priority_review', ARRAY['newly_discovered_tool','financial_data']::text[], 'financial_data')
)
INSERT INTO public.survey_tool (
  id,
  survey_run_id,
  tool_code,
  tool_name,
  is_custom,
  catalog_beheerstatus_code,
  org_policy_status_code_snapshot,
  eu_ai_act_flag_code_snapshot,
  policy_snapshot_id,
  created_at
)
SELECT
  tool_id,
  run_id,
  tool_code,
  tool_name,
  false,
  'under_review',
  policy_status,
  'none',
  snapshot.id,
  now()
FROM mock_runs
LEFT JOIN public.org_tool_policy_snapshot snapshot
  ON snapshot.org_id = '00000000-0000-0000-0000-000000000101'
 AND snapshot.tool_code = mock_runs.tool_code
 AND snapshot.org_policy_status_code = mock_runs.policy_status
ON CONFLICT (id) DO UPDATE SET
  tool_name = EXCLUDED.tool_name,
  org_policy_status_code_snapshot = EXCLUDED.org_policy_status_code_snapshot,
  eu_ai_act_flag_code_snapshot = EXCLUDED.eu_ai_act_flag_code_snapshot,
  policy_snapshot_id = EXCLUDED.policy_snapshot_id;

-- The remaining inserts are derived from the fixed tool/use-case/risk rows.
INSERT INTO public.survey_tool_account (survey_tool_id, account_type_code)
VALUES
  ('00000000-0000-0000-0000-00000000b001', 'prive_betaald'),
  ('00000000-0000-0000-0000-00000000b002', 'personal_free'),
  ('00000000-0000-0000-0000-00000000b003', 'business_license'),
  ('00000000-0000-0000-0000-00000000b004', 'both'),
  ('00000000-0000-0000-0000-00000000b005', 'business_license'),
  ('00000000-0000-0000-0000-00000000b006', 'business_license'),
  ('00000000-0000-0000-0000-00000000b007', 'both'),
  ('00000000-0000-0000-0000-00000000b008', 'business_license'),
  ('00000000-0000-0000-0000-00000000b009', 'personal_paid'),
  ('00000000-0000-0000-0000-00000000b010', 'business_license'),
  ('00000000-0000-0000-0000-00000000b011', 'business_license'),
  ('00000000-0000-0000-0000-00000000b012', 'personal_free'),
  ('00000000-0000-0000-0000-00000000b013', 'both')
ON CONFLICT (survey_tool_id) DO UPDATE SET
  account_type_code = EXCLUDED.account_type_code;

INSERT INTO public.survey_tool_use_case (id, survey_tool_id, use_case_code)
VALUES
  ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000b001', 'teksten_schrijven'),
  ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-00000000b002', 'samenvatten_redigeren'),
  ('00000000-0000-0000-0000-00000000c003', '00000000-0000-0000-0000-00000000b003', 'informatie_opzoeken'),
  ('00000000-0000-0000-0000-00000000c004', '00000000-0000-0000-0000-00000000b004', 'brainstormen'),
  ('00000000-0000-0000-0000-00000000c005', '00000000-0000-0000-0000-00000000b005', 'vertalen'),
  ('00000000-0000-0000-0000-00000000c006', '00000000-0000-0000-0000-00000000b006', 'code_schrijven'),
  ('00000000-0000-0000-0000-00000000c007', '00000000-0000-0000-0000-00000000b007', 'code_schrijven'),
  ('00000000-0000-0000-0000-00000000c008', '00000000-0000-0000-0000-00000000b008', 'code_schrijven'),
  ('00000000-0000-0000-0000-00000000c009', '00000000-0000-0000-0000-00000000b009', 'code_schrijven'),
  ('00000000-0000-0000-0000-00000000c010', '00000000-0000-0000-0000-00000000b010', 'code_schrijven'),
  ('00000000-0000-0000-0000-00000000c011', '00000000-0000-0000-0000-00000000b011', 'automatisering'),
  ('00000000-0000-0000-0000-00000000c012', '00000000-0000-0000-0000-00000000b012', 'workflow_uitvoeren'),
  ('00000000-0000-0000-0000-00000000c013', '00000000-0000-0000-0000-00000000b013', 'data_analyseren')
ON CONFLICT (id) DO UPDATE SET
  survey_tool_id = EXCLUDED.survey_tool_id,
  use_case_code = EXCLUDED.use_case_code;

INSERT INTO public.survey_tool_use_case_context (survey_tool_use_case_id, context_code)
VALUES
  ('00000000-0000-0000-0000-00000000c006', 'intern_gebruik'),
  ('00000000-0000-0000-0000-00000000c007', 'klantgerichte_toepassing'),
  ('00000000-0000-0000-0000-00000000c008', 'beslisondersteuning'),
  ('00000000-0000-0000-0000-00000000c009', 'kritieke_systemen'),
  ('00000000-0000-0000-0000-00000000c010', 'financieel_juridisch')
ON CONFLICT (survey_tool_use_case_id, context_code) DO NOTHING;

INSERT INTO public.risk_result (
  survey_run_id,
  org_id,
  scoring_config_id,
  engine_version,
  person_score,
  highest_priority_score,
  priority_score_raw,
  score_tier,
  review_class,
  review_threshold,
  min_cell_size,
  dpo_review_required,
  review_trigger_codes,
  scored_at,
  score_breakdown
)
SELECT
  run_id,
  '00000000-0000-0000-0000-000000000101',
  config.id,
  'V8.1-dashboard-mock',
  priority_score,
  priority_score,
  priority_score,
  score_tier,
  review_class,
  40,
  config.dashboard_min_cell_size,
  review_class <> 'standard',
  trigger_codes,
  now(),
  jsonb_build_object('source', 'dashboard_mock_seed', 'tool_code', tool_code)
FROM (
  VALUES
    ('00000000-0000-0000-0000-00000000a001'::uuid, 'chatgpt', 51, 'high', 'priority_review', ARRAY['personal_paid_account','internal_emails']::text[]),
    ('00000000-0000-0000-0000-00000000a002'::uuid, 'chatgpt', 56, 'high', 'priority_review', ARRAY['personal_free_account','customer_data']::text[]),
    ('00000000-0000-0000-0000-00000000a003'::uuid, 'chatgpt', 24, 'low', 'standard', ARRAY[]::text[]),
    ('00000000-0000-0000-0000-00000000a004'::uuid, 'chatgpt', 62, 'high', 'priority_review', ARRAY['personal_account','names','browser_extension']::text[]),
    ('00000000-0000-0000-0000-00000000a005'::uuid, 'chatgpt', 41, 'elevated', 'priority_review', ARRAY['legal_documents']::text[]),
    ('00000000-0000-0000-0000-00000000a006'::uuid, 'github_copilot', 58, 'high', 'priority_review', ARRAY['source_code_logic','restricted_tool']::text[]),
    ('00000000-0000-0000-0000-00000000a007'::uuid, 'github_copilot', 72, 'high', 'priority_review', ARRAY['restricted_tool','customer_facing_software','agentic_usage']::text[]),
    ('00000000-0000-0000-0000-00000000a008'::uuid, 'github_copilot', 65, 'high', 'priority_review', ARRAY['restricted_tool','decision_support']::text[]),
    ('00000000-0000-0000-0000-00000000a009'::uuid, 'github_copilot', 88, 'critical', 'priority_review', ARRAY['restricted_tool','critical_systems','personal_paid_account']::text[]),
    ('00000000-0000-0000-0000-00000000a010'::uuid, 'github_copilot', 60, 'high', 'priority_review', ARRAY['restricted_tool','financial_legal_context']::text[]),
    ('00000000-0000-0000-0000-00000000a011'::uuid, 'n8n', 61, 'high', 'priority_review', ARRAY['newly_discovered_tool','automation']::text[]),
    ('00000000-0000-0000-0000-00000000a012'::uuid, 'n8n', 81, 'critical', 'priority_review', ARRAY['newly_discovered_tool','agentic_usage','customer_data']::text[]),
    ('00000000-0000-0000-0000-00000000a013'::uuid, 'n8n', 70, 'high', 'priority_review', ARRAY['newly_discovered_tool','financial_data']::text[])
) AS rows(run_id, tool_code, priority_score, score_tier, review_class, trigger_codes)
CROSS JOIN LATERAL (
  SELECT id, dashboard_min_cell_size
  FROM public.scan_scoring_config
  WHERE org_id = '00000000-0000-0000-0000-000000000101'
    AND is_active = true
  ORDER BY effective_from DESC
  LIMIT 1
) config
ON CONFLICT (survey_run_id) DO UPDATE SET
  person_score = EXCLUDED.person_score,
  highest_priority_score = EXCLUDED.highest_priority_score,
  priority_score_raw = EXCLUDED.priority_score_raw,
  score_tier = EXCLUDED.score_tier,
  review_class = EXCLUDED.review_class,
  dpo_review_required = EXCLUDED.dpo_review_required,
  review_trigger_codes = EXCLUDED.review_trigger_codes,
  scored_at = now(),
  score_breakdown = EXCLUDED.score_breakdown;

INSERT INTO public.risk_result_tool (
  id,
  survey_run_id,
  survey_tool_id,
  org_id,
  scoring_config_id,
  policy_snapshot_id,
  shadow_score,
  exposure_score,
  raw_exposure_score,
  priority_score,
  priority_score_raw,
  score_tier_tool,
  trigger_codes,
  score_breakdown,
  scored_at
)
SELECT
  row_data.risk_tool_id,
  row_data.run_id,
  row_data.tool_id,
  '00000000-0000-0000-0000-000000000101',
  config.id,
  snapshot.id,
  row_data.shadow_score,
  row_data.exposure_score,
  row_data.exposure_score,
  row_data.priority_score,
  row_data.priority_score,
  row_data.score_tier,
  row_data.trigger_codes,
  jsonb_build_object('source', 'dashboard_mock_seed', 'tool_code', row_data.tool_code),
  now()
FROM (
  VALUES
    ('00000000-0000-0000-0000-00000000a001'::uuid, '00000000-0000-0000-0000-00000000b001'::uuid, '00000000-0000-0000-0000-00000000d001'::uuid, 'chatgpt', 'under_review', 42, 47, 51, 'high', ARRAY['personal_paid_account','internal_emails']::text[]),
    ('00000000-0000-0000-0000-00000000a002'::uuid, '00000000-0000-0000-0000-00000000b002'::uuid, '00000000-0000-0000-0000-00000000d002'::uuid, 'chatgpt', 'under_review', 45, 52, 56, 'high', ARRAY['personal_free_account','customer_data']::text[]),
    ('00000000-0000-0000-0000-00000000a003'::uuid, '00000000-0000-0000-0000-00000000b003'::uuid, '00000000-0000-0000-0000-00000000d003'::uuid, 'chatgpt', 'under_review', 18, 22, 24, 'low', ARRAY[]::text[]),
    ('00000000-0000-0000-0000-00000000a004'::uuid, '00000000-0000-0000-0000-00000000b004'::uuid, '00000000-0000-0000-0000-00000000d004'::uuid, 'chatgpt', 'under_review', 48, 58, 62, 'high', ARRAY['personal_account','names','browser_extension']::text[]),
    ('00000000-0000-0000-0000-00000000a005'::uuid, '00000000-0000-0000-0000-00000000b005'::uuid, '00000000-0000-0000-0000-00000000d005'::uuid, 'chatgpt', 'under_review', 16, 38, 41, 'elevated', ARRAY['legal_documents']::text[]),
    ('00000000-0000-0000-0000-00000000a006'::uuid, '00000000-0000-0000-0000-00000000b006'::uuid, '00000000-0000-0000-0000-00000000d006'::uuid, 'github_copilot', 'restricted', 28, 55, 58, 'high', ARRAY['source_code_logic','restricted_tool']::text[]),
    ('00000000-0000-0000-0000-00000000a007'::uuid, '00000000-0000-0000-0000-00000000b007'::uuid, '00000000-0000-0000-0000-00000000d007'::uuid, 'github_copilot', 'restricted', 55, 68, 72, 'high', ARRAY['restricted_tool','customer_facing_software','agentic_usage']::text[]),
    ('00000000-0000-0000-0000-00000000a008'::uuid, '00000000-0000-0000-0000-00000000b008'::uuid, '00000000-0000-0000-0000-00000000d008'::uuid, 'github_copilot', 'restricted', 48, 61, 65, 'high', ARRAY['restricted_tool','decision_support']::text[]),
    ('00000000-0000-0000-0000-00000000a009'::uuid, '00000000-0000-0000-0000-00000000b009'::uuid, '00000000-0000-0000-0000-00000000d009'::uuid, 'github_copilot', 'restricted', 62, 82, 88, 'critical', ARRAY['restricted_tool','critical_systems','personal_paid_account']::text[]),
    ('00000000-0000-0000-0000-00000000a010'::uuid, '00000000-0000-0000-0000-00000000b010'::uuid, '00000000-0000-0000-0000-00000000d010'::uuid, 'github_copilot', 'restricted', 44, 57, 60, 'high', ARRAY['restricted_tool','financial_legal_context']::text[]),
    ('00000000-0000-0000-0000-00000000a011'::uuid, '00000000-0000-0000-0000-00000000b011'::uuid, '00000000-0000-0000-0000-00000000d011'::uuid, 'n8n', 'newly_discovered', 34, 58, 61, 'high', ARRAY['newly_discovered_tool','automation']::text[]),
    ('00000000-0000-0000-0000-00000000a012'::uuid, '00000000-0000-0000-0000-00000000b012'::uuid, '00000000-0000-0000-0000-00000000d012'::uuid, 'n8n', 'newly_discovered', 58, 75, 81, 'critical', ARRAY['newly_discovered_tool','agentic_usage','customer_data']::text[]),
    ('00000000-0000-0000-0000-00000000a013'::uuid, '00000000-0000-0000-0000-00000000b013'::uuid, '00000000-0000-0000-0000-00000000d013'::uuid, 'n8n', 'newly_discovered', 52, 66, 70, 'high', ARRAY['newly_discovered_tool','financial_data']::text[])
) AS row_data(run_id, tool_id, risk_tool_id, tool_code, policy_status, shadow_score, exposure_score, priority_score, score_tier, trigger_codes)
CROSS JOIN LATERAL (
  SELECT id
  FROM public.scan_scoring_config
  WHERE org_id = '00000000-0000-0000-0000-000000000101'
    AND is_active = true
  ORDER BY effective_from DESC
  LIMIT 1
) config
LEFT JOIN public.org_tool_policy_snapshot snapshot
  ON snapshot.org_id = '00000000-0000-0000-0000-000000000101'
 AND snapshot.tool_code = row_data.tool_code
 AND snapshot.org_policy_status_code = row_data.policy_status
ON CONFLICT (survey_run_id, survey_tool_id) DO UPDATE SET
  shadow_score = EXCLUDED.shadow_score,
  exposure_score = EXCLUDED.exposure_score,
  raw_exposure_score = EXCLUDED.raw_exposure_score,
  priority_score = EXCLUDED.priority_score,
  priority_score_raw = EXCLUDED.priority_score_raw,
  score_tier_tool = EXCLUDED.score_tier_tool,
  trigger_codes = EXCLUDED.trigger_codes,
  score_breakdown = EXCLUDED.score_breakdown,
  scored_at = now();

INSERT INTO public.dpo_review_items (
  org_id,
  survey_run_id,
  survey_tool_id,
  scoring_config_id,
  policy_snapshot_id,
  reason_code,
  review_class,
  trigger_codes,
  priority_score,
  status,
  created_at,
  updated_at
)
SELECT
  '00000000-0000-0000-0000-000000000101',
  risk.survey_run_id,
  risk.survey_tool_id,
  risk.scoring_config_id,
  risk.policy_snapshot_id,
  reason.reason_code,
  CASE WHEN risk.score_tier_tool = 'critical' THEN 'priority_review' ELSE 'priority_review' END,
  risk.trigger_codes,
  risk.priority_score,
  CASE WHEN risk.priority_score >= 75 THEN 'in_review' ELSE 'open' END,
  now(),
  now()
FROM public.risk_result_tool risk
JOIN (
  VALUES
    ('00000000-0000-0000-0000-00000000a001'::uuid, 'personal_account'),
    ('00000000-0000-0000-0000-00000000a002'::uuid, 'customer_data'),
    ('00000000-0000-0000-0000-00000000a004'::uuid, 'personal_account'),
    ('00000000-0000-0000-0000-00000000a005'::uuid, 'legal_data'),
    ('00000000-0000-0000-0000-00000000a006'::uuid, 'restricted_tool'),
    ('00000000-0000-0000-0000-00000000a007'::uuid, 'restricted_tool'),
    ('00000000-0000-0000-0000-00000000a008'::uuid, 'decision_support'),
    ('00000000-0000-0000-0000-00000000a009'::uuid, 'critical_systems'),
    ('00000000-0000-0000-0000-00000000a010'::uuid, 'financial_legal_context'),
    ('00000000-0000-0000-0000-00000000a011'::uuid, 'newly_discovered_tool'),
    ('00000000-0000-0000-0000-00000000a012'::uuid, 'agentic_usage'),
    ('00000000-0000-0000-0000-00000000a013'::uuid, 'financial_data')
) AS reason(survey_run_id, reason_code)
  ON reason.survey_run_id = risk.survey_run_id
ON CONFLICT (survey_run_id, reason_code) DO UPDATE SET
  survey_tool_id = EXCLUDED.survey_tool_id,
  trigger_codes = EXCLUDED.trigger_codes,
  priority_score = EXCLUDED.priority_score,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO public.audit_events (
  org_id,
  event_type,
  actor_kind,
  subject_table,
  subject_id,
  payload,
  created_at
)
SELECT
  '00000000-0000-0000-0000-000000000101',
  'score.calculated',
  'system',
  'risk_result',
  survey_run_id::text,
  jsonb_build_object('source', 'dashboard_mock_seed'),
  now()
FROM public.risk_result
WHERE org_id = '00000000-0000-0000-0000-000000000101'
  AND score_breakdown->>'source' = 'dashboard_mock_seed'
  AND NOT EXISTS (
    SELECT 1
    FROM public.audit_events existing
    WHERE existing.org_id = '00000000-0000-0000-0000-000000000101'
      AND existing.event_type = 'score.calculated'
      AND existing.subject_table = 'risk_result'
      AND existing.subject_id = risk_result.survey_run_id::text
      AND existing.payload->>'source' = 'dashboard_mock_seed'
  );

-- Optional report-export row: only created when a DPO/admin test user exists.
INSERT INTO public.report_exports (
  org_id,
  wave_id,
  export_type,
  filters,
  file_size_bytes,
  row_count,
  scoring_config_id,
  view_or_query_version,
  trigger_codes_used,
  min_cell_size,
  k_anonymity_applied,
  suppressed_cell_count,
  export_status,
  created_by,
  created_at,
  expires_at,
  retention_until
)
SELECT
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000201',
  'dpo_dashboard_mock_pdf',
  '{"source":"dashboard_mock_seed"}'::jsonb,
  184320,
  13,
  config.id,
  'dashboard-v8.1',
  ARRAY['restricted_tool','agentic_usage','customer_data']::text[],
  config.dashboard_min_cell_size,
  config.dashboard_min_cell_size,
  2,
  'completed',
  role_row.user_id,
  now(),
  now() + interval '14 days',
  now() + interval '90 days'
FROM public.user_roles role_row
CROSS JOIN LATERAL (
  SELECT id, dashboard_min_cell_size
  FROM public.scan_scoring_config
  WHERE org_id = '00000000-0000-0000-0000-000000000101'
    AND is_active = true
  ORDER BY effective_from DESC
  LIMIT 1
) config
WHERE role_row.org_id = '00000000-0000-0000-0000-000000000101'
  AND role_row.role IN ('dpo', 'org_admin', 'super_admin')
  AND NOT EXISTS (
    SELECT 1
    FROM public.report_exports existing
    WHERE existing.org_id = '00000000-0000-0000-0000-000000000101'
      AND existing.export_type = 'dpo_dashboard_mock_pdf'
      AND existing.filters->>'source' = 'dashboard_mock_seed'
      AND existing.deleted_at IS NULL
  )
ORDER BY role_row.created_at
LIMIT 1;

SELECT
  'dashboard_mock_seed_ready' AS status,
  '00000000-0000-0000-0000-000000000101'::uuid AS org_id,
  count(*) FILTER (
    WHERE source = 'dashboard_mock_seed'
  ) AS seeded_runs
FROM public.survey_run
WHERE org_id = '00000000-0000-0000-0000-000000000101';
