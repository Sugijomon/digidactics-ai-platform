-- =============================================================================
-- Shadow AI Scan V8.1 - smoke-test seed data
-- =============================================================================
-- Run after migrations and before smoke-tests.
--
-- This file creates deterministic test data only. It is intended for local or
-- staging validation, not production.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Stable test organization and active scan wave.
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

INSERT INTO public.scan_wave (
  id,
  org_id,
  name,
  starts_at,
  ends_at,
  status,
  wave_token_hash
)
VALUES (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000101',
  'Smoke test wave',
  now() - interval '1 day',
  now() + interval '7 days',
  'active',
  digest('sai-smoke-wave-token', 'sha256')
)
ON CONFLICT (id) DO UPDATE SET
  org_id = EXCLUDED.org_id,
  name = EXCLUDED.name,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  status = EXCLUDED.status,
  wave_token_hash = EXCLUDED.wave_token_hash,
  updated_at = now();

-- Minimum reference data for the RPC smoke-test.
INSERT INTO public.ref_department (code, label_nl, sort_order)
VALUES ('it_data_development', 'IT, data en development', 10)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl;

INSERT INTO public.ref_ai_frequency (code, label_nl, weight, sort_order)
VALUES ('weekly', 'Wekelijks', 10, 20)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, weight = EXCLUDED.weight;

INSERT INTO public.ref_data_type (
  code,
  label_nl,
  is_special_category,
  is_business_confidential,
  exposure_weight,
  sort_order
)
VALUES ('customer_data', 'Klantgegevens', false, true, 20, 20)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  is_special_category = EXCLUDED.is_special_category,
  is_business_confidential = EXCLUDED.is_business_confidential,
  exposure_weight = EXCLUDED.exposure_weight;

INSERT INTO public.ref_use_case (
  code,
  label_nl,
  ai_act_archetype,
  trigger_codes,
  sort_order
)
VALUES ('drafting', 'Teksten en concepten maken', 'productivity', '{}', 10)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  ai_act_archetype = EXCLUDED.ai_act_archetype,
  trigger_codes = EXCLUDED.trigger_codes;

INSERT INTO public.ref_context (
  code,
  label_nl,
  exposure_weight,
  shadow_weight,
  trigger_codes,
  sort_order
)
VALUES ('internal_work', 'Intern werk', 5, 0, '{}', 10)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  exposure_weight = EXCLUDED.exposure_weight,
  shadow_weight = EXCLUDED.shadow_weight,
  trigger_codes = EXCLUDED.trigger_codes;

INSERT INTO public.ref_account_type (
  code,
  label_nl,
  is_personal,
  shadow_weight,
  sort_order
)
VALUES ('personal_free', 'Persoonlijk gratis account', true, 20, 30)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  is_personal = EXCLUDED.is_personal,
  shadow_weight = EXCLUDED.shadow_weight;

INSERT INTO public.ref_top_concern (code, label_nl, sort_order)
VALUES ('privacy', 'Privacy en persoonsgegevens', 10)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl;

INSERT INTO public.ref_support_need (code, label_nl, sort_order)
VALUES ('clear_policy', 'Duidelijk beleid', 10)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl;

INSERT INTO public.ref_preference_reason (code, label_nl, sort_order)
VALUES ('ease_of_use', 'Gebruiksgemak', 10)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl;

INSERT INTO public.ref_catalog_beheerstatus (code, label_nl, sort_order)
VALUES ('newly_discovered', 'Nieuw ontdekt', 10)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl;

INSERT INTO public.ref_org_policy_status (code, label_nl, sort_order)
VALUES
  ('approved', 'Toegestaan', 10),
  ('newly_discovered', 'Nieuw ontdekt', 20),
  ('under_review', 'In review', 30),
  ('restricted', 'Beperkt toegestaan', 40),
  ('prohibited', 'Verboden', 50)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl;

INSERT INTO public.ref_eu_ai_act_flag (code, label_nl, sort_order)
VALUES ('none', 'Geen flag', 10)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl;

INSERT INTO public.tools_library (
  tool_code,
  name,
  vendor,
  category,
  default_eu_ai_act_flag_code
)
VALUES (
  'chatgpt',
  'ChatGPT',
  'OpenAI',
  'LLM',
  'none'
)
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
VALUES (
  '00000000-0000-0000-0000-000000000101',
  'chatgpt',
  'restricted',
  'none',
  'Smoke-test policy'
)
ON CONFLICT (org_id, tool_code) DO UPDATE SET
  org_policy_status_code = EXCLUDED.org_policy_status_code,
  eu_ai_act_flag_code = EXCLUDED.eu_ai_act_flag_code,
  notes = EXCLUDED.notes,
  updated_at = now();

SELECT
  'sai-smoke-wave-token' AS wave_token,
  '00000000-0000-0000-0000-000000000101'::uuid AS org_id,
  '00000000-0000-0000-0000-000000000201'::uuid AS wave_id;
