-- =============================================================================
-- Shadow AI Scan V8.1 - Edge/RPC write layer
-- =============================================================================
-- Depends on:
--   20260504110000_v8_1_target_schema.sql
--   20260504120000_rls_policies_v2_1.sql
--
-- Purpose:
--   An anonymous respondent never writes directly to survey tables. The client
--   receives (run_id, submission_token) from start_survey_run(...) and then
--   calls these SECURITY DEFINER RPCs. Each RPC validates the token, derives
--   org_id/run context server-side, and writes only to the intended run.
--
-- Frontend contract:
--   All save_* functions accept p_run_id uuid, p_token text, and either a jsonb
--   payload or jsonb array. They are granted to anon and authenticated.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Shared guards
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.assert_survey_token(p_run_id uuid, p_token text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF NOT public.survey_run_token_valid(p_run_id, p_token) THEN
    RAISE EXCEPTION 'invalid_token_or_run_closed';
  END IF;

  SELECT org_id
    INTO v_org_id
    FROM public.survey_run
   WHERE id = p_run_id
     AND completed_at IS NULL;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'survey_run_not_found_or_closed';
  END IF;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_survey_token(uuid, text) FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION public.assert_survey_tool_for_run(
  p_survey_tool_id uuid,
  p_run_id uuid
) RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM public.survey_tool
     WHERE id = p_survey_tool_id
       AND survey_run_id = p_run_id
  ) THEN
    RAISE EXCEPTION 'survey_tool_not_found_for_run';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_survey_tool_for_run(uuid, uuid) FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION public.ensure_policy_snapshot_for_tool(
  p_org_id uuid,
  p_tool_code text
) RETURNS TABLE (
  policy_snapshot_id uuid,
  org_policy_status_code text,
  eu_ai_act_flag_code text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_policy public.org_tool_policy%ROWTYPE;
  v_status text;
  v_flag text;
  v_notes text;
  v_source_policy_id uuid;
  v_hash text;
  v_snapshot_id uuid;
BEGIN
  IF p_tool_code IS NULL OR length(trim(p_tool_code)) = 0 THEN
    RETURN QUERY SELECT NULL::uuid, 'newly_discovered'::text, 'none'::text;
    RETURN;
  END IF;

  SELECT *
    INTO v_policy
    FROM public.org_tool_policy
   WHERE org_id = p_org_id
     AND tool_code = p_tool_code
   LIMIT 1;

  v_status := COALESCE(v_policy.org_policy_status_code, 'newly_discovered');
  v_flag := COALESCE(v_policy.eu_ai_act_flag_code, 'none');
  v_notes := v_policy.notes;
  v_source_policy_id := v_policy.id;
  v_hash := encode(
    digest(
      concat_ws('|', p_tool_code, v_status, v_flag, COALESCE(v_notes, '')),
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.org_tool_policy_snapshot (
    org_id,
    tool_code,
    org_policy_status_code,
    eu_ai_act_flag_code,
    notes,
    content_hash,
    source_policy_id
  )
  VALUES (
    p_org_id,
    p_tool_code,
    v_status,
    v_flag,
    v_notes,
    v_hash,
    v_source_policy_id
  )
  ON CONFLICT (org_id, tool_code, content_hash)
  DO NOTHING
  RETURNING id INTO v_snapshot_id;

  IF v_snapshot_id IS NULL THEN
    SELECT id
      INTO v_snapshot_id
      FROM public.org_tool_policy_snapshot
     WHERE org_id = p_org_id
       AND tool_code = p_tool_code
       AND content_hash = v_hash
     LIMIT 1;
  END IF;

  RETURN QUERY SELECT v_snapshot_id, v_status, v_flag;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_policy_snapshot_for_tool(uuid, text) FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION public.jsonb_text_array(p_payload jsonb)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(value), ARRAY[]::text[])
    FROM jsonb_array_elements_text(COALESCE(p_payload, '[]'::jsonb)) AS value;
$$;

REVOKE ALL ON FUNCTION public.jsonb_text_array(jsonb) FROM PUBLIC;


-- -----------------------------------------------------------------------------
-- Profile and multi-choice saves
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.save_profile(
  p_run_id uuid,
  p_token text,
  p_payload jsonb
) RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_survey_token(p_run_id, p_token);

  INSERT INTO public.survey_profile (
    survey_run_id,
    department_code,
    department_other_text,
    ai_frequency_code,
    no_ai_reason_code,
    data_awareness_code,
    anonymization_behavior_code,
    browser_extension_usage_code,
    automation_usage_code,
    ai_policy_awareness_code,
    ai_skill_level_code,
    processing_output_code,
    top_concern_other_text,
    future_usecases_text,
    updated_at
  )
  VALUES (
    p_run_id,
    NULLIF(p_payload->>'department_code', ''),
    NULLIF(p_payload->>'department_other_text', ''),
    NULLIF(p_payload->>'ai_frequency_code', ''),
    NULLIF(p_payload->>'no_ai_reason_code', ''),
    NULLIF(p_payload->>'data_awareness_code', ''),
    NULLIF(p_payload->>'anonymization_behavior_code', ''),
    NULLIF(p_payload->>'browser_extension_usage_code', ''),
    NULLIF(p_payload->>'automation_usage_code', ''),
    NULLIF(p_payload->>'ai_policy_awareness_code', ''),
    NULLIF(p_payload->>'ai_skill_level_code', ''),
    NULLIF(p_payload->>'processing_output_code', ''),
    NULLIF(p_payload->>'top_concern_other_text', ''),
    NULLIF(p_payload->>'future_usecases_text', ''),
    now()
  )
  ON CONFLICT (survey_run_id) DO UPDATE SET
    department_code = EXCLUDED.department_code,
    department_other_text = EXCLUDED.department_other_text,
    ai_frequency_code = EXCLUDED.ai_frequency_code,
    no_ai_reason_code = EXCLUDED.no_ai_reason_code,
    data_awareness_code = EXCLUDED.data_awareness_code,
    anonymization_behavior_code = EXCLUDED.anonymization_behavior_code,
    browser_extension_usage_code = EXCLUDED.browser_extension_usage_code,
    automation_usage_code = EXCLUDED.automation_usage_code,
    ai_policy_awareness_code = EXCLUDED.ai_policy_awareness_code,
    ai_skill_level_code = EXCLUDED.ai_skill_level_code,
    processing_output_code = EXCLUDED.processing_output_code,
    top_concern_other_text = EXCLUDED.top_concern_other_text,
    future_usecases_text = EXCLUDED.future_usecases_text,
    updated_at = now();
END;
$$;


CREATE OR REPLACE FUNCTION public.save_motivations(
  p_run_id uuid,
  p_token text,
  p_items jsonb
) RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_code text;
BEGIN
  PERFORM public.assert_survey_token(p_run_id, p_token);

  DELETE FROM public.survey_motivation WHERE survey_run_id = p_run_id;

  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    v_code := CASE
      WHEN jsonb_typeof(item) = 'string' THEN item #>> '{}'
      ELSE item->>'code'
    END;
    IF v_code IS NOT NULL AND length(trim(v_code)) > 0 THEN
      INSERT INTO public.survey_motivation (
        survey_run_id,
        motivation_code,
        motivation_other_text
      )
      VALUES (
        p_run_id,
        v_code,
        NULLIF(item->>'other_text', '')
      )
      ON CONFLICT (survey_run_id, motivation_code) DO UPDATE SET
        motivation_other_text = EXCLUDED.motivation_other_text;
    END IF;
  END LOOP;
END;
$$;


CREATE OR REPLACE FUNCTION public.save_data_types(
  p_run_id uuid,
  p_token text,
  p_codes jsonb
) RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  PERFORM public.assert_survey_token(p_run_id, p_token);

  DELETE FROM public.survey_data_type WHERE survey_run_id = p_run_id;

  FOR v_code IN SELECT unnest(public.jsonb_text_array(p_codes))
  LOOP
    IF length(trim(v_code)) > 0 THEN
      INSERT INTO public.survey_data_type (survey_run_id, data_type_code)
      VALUES (p_run_id, v_code)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;


CREATE OR REPLACE FUNCTION public.save_concerns(
  p_run_id uuid,
  p_token text,
  p_codes jsonb
) RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  PERFORM public.assert_survey_token(p_run_id, p_token);

  DELETE FROM public.survey_top_concern WHERE survey_run_id = p_run_id;

  FOR v_code IN SELECT unnest(public.jsonb_text_array(p_codes))
  LOOP
    IF length(trim(v_code)) > 0 THEN
      INSERT INTO public.survey_top_concern (survey_run_id, top_concern_code)
      VALUES (p_run_id, v_code)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;


CREATE OR REPLACE FUNCTION public.save_support_needs(
  p_run_id uuid,
  p_token text,
  p_codes jsonb
) RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  PERFORM public.assert_survey_token(p_run_id, p_token);

  DELETE FROM public.survey_support_need WHERE survey_run_id = p_run_id;

  FOR v_code IN SELECT unnest(public.jsonb_text_array(p_codes))
  LOOP
    IF length(trim(v_code)) > 0 THEN
      INSERT INTO public.survey_support_need (survey_run_id, support_need_code)
      VALUES (p_run_id, v_code)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;


CREATE OR REPLACE FUNCTION public.save_tool_preference_reasons(
  p_run_id uuid,
  p_token text,
  p_codes jsonb
) RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  PERFORM public.assert_survey_token(p_run_id, p_token);

  DELETE FROM public.survey_tool_preference_reason WHERE survey_run_id = p_run_id;

  FOR v_code IN SELECT unnest(public.jsonb_text_array(p_codes))
  LOOP
    IF length(trim(v_code)) > 0 THEN
      INSERT INTO public.survey_tool_preference_reason (
        survey_run_id,
        preference_reason_code
      )
      VALUES (p_run_id, v_code)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;


-- -----------------------------------------------------------------------------
-- Tool, use-case, context, account, and discovery saves
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.save_tool(
  p_run_id uuid,
  p_token text,
  p_payload jsonb
) RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_tool_id uuid;
  v_tool_code text;
  v_snapshot record;
  v_is_custom boolean;
BEGIN
  v_org_id := public.assert_survey_token(p_run_id, p_token);
  v_tool_id := NULLIF(p_payload->>'id', '')::uuid;
  v_tool_code := NULLIF(p_payload->>'tool_code', '');
  v_is_custom := COALESCE(NULLIF(p_payload->>'is_custom', '')::boolean, v_tool_code IS NULL);

  SELECT *
    INTO v_snapshot
    FROM public.ensure_policy_snapshot_for_tool(v_org_id, v_tool_code);

  IF v_tool_id IS NOT NULL THEN
    PERFORM public.assert_survey_tool_for_run(v_tool_id, p_run_id);

    UPDATE public.survey_tool
       SET tool_code = v_tool_code,
           tool_name = COALESCE(NULLIF(p_payload->>'tool_name', ''), tool_name),
           is_custom = v_is_custom,
           catalog_beheerstatus_code = NULLIF(p_payload->>'catalog_beheerstatus_code', ''),
           org_policy_status_code_snapshot = v_snapshot.org_policy_status_code,
           eu_ai_act_flag_code_snapshot = v_snapshot.eu_ai_act_flag_code,
           policy_snapshot_id = v_snapshot.policy_snapshot_id
     WHERE id = v_tool_id
       AND survey_run_id = p_run_id;

    RETURN v_tool_id;
  END IF;

  INSERT INTO public.survey_tool (
    survey_run_id,
    tool_code,
    tool_name,
    is_custom,
    catalog_beheerstatus_code,
    org_policy_status_code_snapshot,
    eu_ai_act_flag_code_snapshot,
    policy_snapshot_id
  )
  VALUES (
    p_run_id,
    v_tool_code,
    COALESCE(NULLIF(p_payload->>'tool_name', ''), v_tool_code, 'Onbekende tool'),
    v_is_custom,
    NULLIF(p_payload->>'catalog_beheerstatus_code', ''),
    v_snapshot.org_policy_status_code,
    v_snapshot.eu_ai_act_flag_code,
    v_snapshot.policy_snapshot_id
  )
  RETURNING id INTO v_tool_id;

  RETURN v_tool_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.save_tool_use_case(
  p_run_id uuid,
  p_token text,
  p_survey_tool_id uuid,
  p_use_case_code text
) RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_use_case_id uuid;
BEGIN
  PERFORM public.assert_survey_token(p_run_id, p_token);
  PERFORM public.assert_survey_tool_for_run(p_survey_tool_id, p_run_id);

  INSERT INTO public.survey_tool_use_case (
    survey_tool_id,
    use_case_code
  )
  VALUES (
    p_survey_tool_id,
    p_use_case_code
  )
  ON CONFLICT (survey_tool_id, use_case_code) DO UPDATE SET
    use_case_code = EXCLUDED.use_case_code
  RETURNING id INTO v_use_case_id;

  RETURN v_use_case_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.save_tool_use_cases(
  p_run_id uuid,
  p_token text,
  p_survey_tool_id uuid,
  p_use_case_codes jsonb
) RETURNS uuid[]
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_id uuid;
BEGIN
  PERFORM public.assert_survey_token(p_run_id, p_token);
  PERFORM public.assert_survey_tool_for_run(p_survey_tool_id, p_run_id);

  DELETE FROM public.survey_tool_use_case
   WHERE survey_tool_id = p_survey_tool_id;

  FOR v_code IN SELECT unnest(public.jsonb_text_array(p_use_case_codes))
  LOOP
    IF length(trim(v_code)) > 0 THEN
      INSERT INTO public.survey_tool_use_case (survey_tool_id, use_case_code)
      VALUES (p_survey_tool_id, v_code)
      RETURNING id INTO v_id;
      v_ids := array_append(v_ids, v_id);
    END IF;
  END LOOP;

  RETURN v_ids;
END;
$$;


CREATE OR REPLACE FUNCTION public.save_tool_use_case_context(
  p_run_id uuid,
  p_token text,
  p_survey_tool_use_case_id uuid,
  p_context_codes jsonb
) RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tool_id uuid;
  v_code text;
BEGIN
  PERFORM public.assert_survey_token(p_run_id, p_token);

  SELECT survey_tool_id
    INTO v_tool_id
    FROM public.survey_tool_use_case
   WHERE id = p_survey_tool_use_case_id;

  IF v_tool_id IS NULL THEN
    RAISE EXCEPTION 'survey_tool_use_case_not_found';
  END IF;

  PERFORM public.assert_survey_tool_for_run(v_tool_id, p_run_id);

  DELETE FROM public.survey_tool_use_case_context
   WHERE survey_tool_use_case_id = p_survey_tool_use_case_id;

  FOR v_code IN SELECT unnest(public.jsonb_text_array(p_context_codes))
  LOOP
    IF length(trim(v_code)) > 0 THEN
      INSERT INTO public.survey_tool_use_case_context (
        survey_tool_use_case_id,
        context_code
      )
      VALUES (
        p_survey_tool_use_case_id,
        v_code
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;


CREATE OR REPLACE FUNCTION public.save_tool_account(
  p_run_id uuid,
  p_token text,
  p_survey_tool_id uuid,
  p_account_type_code text
) RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_survey_token(p_run_id, p_token);
  PERFORM public.assert_survey_tool_for_run(p_survey_tool_id, p_run_id);

  INSERT INTO public.survey_tool_account (
    survey_tool_id,
    account_type_code
  )
  VALUES (
    p_survey_tool_id,
    p_account_type_code
  )
  ON CONFLICT (survey_tool_id) DO UPDATE SET
    account_type_code = EXCLUDED.account_type_code;
END;
$$;


CREATE OR REPLACE FUNCTION public.register_tool_discovery(
  p_run_id uuid,
  p_token text,
  p_survey_tool_id uuid,
  p_raw_tool_name text
) RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_discovery_id uuid;
BEGIN
  v_org_id := public.assert_survey_token(p_run_id, p_token);
  PERFORM public.assert_survey_tool_for_run(p_survey_tool_id, p_run_id);

  IF p_raw_tool_name IS NULL OR length(trim(p_raw_tool_name)) = 0 THEN
    RAISE EXCEPTION 'raw_tool_name_required';
  END IF;

  INSERT INTO public.tool_catalog_discovery (
    org_id,
    survey_run_id,
    survey_tool_id,
    raw_tool_name,
    discovery_source,
    review_status
  )
  VALUES (
    v_org_id,
    p_run_id,
    p_survey_tool_id,
    trim(p_raw_tool_name),
    'survey',
    'pending'
  )
  RETURNING id INTO v_discovery_id;

  RETURN v_discovery_id;
END;
$$;


-- -----------------------------------------------------------------------------
-- Grants: respondent-facing RPCs only. Internal helpers remain ungranted.
-- -----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.save_profile(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_motivations(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_data_types(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_concerns(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_support_needs(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_tool_preference_reasons(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_tool(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_tool_use_case(uuid, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_tool_use_cases(uuid, text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_tool_use_case_context(uuid, text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_tool_account(uuid, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_tool_discovery(uuid, text, uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_profile(uuid, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_motivations(uuid, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_data_types(uuid, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_concerns(uuid, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_support_needs(uuid, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_tool_preference_reasons(uuid, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_tool(uuid, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_tool_use_case(uuid, text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_tool_use_cases(uuid, text, uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_tool_use_case_context(uuid, text, uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_tool_account(uuid, text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_tool_discovery(uuid, text, uuid, text) TO anon, authenticated;


-- =============================================================================
-- End 06_edge_rpcs.sql
-- =============================================================================
