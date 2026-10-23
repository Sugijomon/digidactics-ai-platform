BEGIN;

-- AI-Foto Fable feedback: additive respondent signals.
-- These fields feed AI-Foto cards only and are not SAI V8.1 scoring inputs.

CREATE TABLE IF NOT EXISTS public.ref_ai_visibility (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_value_evidence (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_ai_foto_doubt_scenario (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

INSERT INTO public.ref_ai_visibility (code, label_nl, sort_order)
VALUES
  ('visible_to_recipient', 'Ontvanger of collega ziet dat AI is gebruikt', 10),
  ('visible_if_asked', 'Alleen zichtbaar als iemand ernaar vraagt', 20),
  ('not_visible', 'Meestal niet zichtbaar', 30),
  ('not_relevant', 'Niet relevant voor deze toepassing', 40),
  ('unknown', 'Weet ik niet zeker', 50)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.ref_value_evidence (code, label_nl, sort_order)
VALUES
  ('feeling_estimate', 'Vooral gevoel of inschatting', 10),
  ('concrete_example', 'Concreet voorbeeld uit mijn werk', 20),
  ('measurable', 'Dit is meetbaar of gemeten', 30),
  ('unknown', 'Weet ik niet zeker', 40)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.ref_ai_foto_doubt_scenario (code, label_nl, sort_order)
VALUES
  ('check_sources', 'Ik controleer bronnen of feiten voordat ik het gebruik', 10),
  ('ask_colleague', 'Ik vraag een collega of deskundige mee te kijken', 20),
  ('use_as_draft_only', 'Ik gebruik het alleen als ruwe opzet of inspiratie', 30),
  ('use_anyway', 'Ik gebruik het meestal toch als het plausibel klinkt', 40),
  ('stop_or_report', 'Ik stop en meld of bespreek het via de juiste route', 50),
  ('unknown', 'Ik weet niet goed wat ik dan moet doen', 60)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.ref_value_type (code, label_nl, sort_order)
VALUES ('unknown', 'Weet ik niet zeker', 90)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.ref_value_beneficiary (code, label_nl, sort_order)
VALUES ('unknown', 'Weet ik niet zeker', 90)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

ALTER TABLE public.survey_application
  ADD COLUMN IF NOT EXISTS ai_visibility_code text
    REFERENCES public.ref_ai_visibility(code),
  ADD COLUMN IF NOT EXISTS value_evidence_code text
    REFERENCES public.ref_value_evidence(code);

ALTER TABLE public.survey_profile
  ADD COLUMN IF NOT EXISTS ai_foto_doubt_scenario_code text
    REFERENCES public.ref_ai_foto_doubt_scenario(code);

-- Persistent AI-Foto analysis plane.
CREATE TABLE IF NOT EXISTS public.card_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scan_wave_id uuid REFERENCES public.scan_wave(id) ON DELETE SET NULL,
  card_type text NOT NULL,
  source_kind text NOT NULL,
  cluster_key text NOT NULL,
  title text NOT NULL,
  observation text NOT NULL,
  respondent_count integer NOT NULL DEFAULT 0,
  segment_spread jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_level text NOT NULL DEFAULT 'gesteld',
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  interpretation text,
  open_questions text[] NOT NULL DEFAULT ARRAY[]::text[],
  precaution text,
  follow_up_direction text,
  proposed_owner_role text,
  review_date date,
  related_card_item_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  status text NOT NULL DEFAULT 'draft',
  analysis_version text NOT NULL DEFAULT 'ai-foto-analysis-v1',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT card_item_card_type_check
    CHECK (card_type IN ('waarde', 'aandacht', 'vaardigheid')),
  CONSTRAINT card_item_source_kind_check
    CHECK (source_kind IN ('application_cluster', 'run_aggregate', 'derived_signal')),
  CONSTRAINT card_item_evidence_level_check
    CHECK (evidence_level IN ('gesteld', 'aannemelijk', 'aangetoond')),
  CONSTRAINT card_item_status_check
    CHECK (status IN ('draft', 'ai_suggested', 'consultant_reviewed', 'approved')),
  CONSTRAINT card_item_owner_role_check
    CHECK (
      proposed_owner_role IS NULL
      OR proposed_owner_role IN ('management', 'dpo', 'it', 'hr', 'proceseigenaar')
    ),
  CONSTRAINT card_item_approved_metadata_check
    CHECK (
      status <> 'approved'
      OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_card_item_org_status
  ON public.card_item(org_id, status);

CREATE INDEX IF NOT EXISTS idx_card_item_wave_type
  ON public.card_item(scan_wave_id, card_type);

CREATE INDEX IF NOT EXISTS idx_card_item_cluster
  ON public.card_item(org_id, analysis_version, cluster_key);

CREATE OR REPLACE FUNCTION public.touch_card_item_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_card_item_touch_updated_at ON public.card_item;
CREATE TRIGGER trg_card_item_touch_updated_at
  BEFORE UPDATE ON public.card_item
  FOR EACH ROW EXECUTE FUNCTION public.touch_card_item_updated_at();

ALTER TABLE public.ref_ai_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_value_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_ai_foto_doubt_scenario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_item ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.ref_ai_visibility,
  public.ref_value_evidence,
  public.ref_ai_foto_doubt_scenario,
  public.card_item
FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.ref_ai_visibility,
  public.ref_value_evidence,
  public.ref_ai_foto_doubt_scenario
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.card_item TO authenticated;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT unnest(ARRAY[
      'ref_ai_visibility',
      'ref_value_evidence',
      'ref_ai_foto_doubt_scenario'
    ]) AS tname
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'ref_select_' || r.tname, r.tname);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'ref_insert_super_admin_' || r.tname, r.tname);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'ref_update_super_admin_' || r.tname, r.tname);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'ref_delete_super_admin_' || r.tname, r.tname);

    EXECUTE format($p$
      CREATE POLICY %I ON public.%I
      FOR SELECT TO authenticated
      USING (true);
    $p$, 'ref_select_' || r.tname, r.tname);

    EXECUTE format($p$
      CREATE POLICY %I ON public.%I
      FOR INSERT TO authenticated
      WITH CHECK (public.is_super_admin(auth.uid()));
    $p$, 'ref_insert_super_admin_' || r.tname, r.tname);

    EXECUTE format($p$
      CREATE POLICY %I ON public.%I
      FOR UPDATE TO authenticated
      USING (public.is_super_admin(auth.uid()))
      WITH CHECK (public.is_super_admin(auth.uid()));
    $p$, 'ref_update_super_admin_' || r.tname, r.tname);

    EXECUTE format($p$
      CREATE POLICY %I ON public.%I
      FOR DELETE TO authenticated
      USING (public.is_super_admin(auth.uid()));
    $p$, 'ref_delete_super_admin_' || r.tname, r.tname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS card_item_select ON public.card_item;
DROP POLICY IF EXISTS card_item_insert ON public.card_item;
DROP POLICY IF EXISTS card_item_update ON public.card_item;
DROP POLICY IF EXISTS card_item_delete ON public.card_item;

CREATE POLICY card_item_select ON public.card_item
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY card_item_insert ON public.card_item
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY card_item_update ON public.card_item
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY card_item_delete ON public.card_item
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

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
    ai_foto_doubt_scenario_code,
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
    NULLIF(p_payload->>'ai_foto_doubt_scenario_code', ''),
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
    ai_foto_doubt_scenario_code = COALESCE(EXCLUDED.ai_foto_doubt_scenario_code, survey_profile.ai_foto_doubt_scenario_code),
    top_concern_other_text = COALESCE(EXCLUDED.top_concern_other_text, survey_profile.top_concern_other_text),
    future_usecases_text = COALESCE(EXCLUDED.future_usecases_text, survey_profile.future_usecases_text),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.save_survey_application(
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
  v_application_id uuid;
  v_tool_id uuid;
  v_use_case_id uuid;
  v_depth_rank text;
  v_code text;
  v_skill jsonb;
  v_skill_domain text;
  v_skill_response text;
BEGIN
  PERFORM public.assert_survey_token(p_run_id, p_token);

  v_tool_id := NULLIF(p_payload->>'survey_tool_id', '')::uuid;
  v_use_case_id := NULLIF(p_payload->>'survey_tool_use_case_id', '')::uuid;
  v_depth_rank := COALESCE(NULLIF(p_payload->>'depth_rank', ''), 'primary');

  IF v_tool_id IS NULL THEN
    RAISE EXCEPTION 'survey_tool_id_required';
  END IF;

  PERFORM public.assert_survey_tool_for_run(v_tool_id, p_run_id);

  IF v_use_case_id IS NOT NULL THEN
    IF public.survey_tool_use_case_run(v_use_case_id) IS DISTINCT FROM p_run_id THEN
      RAISE EXCEPTION 'survey_tool_use_case_run_mismatch';
    END IF;
  END IF;

  INSERT INTO public.survey_application (
    survey_run_id,
    survey_tool_id,
    survey_tool_use_case_id,
    depth_rank,
    task_description_limited,
    application_frequency_code,
    account_environment_code,
    output_destination_code,
    output_control_code,
    deviation_authority_code,
    people_impact_code,
    ai_visibility_code,
    transparency_code,
    beneficiary_code,
    net_effect_code,
    control_rework_code,
    shareability_code,
    value_evidence_code,
    escalation_route_awareness_code,
    updated_at
  )
  VALUES (
    p_run_id,
    v_tool_id,
    v_use_case_id,
    v_depth_rank,
    left(NULLIF(p_payload->>'task_description_limited', ''), 500),
    NULLIF(p_payload->>'application_frequency_code', ''),
    NULLIF(p_payload->>'account_environment_code', ''),
    NULLIF(p_payload->>'output_destination_code', ''),
    NULLIF(p_payload->>'output_control_code', ''),
    NULLIF(p_payload->>'deviation_authority_code', ''),
    NULLIF(p_payload->>'people_impact_code', ''),
    NULLIF(p_payload->>'ai_visibility_code', ''),
    NULLIF(p_payload->>'transparency_code', ''),
    NULLIF(p_payload->>'beneficiary_code', ''),
    NULLIF(p_payload->>'net_effect_code', ''),
    NULLIF(p_payload->>'control_rework_code', ''),
    NULLIF(p_payload->>'shareability_code', ''),
    NULLIF(p_payload->>'value_evidence_code', ''),
    NULLIF(p_payload->>'escalation_route_awareness_code', ''),
    now()
  )
  ON CONFLICT (survey_run_id, depth_rank) DO UPDATE SET
    survey_tool_id = EXCLUDED.survey_tool_id,
    survey_tool_use_case_id = EXCLUDED.survey_tool_use_case_id,
    task_description_limited = EXCLUDED.task_description_limited,
    application_frequency_code = EXCLUDED.application_frequency_code,
    account_environment_code = EXCLUDED.account_environment_code,
    output_destination_code = EXCLUDED.output_destination_code,
    output_control_code = EXCLUDED.output_control_code,
    deviation_authority_code = EXCLUDED.deviation_authority_code,
    people_impact_code = EXCLUDED.people_impact_code,
    ai_visibility_code = EXCLUDED.ai_visibility_code,
    transparency_code = EXCLUDED.transparency_code,
    beneficiary_code = EXCLUDED.beneficiary_code,
    net_effect_code = EXCLUDED.net_effect_code,
    control_rework_code = EXCLUDED.control_rework_code,
    shareability_code = EXCLUDED.shareability_code,
    value_evidence_code = EXCLUDED.value_evidence_code,
    escalation_route_awareness_code = EXCLUDED.escalation_route_awareness_code,
    updated_at = now()
  RETURNING id INTO v_application_id;

  DELETE FROM public.survey_application_data_type
   WHERE survey_application_id = v_application_id;
  FOR v_code IN SELECT unnest(public.jsonb_text_array(p_payload->'data_type_codes'))
  LOOP
    IF length(trim(v_code)) > 0 THEN
      INSERT INTO public.survey_application_data_type (survey_application_id, data_type_code)
      VALUES (v_application_id, v_code)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  DELETE FROM public.survey_application_value_type
   WHERE survey_application_id = v_application_id;
  FOR v_code IN SELECT unnest(public.jsonb_text_array(p_payload->'value_type_codes'))
  LOOP
    IF length(trim(v_code)) > 0 THEN
      INSERT INTO public.survey_application_value_type (survey_application_id, value_type_code)
      VALUES (v_application_id, v_code)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  DELETE FROM public.survey_application_condition_need
   WHERE survey_application_id = v_application_id;
  FOR v_code IN SELECT unnest(public.jsonb_text_array(p_payload->'condition_need_codes'))
  LOOP
    IF length(trim(v_code)) > 0 THEN
      INSERT INTO public.survey_application_condition_need (survey_application_id, condition_need_code)
      VALUES (v_application_id, v_code)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  DELETE FROM public.survey_application_near_miss_signal
   WHERE survey_application_id = v_application_id;
  FOR v_code IN SELECT unnest(public.jsonb_text_array(p_payload->'near_miss_signal_codes'))
  LOOP
    IF length(trim(v_code)) > 0 THEN
      INSERT INTO public.survey_application_near_miss_signal (survey_application_id, near_miss_signal_code)
      VALUES (v_application_id, v_code)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  DELETE FROM public.survey_application_support_need
   WHERE survey_application_id = v_application_id;
  FOR v_code IN SELECT unnest(public.jsonb_text_array(p_payload->'support_need_codes'))
  LOOP
    IF length(trim(v_code)) > 0 THEN
      INSERT INTO public.survey_application_support_need (survey_application_id, support_need_code)
      VALUES (v_application_id, v_code)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  DELETE FROM public.survey_application_skill_response
   WHERE survey_application_id = v_application_id;
  FOR v_skill IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'skill_responses', '[]'::jsonb))
  LOOP
    v_skill_domain := NULLIF(v_skill->>'skill_domain_code', '');
    v_skill_response := NULLIF(v_skill->>'skill_response_code', '');

    IF v_skill_domain IS NOT NULL AND v_skill_response IS NOT NULL THEN
      INSERT INTO public.survey_application_skill_response (
        survey_application_id,
        skill_domain_code,
        skill_response_code
      )
      VALUES (v_application_id, v_skill_domain, v_skill_response)
      ON CONFLICT (survey_application_id, skill_domain_code) DO UPDATE SET
        skill_response_code = EXCLUDED.skill_response_code;
    END IF;
  END LOOP;

  RETURN v_application_id;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_card_item_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_profile(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_survey_application(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.save_profile(uuid, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_survey_application(uuid, text, jsonb) TO anon, authenticated;

COMMIT;
