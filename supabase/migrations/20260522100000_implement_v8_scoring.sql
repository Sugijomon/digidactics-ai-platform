-- Implement V8.1 scoring so complete_survey_run fills risk_result tables.
-- The Supabase CLI is not available in this workspace, so this migration was
-- created manually and should be applied with the Supabase migration tooling.

ALTER TABLE public.risk_result_tool
  ALTER COLUMN policy_snapshot_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.calculate_v8_score(p_survey_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_config_id uuid;
  v_config_json jsonb;
  v_priority_threshold numeric := 40;
  v_toxic_shadow_threshold numeric := 50;
  v_toxic_exposure_threshold numeric := 50;
  v_min_cell_size int := 5;
  v_engine_version text := 'sai-v8.1-sql-2026-05-22';

  v_profile public.survey_profile%ROWTYPE;
  v_data_type_codes text[] := ARRAY[]::text[];
  v_data_boost numeric := 0;
  v_frequency_boost numeric := 0;
  v_automation_boost numeric := 0;
  v_extension_boost numeric := 0;
  v_agentic_usage boolean := false;
  v_special_category_data boolean := false;

  v_tool record;
  v_context_codes text[] := ARRAY[]::text[];
  v_use_case_codes text[] := ARRAY[]::text[];
  v_shadow_score numeric := 0;
  v_use_context_score numeric := 10;
  v_account_multiplier numeric := 1.2;
  v_raw_exposure_score numeric := 0;
  v_exposure_score numeric := 0;
  v_toxic_boost numeric := 0;
  v_priority_score_raw numeric := 0;
  v_priority_score numeric := 0;
  v_tool_tier text := 'low';
  v_tool_triggers text[] := ARRAY[]::text[];

  v_tool_count int := 0;
  v_highest_priority numeric := 0;
  v_other_priority_sum numeric := 0;
  v_person_score_raw numeric := 0;
  v_person_score numeric := 0;
  v_score_tier text := 'low';
  v_review_class text := 'standard';
  v_run_triggers text[] := ARRAY[]::text[];
  v_result jsonb;
BEGIN
  SELECT org_id
    INTO v_org_id
    FROM public.survey_run
   WHERE id = p_survey_run_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'survey_run_not_found';
  END IF;

  SELECT id, config_json, dashboard_min_cell_size
    INTO v_config_id, v_config_json, v_min_cell_size
    FROM public.scan_scoring_config
   WHERE org_id = v_org_id
     AND is_active = true
   ORDER BY effective_from DESC
   LIMIT 1;

  IF v_config_id IS NULL THEN
    INSERT INTO public.scan_scoring_config (
      org_id,
      scoring_config_key,
      methodology_version,
      config_json,
      dashboard_min_cell_size,
      is_active
    )
    VALUES (
      v_org_id,
      'sai-v8.1-default',
      'v8.1',
      jsonb_build_object(
        'priority_review_threshold', 40,
        'toxic_shadow_threshold', 50,
        'toxic_exposure_threshold', 50
      ),
      5,
      true
    )
    RETURNING id, config_json, dashboard_min_cell_size
      INTO v_config_id, v_config_json, v_min_cell_size;
  END IF;

  v_priority_threshold := COALESCE(
    NULLIF(v_config_json->>'priority_review_threshold', '')::numeric,
    40
  );
  v_toxic_shadow_threshold := COALESCE(
    NULLIF(v_config_json->>'toxic_shadow_threshold', '')::numeric,
    50
  );
  v_toxic_exposure_threshold := COALESCE(
    NULLIF(v_config_json->>'toxic_exposure_threshold', '')::numeric,
    50
  );
  v_min_cell_size := COALESCE(v_min_cell_size, 5);

  SELECT *
    INTO v_profile
    FROM public.survey_profile
   WHERE survey_run_id = p_survey_run_id;

  SELECT COALESCE(array_agg(data_type_code), ARRAY[]::text[])
    INTO v_data_type_codes
    FROM public.survey_data_type
   WHERE survey_run_id = p_survey_run_id;

  SELECT COALESCE(MAX(
    CASE data_type_code
      WHEN 'publiek' THEN 0
      WHEN 'public_information' THEN 0
      WHEN 'niets' THEN 0
      WHEN 'none' THEN 0
      WHEN 'namen' THEN 8
      WHEN 'names' THEN 8
      WHEN 'onzeker' THEN 10
      WHEN 'unsure' THEN 10
      WHEN 'interne_email' THEN 12
      WHEN 'internal_emails' THEN 12
      WHEN 'interne_documenten' THEN 12
      WHEN 'internal_documents' THEN 12
      WHEN 'notulen' THEN 12
      WHEN 'meeting_notes' THEN 12
      WHEN 'broncode_logica' THEN 16
      WHEN 'source_code_logic' THEN 16
      WHEN 'klantdata' THEN 20
      WHEN 'customer_data' THEN 20
      WHEN 'financiele_data' THEN 22
      WHEN 'financial_data' THEN 22
      WHEN 'juridische_documenten' THEN 22
      WHEN 'legal_documents' THEN 22
      WHEN 'gevoelig_persoonsgegeven' THEN 30
      WHEN 'special_personal_data' THEN 30
      ELSE 8
    END
  ), 0)
    INTO v_data_boost
    FROM public.survey_data_type
   WHERE survey_run_id = p_survey_run_id;

  v_special_category_data :=
    'gevoelig_persoonsgegeven' = ANY(v_data_type_codes)
    OR 'special_personal_data' = ANY(v_data_type_codes);

  v_frequency_boost := CASE v_profile.ai_frequency_code
    WHEN 'never' THEN 0
    WHEN 'monthly' THEN 4
    WHEN 'weekly' THEN 8
    WHEN 'daily' THEN 14
    ELSE 6
  END;

  IF v_profile.ai_frequency_code IS NULL THEN
    v_frequency_boost := 0;
  END IF;

  v_automation_boost := CASE v_profile.automation_usage_code
    WHEN 'alleen_chatbot' THEN 0
    WHEN 'agents_reeks_taken' THEN 15
    WHEN 'gekoppeld_apps' THEN 12
    WHEN 'weet_niet_zeker' THEN 8
    ELSE 0
  END;

  v_extension_boost := CASE v_profile.browser_extension_usage_code
    WHEN 'nee' THEN 0
    WHEN 'ja_bewust' THEN 8
    WHEN 'ja_onzeker' THEN 10
    WHEN 'weet_niet' THEN 5
    ELSE 0
  END;

  v_agentic_usage := v_profile.automation_usage_code = 'agents_reeks_taken';

  DELETE FROM public.risk_result_tool
   WHERE survey_run_id = p_survey_run_id;

  FOR v_tool IN
    SELECT
      st.id,
      st.tool_code,
      st.org_policy_status_code_snapshot,
      st.policy_snapshot_id,
      sta.account_type_code
    FROM public.survey_tool st
    LEFT JOIN public.survey_tool_account sta
      ON sta.survey_tool_id = st.id
    WHERE st.survey_run_id = p_survey_run_id
    ORDER BY st.created_at, st.id
  LOOP
    v_tool_count := v_tool_count + 1;

    SELECT COALESCE(array_agg(DISTINCT use_case_code), ARRAY[]::text[])
      INTO v_use_case_codes
      FROM public.survey_tool_use_case
     WHERE survey_tool_id = v_tool.id;

    SELECT COALESCE(array_agg(DISTINCT ctx.context_code), ARRAY[]::text[])
      INTO v_context_codes
      FROM public.survey_tool_use_case tuc
      JOIN public.survey_tool_use_case_context ctx
        ON ctx.survey_tool_use_case_id = tuc.id
     WHERE tuc.survey_tool_id = v_tool.id;

    SELECT COALESCE(MAX(use_case_base * context_multiplier), 10)
      INTO v_use_context_score
      FROM (
        SELECT
          CASE tuc.use_case_code
            WHEN 'brainstormen' THEN 8
            WHEN 'drafting' THEN 10
            WHEN 'teksten_schrijven' THEN 10
            WHEN 'informatie_opzoeken' THEN 10
            WHEN 'vertalen' THEN 10
            WHEN 'samenvatten_redigeren' THEN 12
            WHEN 'presentaties_design' THEN 14
            WHEN 'afbeeldingen_genereren' THEN 18
            WHEN 'audio_genereren' THEN 18
            WHEN 'video_genereren' THEN 20
            WHEN 'klantenservice' THEN 25
            WHEN 'code_schrijven' THEN 25
            WHEN 'vergaderingen_notuleren' THEN 26
            WHEN 'data_analyseren' THEN 30
            WHEN 'automatisering' THEN 35
            WHEN 'workflow_uitvoeren' THEN 40
            WHEN 'taken_automatisch_afhandelen' THEN 40
            WHEN 'systemen_aansturen' THEN 45
            ELSE 15
          END AS use_case_base,
          COALESCE((
            SELECT MAX(
              CASE ctx.context_code
                WHEN 'internal_work' THEN 1.0
                WHEN 'intern_gebruik' THEN 1.0
                WHEN 'klantgerichte_toepassing' THEN 1.2
                WHEN 'beslisondersteuning' THEN 1.35
                WHEN 'besluiten_over_personen' THEN 1.6
                WHEN 'hr_evaluatie' THEN 1.7
                WHEN 'kritieke_systemen' THEN 1.8
                WHEN 'nog_niet_duidelijk' THEN 1.15
                ELSE 1.0
              END
            )
            FROM public.survey_tool_use_case_context ctx
            WHERE ctx.survey_tool_use_case_id = tuc.id
          ), 1.0) AS context_multiplier
        FROM public.survey_tool_use_case tuc
        WHERE tuc.survey_tool_id = v_tool.id
      ) weighted_use_cases;

    v_account_multiplier := CASE v_tool.account_type_code
      WHEN 'business_license' THEN 0.8
      WHEN 'zakelijke_licentie' THEN 0.8
      WHEN 'personal_paid' THEN 1.2
      WHEN 'prive_betaald' THEN 1.2
      WHEN 'personal_free' THEN 1.35
      WHEN 'prive_gratis' THEN 1.35
      WHEN 'both' THEN 1.1
      WHEN 'beide' THEN 1.1
      ELSE 1.2
    END;

    v_shadow_score := CASE COALESCE(v_tool.org_policy_status_code_snapshot, 'newly_discovered')
      WHEN 'approved' THEN 0
      WHEN 'newly_discovered' THEN 20
      WHEN 'under_review' THEN 20
      WHEN 'restricted' THEN 40
      WHEN 'prohibited' THEN 80
      ELSE 20
    END;

    v_raw_exposure_score :=
      (v_use_context_score * v_account_multiplier)
      + v_data_boost
      + v_frequency_boost
      + v_automation_boost
      + v_extension_boost;

    v_exposure_score := LEAST(100, ROUND(v_raw_exposure_score, 2));
    v_toxic_boost := CASE
      WHEN v_shadow_score > v_toxic_shadow_threshold
       AND v_exposure_score > v_toxic_exposure_threshold
      THEN 20
      ELSE 0
    END;
    v_priority_score_raw :=
      (0.45 * v_shadow_score)
      + (0.45 * v_exposure_score)
      + v_toxic_boost;
    v_priority_score := LEAST(100, ROUND(v_priority_score_raw, 2));

    v_tool_tier := CASE
      WHEN v_priority_score >= 75 THEN 'critical'
      WHEN v_priority_score >= 50 THEN 'high'
      WHEN v_priority_score >= 25 THEN 'elevated'
      ELSE 'low'
    END;

    v_tool_triggers := ARRAY[]::text[];

    IF v_tool.org_policy_status_code_snapshot = 'prohibited' THEN
      v_tool_triggers := array_append(v_tool_triggers, 'prohibited_tool');
    END IF;

    IF v_agentic_usage THEN
      v_tool_triggers := array_append(v_tool_triggers, 'agentic_usage');
    END IF;

    IF v_profile.automation_usage_code IN ('agents_reeks_taken', 'gekoppeld_apps') THEN
      v_tool_triggers := array_append(v_tool_triggers, 'automation_unmanaged');
    END IF;

    IF v_profile.browser_extension_usage_code IN ('ja_bewust', 'ja_onzeker') THEN
      v_tool_triggers := array_append(v_tool_triggers, 'extension_unmanaged');
    END IF;

    IF v_special_category_data THEN
      v_tool_triggers := array_append(v_tool_triggers, 'special_category_data');
    END IF;

    IF 'hr_evaluatie' = ANY(v_context_codes) THEN
      v_tool_triggers := array_append(v_tool_triggers, 'hr_evaluation_context');
    END IF;

    IF v_priority_score >= v_priority_threshold THEN
      v_tool_triggers := array_append(v_tool_triggers, 'priority_threshold');
    END IF;

    INSERT INTO public.risk_result_tool (
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
    VALUES (
      p_survey_run_id,
      v_tool.id,
      v_org_id,
      v_config_id,
      v_tool.policy_snapshot_id,
      v_shadow_score,
      v_exposure_score,
      v_raw_exposure_score,
      v_priority_score,
      v_priority_score_raw,
      v_tool_tier,
      v_tool_triggers,
      jsonb_build_object(
        'engine_version', v_engine_version,
        'policy_status_code', COALESCE(v_tool.org_policy_status_code_snapshot, 'newly_discovered'),
        'use_case_codes', v_use_case_codes,
        'context_codes', v_context_codes,
        'account_type_code', v_tool.account_type_code,
        'data_type_codes', v_data_type_codes,
        'use_context_score', v_use_context_score,
        'account_multiplier', v_account_multiplier,
        'data_boost', v_data_boost,
        'frequency_boost', v_frequency_boost,
        'automation_boost', v_automation_boost,
        'extension_boost', v_extension_boost,
        'toxic_boost', v_toxic_boost
      ),
      now()
    );

    IF v_priority_score > v_highest_priority THEN
      v_other_priority_sum := v_other_priority_sum + v_highest_priority;
      v_highest_priority := v_priority_score;
    ELSE
      v_other_priority_sum := v_other_priority_sum + v_priority_score;
    END IF;

    v_run_triggers := v_run_triggers || v_tool_triggers;
  END LOOP;

  SELECT COALESCE(array_agg(DISTINCT triggers.trigger_code), ARRAY[]::text[])
    INTO v_run_triggers
    FROM unnest(v_run_triggers) AS triggers(trigger_code);

  v_person_score_raw := v_highest_priority + (0.15 * v_other_priority_sum);
  v_person_score := LEAST(100, ROUND(v_person_score_raw, 2));
  v_score_tier := CASE
    WHEN v_person_score >= 75 THEN 'critical'
    WHEN v_person_score >= 50 THEN 'high'
    WHEN v_person_score >= 25 THEN 'elevated'
    ELSE 'low'
  END;
  v_review_class := CASE
    WHEN 'prohibited_tool' = ANY(v_run_triggers) OR v_person_score >= 75 THEN 'toxic_shadow'
    WHEN COALESCE(array_length(v_run_triggers, 1), 0) > 0 THEN 'priority_review'
    ELSE 'standard'
  END;

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
  VALUES (
    p_survey_run_id,
    v_org_id,
    v_config_id,
    v_engine_version,
    v_person_score,
    v_highest_priority,
    v_person_score_raw,
    v_score_tier,
    v_review_class,
    v_priority_threshold,
    v_min_cell_size,
    v_review_class <> 'standard',
    v_run_triggers,
    now(),
    jsonb_build_object(
      'engine_version', v_engine_version,
      'tool_count', v_tool_count,
      'highest_priority_score', v_highest_priority,
      'other_priority_sum', v_other_priority_sum,
      'aggregation', 'highest_priority_plus_15_percent_of_other_priorities',
      'data_type_codes', v_data_type_codes,
      'data_boost', v_data_boost,
      'frequency_boost', v_frequency_boost,
      'automation_boost', v_automation_boost,
      'extension_boost', v_extension_boost,
      'priority_review_threshold', v_priority_threshold,
      'toxic_shadow_threshold', v_toxic_shadow_threshold,
      'toxic_exposure_threshold', v_toxic_exposure_threshold
    )
  )
  ON CONFLICT (survey_run_id) DO UPDATE SET
    org_id = EXCLUDED.org_id,
    scoring_config_id = EXCLUDED.scoring_config_id,
    engine_version = EXCLUDED.engine_version,
    person_score = EXCLUDED.person_score,
    highest_priority_score = EXCLUDED.highest_priority_score,
    priority_score_raw = EXCLUDED.priority_score_raw,
    score_tier = EXCLUDED.score_tier,
    review_class = EXCLUDED.review_class,
    review_threshold = EXCLUDED.review_threshold,
    min_cell_size = EXCLUDED.min_cell_size,
    dpo_review_required = EXCLUDED.dpo_review_required,
    review_trigger_codes = EXCLUDED.review_trigger_codes,
    scored_at = EXCLUDED.scored_at,
    score_breakdown = EXCLUDED.score_breakdown;

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
    v_org_id,
    p_survey_run_id,
    NULL::uuid,
    v_config_id,
    NULL::uuid,
    triggers.trigger_code,
    v_review_class,
    v_run_triggers,
    v_person_score,
    'open',
    now(),
    now()
  FROM unnest(v_run_triggers) AS triggers(trigger_code)
  ON CONFLICT (survey_run_id, reason_code) DO UPDATE SET
    review_class = EXCLUDED.review_class,
    trigger_codes = EXCLUDED.trigger_codes,
    priority_score = EXCLUDED.priority_score,
    status = CASE
      WHEN dpo_review_items.status = 'dismissed' THEN 'open'
      ELSE dpo_review_items.status
    END,
    updated_at = now();

  UPDATE public.dpo_review_items
     SET status = 'dismissed',
         updated_at = now()
   WHERE survey_run_id = p_survey_run_id
     AND status IN ('open', 'in_review')
     AND NOT (reason_code = ANY(v_run_triggers));

  v_result := jsonb_build_object(
    'engine_version', v_engine_version,
    'survey_run_id', p_survey_run_id,
    'org_id', v_org_id,
    'scoring_config_id', v_config_id,
    'tool_count', v_tool_count,
    'person_score', v_person_score,
    'highest_priority_score', v_highest_priority,
    'score_tier', v_score_tier,
    'review_class', v_review_class,
    'review_trigger_codes', v_run_triggers
  );

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
    v_org_id,
    'score.calculated',
    NULL,
    'system',
    'risk_result',
    p_survey_run_id::text,
    v_result
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_v8_score(uuid) FROM PUBLIC, anon, authenticated;
