-- =============================================================================
-- LOCAL/STAGING ONLY — do NOT run against a production Supabase project.
-- =============================================================================
-- SAI Synthetic Pilot Organisatie — org/wave/tool-policy fixture.
--
-- See docs/sai-synthetic-pilot-organisatie.md for the full population design
-- and docs/sai-synthetic-flow-testplan.md for the scenarios that consume the
-- tool codes seeded here.
--
-- Why this is a SQL fixture and not an RPC call:
--   There is no respondent-facing RPC for creating an organization, a scan
--   wave, a tools_library row, or an org_tool_policy row — those are
--   admin/DPO configuration surfaces (see supabase/migrations/20260504120000_
--   rls_policies_v2_1.sql sections 3 and 4), reachable only through an
--   authenticated org_admin/dpo session or direct SQL. The actual survey
--   result tables (survey_run, survey_profile, survey_tool, ...,
--   risk_result, dpo_review_items, audit_events) are intentionally NOT
--   touched here — those are filled exclusively by
--   apps/sai/scripts/synthetic-flow via the real respondent RPC flow.
--
-- Idempotent: safe to re-run.
-- =============================================================================

DO $$
BEGIN
  IF COALESCE(current_setting('app.environment', true), '') NOT IN ('local', 'staging') THEN
    RAISE EXCEPTION
      'Refusing to load SAI synthetic pilot fixture without app.environment=local or staging';
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Organization + active scan wave
-- -----------------------------------------------------------------------------

INSERT INTO public.organizations (id, name, plan_type)
VALUES (
  '00000000-0000-0000-0000-000000000301',
  'SAI Synthetic Pilot Organisatie',
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
  '00000000-0000-0000-0000-000000000302',
  '00000000-0000-0000-0000-000000000301',
  'Synthetic pilot wave',
  now() - interval '1 day',
  now() + interval '90 days',
  'active',
  digest('sai-synthetic-pilot-wave-token', 'sha256')
)
ON CONFLICT (id) DO UPDATE SET
  org_id = EXCLUDED.org_id,
  name = EXCLUDED.name,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  status = EXCLUDED.status,
  wave_token_hash = EXCLUDED.wave_token_hash,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- Explicit, lower dashboard_min_cell_size scoring config for this org.
-- -----------------------------------------------------------------------------
-- Keeps the default thresholds (40/50/50) but pins dashboard_min_cell_size to
-- the documented default of 5 explicitly, so the small-cluster scenarios in
-- the testplan (directie_management=3, anders=2) are provably below it
-- regardless of any platform-level default change.

INSERT INTO public.scan_scoring_config (
  org_id,
  scoring_config_key,
  methodology_version,
  config_json,
  dashboard_min_cell_size,
  is_active
)
VALUES (
  '00000000-0000-0000-0000-000000000301',
  'sai-v8.1-synthetic-pilot',
  'v8.1',
  jsonb_build_object(
    'priority_review_threshold', 40,
    'toxic_shadow_threshold', 50,
    'toxic_exposure_threshold', 50
  ),
  5,
  true
)
ON CONFLICT (org_id) WHERE is_active = true DO NOTHING;

-- -----------------------------------------------------------------------------
-- Tools used by the testplan scenarios
-- -----------------------------------------------------------------------------
-- tools_library is platform-global; ON CONFLICT keeps this idempotent even if
-- another org's fixture already created the same tool_code.

INSERT INTO public.tools_library (
  tool_code,
  name,
  vendor,
  category,
  default_eu_ai_act_flag_code
)
VALUES
  ('ms_copilot_365', 'Microsoft 365 Copilot', 'Microsoft', 'assistant', 'none'),
  ('chatgpt_enterprise', 'ChatGPT Enterprise', 'OpenAI', 'LLM', 'none'),
  ('zapier_ai_agents', 'Zapier AI Agents', 'Zapier', 'automation', 'potential_high_risk'),
  ('hr_people_analytics', 'HR People Analytics Suite', 'Generic HR Vendor', 'analytics', 'potential_high_risk'),
  ('shadow_agent_x', 'Shadow Agent X (fictional)', 'Unverified vendor', 'agentic_automation', 'potential_article5_issue')
ON CONFLICT (tool_code) DO UPDATE SET
  name = EXCLUDED.name,
  vendor = EXCLUDED.vendor,
  category = EXCLUDED.category,
  default_eu_ai_act_flag_code = EXCLUDED.default_eu_ai_act_flag_code,
  updated_at = now();

-- Org-specific policy status. This is what calculate_v8_score reads (via the
-- policy snapshot taken at save_tool time) to compute shadow_score.
INSERT INTO public.org_tool_policy (
  org_id,
  tool_code,
  org_policy_status_code,
  eu_ai_act_flag_code,
  notes
)
VALUES
  ('00000000-0000-0000-0000-000000000301', 'ms_copilot_365', 'approved', 'none',
   'Scenario 2 / filler — approved productivity assistant, low risk.'),
  ('00000000-0000-0000-0000-000000000301', 'chatgpt_enterprise', 'approved', 'none',
   'Scenario 3 — approved tool, tests special-category data boost independent of shadow score.'),
  ('00000000-0000-0000-0000-000000000301', 'zapier_ai_agents', 'approved', 'potential_high_risk',
   'Scenario 6 — approved automation platform, tests agentic exposure boost independent of shadow score.'),
  ('00000000-0000-0000-0000-000000000301', 'hr_people_analytics', 'approved', 'potential_high_risk',
   'Scenario 7 — approved tool, tests hr_evaluation_context trigger independent of shadow score.'),
  ('00000000-0000-0000-0000-000000000301', 'shadow_agent_x', 'prohibited', 'potential_article5_issue',
   'Scenario 5 — prohibited agentic tool, tests toxic_shadow review_class end to end.')
ON CONFLICT (org_id, tool_code) DO UPDATE SET
  org_policy_status_code = EXCLUDED.org_policy_status_code,
  eu_ai_act_flag_code = EXCLUDED.eu_ai_act_flag_code,
  notes = EXCLUDED.notes,
  updated_at = now();

SELECT
  'sai-synthetic-pilot-wave-token' AS wave_token,
  '00000000-0000-0000-0000-000000000301'::uuid AS org_id,
  '00000000-0000-0000-0000-000000000302'::uuid AS wave_id;
