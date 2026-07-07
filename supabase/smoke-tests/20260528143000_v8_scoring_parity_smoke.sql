-- =============================================================================
-- Shadow AI Scan V8.1 - scoring parity smoke test
-- =============================================================================
-- Verifies the critical V8.1 exposure repair:
--   raw_exposure =
--     use_case_base * context_multiplier * account_multiplier
--     + data_boost
--     + frequency_boost
--     + automation_boost
--     + extension_boost
--     + agentic_boost
--
-- psql-friendly usage:
--   psql "<db-url>" -v ON_ERROR_STOP=1 -f supabase/smoke-tests/20260528143000_v8_scoring_parity_smoke.sql
--
-- The test runs inside a transaction and rolls back its fixture rows.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_org_id constant uuid := '00000000-0000-0000-0000-000000000101'::uuid;
  v_wave_id uuid;
  v_run_id uuid := gen_random_uuid();
  v_tool_id uuid;
  v_use_case_id uuid;
  v_result jsonb;
  v_tool_result public.risk_result_tool%ROWTYPE;
  v_run_result public.risk_result%ROWTYPE;
BEGIN
  SELECT id
    INTO v_wave_id
    FROM public.scan_wave
   WHERE org_id = v_org_id
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_wave_id IS NULL THEN
    INSERT INTO public.scan_wave (org_id, name, status)
    VALUES (v_org_id, 'V8 scoring parity smoke wave', 'active')
    RETURNING id INTO v_wave_id;
  END IF;

  INSERT INTO public.survey_run (id, org_id, wave_id, completed_at)
  VALUES (v_run_id, v_org_id, v_wave_id, now());

  INSERT INTO public.survey_profile (
    survey_run_id,
    ai_frequency_code,
    automation_usage_code,
    browser_extension_usage_code
  )
  VALUES (
    v_run_id,
    'never',
    'agents_reeks_taken',
    'nee'
  );

  INSERT INTO public.survey_data_type (survey_run_id, data_type_code)
  VALUES (v_run_id, 'public_information');

  INSERT INTO public.survey_tool (
    survey_run_id,
    tool_code,
    tool_name,
    is_custom,
    org_policy_status_code_snapshot,
    eu_ai_act_flag_code_snapshot
  )
  VALUES (
    v_run_id,
    NULL,
    'V8 Scoring Smoke Tool',
    true,
    'newly_discovered',
    'none'
  )
  RETURNING id INTO v_tool_id;

  INSERT INTO public.survey_tool_use_case (survey_tool_id, use_case_code)
  VALUES (v_tool_id, 'code_schrijven')
  RETURNING id INTO v_use_case_id;

  INSERT INTO public.survey_tool_use_case_context (
    survey_tool_use_case_id,
    context_code
  )
  VALUES (v_use_case_id, 'kritieke_systemen');

  INSERT INTO public.survey_tool_account (survey_tool_id, account_type_code)
  VALUES (v_tool_id, 'personal_free');

  v_result := public.calculate_v8_score(v_run_id);

  SELECT *
    INTO v_tool_result
    FROM public.risk_result_tool
   WHERE survey_tool_id = v_tool_id;

  IF v_tool_result.survey_tool_id IS NULL THEN
    RAISE EXCEPTION 'Expected risk_result_tool row for smoke tool';
  END IF;

  IF v_tool_result.score_breakdown->>'engine_version' IS DISTINCT FROM 'sai-v8.1-sql-2026-05-22' THEN
    RAISE EXCEPTION 'Unexpected engine_version in score_breakdown: %', v_tool_result.score_breakdown;
  END IF;

  IF (v_tool_result.score_breakdown->>'use_context_score')::numeric <> 45 THEN
    RAISE EXCEPTION 'Expected use_context_score 45, got %', v_tool_result.score_breakdown->>'use_context_score';
  END IF;

  IF (v_tool_result.score_breakdown->>'account_multiplier')::numeric <> 1.35 THEN
    RAISE EXCEPTION 'Expected account_multiplier 1.35, got %', v_tool_result.score_breakdown->>'account_multiplier';
  END IF;

  IF (v_tool_result.score_breakdown->>'automation_boost')::numeric <> 15 THEN
    RAISE EXCEPTION 'Expected automation_boost 15, got %', v_tool_result.score_breakdown->>'automation_boost';
  END IF;

  IF (v_tool_result.score_breakdown->>'agentic_boost')::numeric <> 15 THEN
    RAISE EXCEPTION 'Expected agentic_boost 15, got %', v_tool_result.score_breakdown->>'agentic_boost';
  END IF;

  IF v_tool_result.raw_exposure_score <> 90.75 THEN
    RAISE EXCEPTION 'Expected raw_exposure_score 90.75, got %', v_tool_result.raw_exposure_score;
  END IF;

  IF v_tool_result.exposure_score <> 91 THEN
    RAISE EXCEPTION 'Expected whole exposure_score 91, got %', v_tool_result.exposure_score;
  END IF;

  IF v_tool_result.priority_score_raw <> 49.95 THEN
    RAISE EXCEPTION 'Expected priority_score_raw 49.95, got %', v_tool_result.priority_score_raw;
  END IF;

  IF v_tool_result.priority_score <> 50 THEN
    RAISE EXCEPTION 'Expected whole priority_score 50, got %', v_tool_result.priority_score;
  END IF;

  IF NOT ('agentic_usage' = ANY(v_tool_result.trigger_codes)) THEN
    RAISE EXCEPTION 'Expected agentic_usage trigger, got %', v_tool_result.trigger_codes;
  END IF;

  IF NOT ('automation_unmanaged' = ANY(v_tool_result.trigger_codes)) THEN
    RAISE EXCEPTION 'Expected automation_unmanaged trigger, got %', v_tool_result.trigger_codes;
  END IF;

  IF NOT ('priority_threshold' = ANY(v_tool_result.trigger_codes)) THEN
    RAISE EXCEPTION 'Expected priority_threshold trigger, got %', v_tool_result.trigger_codes;
  END IF;

  SELECT *
    INTO v_run_result
    FROM public.risk_result
   WHERE survey_run_id = v_run_id;

  IF v_run_result.person_score <> 50 THEN
    RAISE EXCEPTION 'Expected person_score 50, got %', v_run_result.person_score;
  END IF;

  IF v_run_result.review_class <> 'priority_review' THEN
    RAISE EXCEPTION 'Expected review_class priority_review, got %', v_run_result.review_class;
  END IF;

  RAISE NOTICE 'V8 scoring parity smoke passed: %', v_result;
END $$;

ROLLBACK;

-- =============================================================================
-- End smoke test
-- =============================================================================
