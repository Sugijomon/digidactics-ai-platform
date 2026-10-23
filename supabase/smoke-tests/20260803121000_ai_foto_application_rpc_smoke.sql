-- =============================================================================
-- AI-Foto scan variant - application-level RPC/schema smoke test
-- =============================================================================
-- Verifies that AI-Foto can reuse the existing SAI respondent RPC baseline and
-- save a concrete application layer without changing SAI V8.1 scoring.
--
-- psql-friendly usage:
--   psql "<db-url>" -v ON_ERROR_STOP=1 \
--     -f supabase/smoke-tests/20260803121000_ai_foto_application_rpc_smoke.sql
--
-- The test runs inside a transaction and rolls back its fixture rows.
-- =============================================================================

\set wave_token 'ai-foto-smoke-wave-token'
\set bad_token 'definitely-wrong-token'

BEGIN;

\echo '0. create local AI-Foto smoke fixtures'
INSERT INTO public.organizations (id, name, plan_type)
VALUES (
  '00000000-0000-0000-0000-000000000301',
  'AI-Foto Smoke Test Organisatie',
  'shadow_only'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  plan_type = EXCLUDED.plan_type,
  updated_at = now();

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

INSERT INTO public.ref_support_need (code, label_nl, sort_order)
VALUES ('clear_policy', 'Duidelijk beleid', 10)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl;

INSERT INTO public.ref_catalog_beheerstatus (code, label_nl, sort_order)
VALUES ('newly_discovered', 'Nieuw ontdekt', 10)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl;

INSERT INTO public.ref_org_policy_status (code, label_nl, sort_order)
VALUES ('newly_discovered', 'Nieuw ontdekt', 20)
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
  '00000000-0000-0000-0000-000000000302',
  '00000000-0000-0000-0000-000000000301',
  'AI-Foto smoke test wave',
  now() - interval '1 day',
  now() + interval '7 days',
  'active',
  digest(:'wave_token', 'sha256'),
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

\echo '1. anon can start an AI-Foto run and save baseline SAI tool/use-case'
SET LOCAL ROLE anon;
SELECT * FROM public.start_survey_run(:'wave_token') \gset

SELECT public.save_tool(
  :'run_id'::uuid,
  :'submission_token',
  jsonb_build_object(
    'tool_code', 'chatgpt',
    'tool_name', 'ChatGPT',
    'is_custom', false,
    'catalog_beheerstatus_code', 'newly_discovered'
  )
) AS survey_tool_id \gset

SELECT public.save_tool_use_case(
  :'run_id'::uuid,
  :'submission_token',
  :'survey_tool_id'::uuid,
  'drafting'
) AS survey_tool_use_case_id \gset

\echo '2. anon can save the AI-Foto concrete application layer through RPC'
SELECT public.save_survey_application(
  :'run_id'::uuid,
  :'submission_token',
  jsonb_build_object(
    'survey_tool_id', :'survey_tool_id',
    'survey_tool_use_case_id', :'survey_tool_use_case_id',
    'depth_rank', 'primary',
    'task_description_limited', 'Concepttekst voor klantmail maken en laten controleren.',
    'application_frequency_code', 'weekly',
    'account_environment_code', 'business_license',
    'output_destination_code', 'customer_public_communication',
    'output_control_code', 'full_manual_check',
    'deviation_authority_code', 'always',
    'people_impact_code', 'customers_or_clients',
    'transparency_code', 'sometimes',
    'beneficiary_code', 'team',
    'net_effect_code', 'somewhat_positive',
    'control_rework_code', 'normal',
    'shareability_code', 'yes_same_task',
    'escalation_route_awareness_code', 'partial',
    'data_type_codes', jsonb_build_array('customer_data'),
    'value_type_codes', jsonb_build_array('time_saving', 'first_quality'),
    'condition_need_codes', jsonb_build_array('clear_data_rules', 'better_output_control'),
    'near_miss_signal_codes', jsonb_build_array('none'),
    'support_need_codes', jsonb_build_array('clear_policy'),
    'skill_responses', jsonb_build_array(
      jsonb_build_object(
        'skill_domain_code', 'data_use',
        'skill_response_code', 'preferred_action'
      ),
      jsonb_build_object(
        'skill_domain_code', 'output_check',
        'skill_response_code', 'preferred_action'
      )
    )
  )
) AS survey_application_id \gset

\echo '3. final verification as elevated SQL runner'
RESET ROLE;
SELECT set_config('sai.ai_foto_run_id', :'run_id', true);
SELECT set_config('sai.ai_foto_application_id', :'survey_application_id', true);
SELECT set_config('sai.ai_foto_tool_id', :'survey_tool_id', true);
SELECT set_config('sai.ai_foto_bad_token', :'bad_token', true);

DO $$
DECLARE
  v_run_id uuid := current_setting('sai.ai_foto_run_id')::uuid;
  v_application_id uuid := current_setting('sai.ai_foto_application_id')::uuid;
  v_tool_id uuid := current_setting('sai.ai_foto_tool_id')::uuid;
  v_bad_token text := current_setting('sai.ai_foto_bad_token');
BEGIN
  IF NOT has_function_privilege(
    'anon',
    'public.save_survey_application(uuid, text, jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon should execute save_survey_application(uuid, text, jsonb)';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.risk_result
     WHERE survey_run_id = v_run_id
  ) THEN
    RAISE EXCEPTION 'AI-Foto application save must not create SAI risk_result rows';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.survey_run
     WHERE id = v_run_id
       AND product_code_snapshot = 'ai_foto'
       AND method_version_snapshot = 'ai-foto-scan-v1'
  ) THEN
    RAISE EXCEPTION 'AI-Foto run did not snapshot product/method from scan_wave';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.survey_application
     WHERE id = v_application_id
       AND survey_run_id = v_run_id
       AND depth_rank = 'primary'
       AND output_destination_code = 'customer_public_communication'
       AND net_effect_code = 'somewhat_positive'
  ) THEN
    RAISE EXCEPTION 'Expected saved survey_application row';
  END IF;

  IF (
    SELECT count(*)
      FROM public.survey_application_value_type
     WHERE survey_application_id = v_application_id
  ) <> 2 THEN
    RAISE EXCEPTION 'Expected 2 value signals for AI-Foto application';
  END IF;

  IF (
    SELECT count(*)
      FROM public.survey_application_skill_response
     WHERE survey_application_id = v_application_id
  ) <> 2 THEN
    RAISE EXCEPTION 'Expected 2 skill responses for AI-Foto application';
  END IF;

  BEGIN
    PERFORM public.save_survey_application(
      v_run_id,
      v_bad_token,
      jsonb_build_object(
        'survey_tool_id', v_tool_id,
        'depth_rank', 'secondary'
      )
    );
    RAISE EXCEPTION 'AI-Foto application RPC accepted an invalid token';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM IS DISTINCT FROM 'invalid_token_or_run_closed' THEN
        RAISE;
      END IF;
  END;
END $$;

\echo 'AI-Foto application RPC smoke passed'

ROLLBACK;

-- =============================================================================
-- End smoke test
-- =============================================================================
