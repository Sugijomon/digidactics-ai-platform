-- =============================================================================
-- Shadow AI Scan V8.1 - RPC/RLS smoke tests
-- =============================================================================
-- Run after:
--   1. all migrations
--   2. supabase/seed/20260504141000_sai_smoke_seed.sql
--
-- psql-friendly usage:
--   psql "<db-url>" -v ON_ERROR_STOP=1 -f supabase/smoke-tests/20260504140000_sai_rpc_smoke_tests.sql
--
-- The script uses psql variables via \gset. In the Supabase SQL editor, run the
-- sections one by one and copy returned values manually.
-- =============================================================================

\set wave_token 'sai-smoke-wave-token'
\set bad_token 'definitely-wrong-token'
\set department_code 'it_data_development'
\set ai_frequency_code 'weekly'
\set data_type_code 'customer_data'
\set concern_code 'privacy'
\set support_need_code 'clear_policy'
\set preference_reason_code 'ease_of_use'
\set use_case_code 'drafting'
\set context_code 'internal_work'
\set account_type_code 'personal_free'


-- -----------------------------------------------------------------------------
-- 1. Direct anon table writes should fail
-- -----------------------------------------------------------------------------

\echo '1a. anon direct survey_run insert should fail'
\set ON_ERROR_STOP off
BEGIN;
SET LOCAL ROLE anon;
INSERT INTO public.survey_run (org_id)
VALUES ('00000000-0000-0000-0000-000000000101');
ROLLBACK;
\set ON_ERROR_STOP on

\echo '1b. anon direct survey_tool insert should fail'
\set ON_ERROR_STOP off
BEGIN;
SET LOCAL ROLE anon;
INSERT INTO public.survey_tool (survey_run_id, tool_name)
VALUES (gen_random_uuid(), 'Direct write should fail');
ROLLBACK;
\set ON_ERROR_STOP on


-- -----------------------------------------------------------------------------
-- 2. Valid token flow should create and write a run
-- -----------------------------------------------------------------------------

\echo '2a. start_survey_run should return run_id and submission_token'
BEGIN;
SET LOCAL ROLE anon;
SELECT * FROM public.start_survey_run(:'wave_token');
ROLLBACK;

BEGIN;
SET LOCAL ROLE anon;
SELECT * FROM public.start_survey_run(:'wave_token') \gset
COMMIT;

\echo '2b. save_profile should succeed'
BEGIN;
SET LOCAL ROLE anon;
SELECT public.save_profile(
  :'run_id'::uuid,
  :'submission_token',
  jsonb_build_object(
    'department_code', :'department_code',
    'ai_frequency_code', :'ai_frequency_code'
  )
);
COMMIT;

\echo '2c. multi-choice saves should succeed'
BEGIN;
SET LOCAL ROLE anon;
SELECT public.save_data_types(
  :'run_id'::uuid,
  :'submission_token',
  jsonb_build_array(:'data_type_code')
);
SELECT public.save_concerns(
  :'run_id'::uuid,
  :'submission_token',
  jsonb_build_array(:'concern_code')
);
SELECT public.save_support_needs(
  :'run_id'::uuid,
  :'submission_token',
  jsonb_build_array(:'support_need_code')
);
SELECT public.save_tool_preference_reasons(
  :'run_id'::uuid,
  :'submission_token',
  jsonb_build_array(:'preference_reason_code')
);
COMMIT;

\echo '2d. save_tool should return survey_tool_id'
BEGIN;
SET LOCAL ROLE anon;
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
COMMIT;

\echo '2e. save_tool_use_case should return survey_tool_use_case_id'
BEGIN;
SET LOCAL ROLE anon;
SELECT public.save_tool_use_case(
  :'run_id'::uuid,
  :'submission_token',
  :'survey_tool_id'::uuid,
  :'use_case_code'
) AS survey_tool_use_case_id \gset
COMMIT;

\echo '2f. context/account/discovery saves should succeed'
BEGIN;
SET LOCAL ROLE anon;
SELECT public.save_tool_use_case_context(
  :'run_id'::uuid,
  :'submission_token',
  :'survey_tool_use_case_id'::uuid,
  jsonb_build_array(:'context_code')
);
SELECT public.save_tool_account(
  :'run_id'::uuid,
  :'submission_token',
  :'survey_tool_id'::uuid,
  :'account_type_code'
);
SELECT public.register_tool_discovery(
  :'run_id'::uuid,
  :'submission_token',
  :'survey_tool_id'::uuid,
  'Smoke test custom tool'
) AS discovery_id \gset
COMMIT;


-- -----------------------------------------------------------------------------
-- 3. Invalid token should fail
-- -----------------------------------------------------------------------------

\echo '3. invalid token should fail'
\set ON_ERROR_STOP off
BEGIN;
SET LOCAL ROLE anon;
SELECT public.save_data_types(
  :'run_id'::uuid,
  :'bad_token',
  jsonb_build_array(:'data_type_code')
);
ROLLBACK;
\set ON_ERROR_STOP on


-- -----------------------------------------------------------------------------
-- 4. Completion should burn the token
-- -----------------------------------------------------------------------------

\echo '4a. complete_survey_run should succeed'
BEGIN;
SET LOCAL ROLE anon;
SELECT public.complete_survey_run(:'run_id'::uuid, :'submission_token');
COMMIT;

\echo '4b. old token should fail after completion'
\set ON_ERROR_STOP off
BEGIN;
SET LOCAL ROLE anon;
SELECT public.save_data_types(
  :'run_id'::uuid,
  :'submission_token',
  jsonb_build_array(:'data_type_code')
);
ROLLBACK;
\set ON_ERROR_STOP on


-- -----------------------------------------------------------------------------
-- 5. Direct scoring call must remain blocked for anon
-- -----------------------------------------------------------------------------

\echo '5. direct calculate_v8_score should fail for anon'
\set ON_ERROR_STOP off
BEGIN;
SET LOCAL ROLE anon;
SELECT public.calculate_v8_score(:'run_id'::uuid);
ROLLBACK;
\set ON_ERROR_STOP on


-- -----------------------------------------------------------------------------
-- 6. Final verification as elevated SQL runner
-- -----------------------------------------------------------------------------

\echo '6. final verification'
SELECT
  sr.id AS run_id,
  sr.completed_at IS NOT NULL AS completed,
  sr.submission_token_hash IS NULL AS token_burned,
  COUNT(DISTINCT st.id) AS tools,
  COUNT(DISTINCT tcd.id) AS discovery_items
FROM public.survey_run sr
LEFT JOIN public.survey_tool st ON st.survey_run_id = sr.id
LEFT JOIN public.tool_catalog_discovery tcd ON tcd.survey_run_id = sr.id
WHERE sr.id = :'run_id'::uuid
GROUP BY sr.id, sr.completed_at, sr.submission_token_hash;

-- Expected:
--   completed = true
--   token_burned = true
--   tools = 1
--   discovery_items = 1

-- =============================================================================
-- End smoke tests
-- =============================================================================
