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
    department_code = COALESCE(EXCLUDED.department_code, survey_profile.department_code),
    department_other_text = COALESCE(EXCLUDED.department_other_text, survey_profile.department_other_text),
    ai_frequency_code = COALESCE(EXCLUDED.ai_frequency_code, survey_profile.ai_frequency_code),
    no_ai_reason_code = COALESCE(EXCLUDED.no_ai_reason_code, survey_profile.no_ai_reason_code),
    data_awareness_code = COALESCE(EXCLUDED.data_awareness_code, survey_profile.data_awareness_code),
    anonymization_behavior_code = COALESCE(EXCLUDED.anonymization_behavior_code, survey_profile.anonymization_behavior_code),
    browser_extension_usage_code = COALESCE(EXCLUDED.browser_extension_usage_code, survey_profile.browser_extension_usage_code),
    automation_usage_code = COALESCE(EXCLUDED.automation_usage_code, survey_profile.automation_usage_code),
    ai_policy_awareness_code = COALESCE(EXCLUDED.ai_policy_awareness_code, survey_profile.ai_policy_awareness_code),
    ai_skill_level_code = COALESCE(EXCLUDED.ai_skill_level_code, survey_profile.ai_skill_level_code),
    processing_output_code = COALESCE(EXCLUDED.processing_output_code, survey_profile.processing_output_code),
    top_concern_other_text = COALESCE(EXCLUDED.top_concern_other_text, survey_profile.top_concern_other_text),
    future_usecases_text = COALESCE(EXCLUDED.future_usecases_text, survey_profile.future_usecases_text),
    updated_at = now();
END;
$$;
