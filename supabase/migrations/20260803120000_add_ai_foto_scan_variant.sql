-- AI-Foto scan variant foundation.
--
-- This migration adds the minimal record-plane extension for AI-Foto without
-- changing SAI V8.1 scoring. Respondent writes remain RPC-only.
--
-- Do not apply to production without the normal staging and production
-- migration go/no-go.

BEGIN;

-- -----------------------------------------------------------------------------
-- Product/method markers
-- -----------------------------------------------------------------------------

ALTER TABLE public.scan_wave
  ADD COLUMN IF NOT EXISTS product_code text NOT NULL DEFAULT 'sai',
  ADD COLUMN IF NOT EXISTS method_version text NOT NULL DEFAULT 'sai-v8.1';

ALTER TABLE public.survey_run
  ADD COLUMN IF NOT EXISTS product_code_snapshot text NOT NULL DEFAULT 'sai',
  ADD COLUMN IF NOT EXISTS method_version_snapshot text NOT NULL DEFAULT 'sai-v8.1';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'scan_wave_product_code_check'
       AND conrelid = 'public.scan_wave'::regclass
  ) THEN
    ALTER TABLE public.scan_wave
      ADD CONSTRAINT scan_wave_product_code_check
      CHECK (product_code IN ('sai', 'ai_foto'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'survey_run_product_code_snapshot_check'
       AND conrelid = 'public.survey_run'::regclass
  ) THEN
    ALTER TABLE public.survey_run
      ADD CONSTRAINT survey_run_product_code_snapshot_check
      CHECK (product_code_snapshot IN ('sai', 'ai_foto'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scan_wave_product_method
  ON public.scan_wave(org_id, product_code, method_version);

CREATE INDEX IF NOT EXISTS idx_survey_run_product_method
  ON public.survey_run(org_id, product_code_snapshot, method_version_snapshot);

-- Make new runs inherit the wave product/method at start time. This preserves
-- historic runs if a wave is later edited.
DROP FUNCTION IF EXISTS public.start_survey_run(text);

CREATE OR REPLACE FUNCTION public.start_survey_run(p_wave_token text)
RETURNS TABLE (
  run_id uuid,
  submission_token text,
  product_code text,
  method_version text
)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_wave    record;
  v_token   text;
  v_run_id  uuid;
BEGIN
  SELECT sw.id, sw.org_id, sw.product_code, sw.method_version
    INTO v_wave
    FROM public.scan_wave sw
   WHERE sw.wave_token_hash IS NOT NULL
     AND sw.wave_token_hash = digest(p_wave_token, 'sha256')
     AND sw.status = 'active'
     AND (sw.starts_at IS NULL OR sw.starts_at <= now())
     AND (sw.ends_at IS NULL OR sw.ends_at > now())
   LIMIT 1;

  IF v_wave.id IS NULL THEN
    RAISE EXCEPTION 'invalid_or_closed_wave';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.survey_run (
    org_id,
    wave_id,
    locale,
    source,
    product_code_snapshot,
    method_version_snapshot,
    submission_token_hash
  )
  VALUES (
    v_wave.org_id,
    v_wave.id,
    'nl',
    'web',
    COALESCE(v_wave.product_code, 'sai'),
    COALESCE(v_wave.method_version, 'sai-v8.1'),
    digest(v_token, 'sha256')
  )
  RETURNING id INTO v_run_id;

  RETURN QUERY
  SELECT
    v_run_id,
    v_token,
    COALESCE(v_wave.product_code, 'sai')::text,
    COALESCE(v_wave.method_version, 'sai-v8.1')::text;
END;
$$;

REVOKE ALL ON FUNCTION public.start_survey_run(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_survey_run(text) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Reference tables for AI-Foto application-level signals
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ref_application_frequency (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_application_account_environment (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_output_destination (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_output_control (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_deviation_authority (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_people_impact (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_ai_transparency (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_value_type (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_value_beneficiary (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_net_effect (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_control_rework (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_shareability (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_condition_need (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_near_miss_signal (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_escalation_route_awareness (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_skill_domain (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ref_skill_response (
  code text PRIMARY KEY,
  label_nl text NOT NULL,
  sort_order int DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

-- Conservative initial runtime codes. These are signal labels, not legal
-- qualifications and not risk-engine inputs.
INSERT INTO public.ref_application_frequency (code, label_nl, sort_order) VALUES
  ('daily', 'Dagelijks', 10),
  ('weekly', 'Wekelijks', 20),
  ('monthly', 'Maandelijks', 30),
  ('rarely', 'Incidenteel of enkele keren geprobeerd', 40),
  ('unknown', 'Weet ik niet zeker', 90)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_application_account_environment (code, label_nl, sort_order) VALUES
  ('business_license', 'Zakelijke licentie of beheeromgeving', 10),
  ('embedded_business_system', 'Ingebouwde AI-functie in een bedrijfssysteem', 20),
  ('personal_free', 'Persoonlijk gratis account', 30),
  ('personal_paid', 'Persoonlijk betaald account', 40),
  ('multiple', 'Meerdere omgevingen', 50),
  ('unknown', 'Weet ik niet zeker', 90)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_output_destination (code, label_nl, sort_order) VALUES
  ('personal_inspiration', 'Alleen persoonlijke inspiratie of ruwe opzet', 10),
  ('internal_document', 'Intern werkdocument', 20),
  ('colleague_communication', 'Communicatie met collega''s', 30),
  ('customer_public_communication', 'Klant- of publiekscommunicatie', 40),
  ('other_system_input', 'Invoer in een ander systeem', 50),
  ('advice_decision_support', 'Advies of beslisondersteuning', 60),
  ('person_decision', 'Besluit of advies over een persoon', 70),
  ('unknown', 'Weet ik niet zeker', 90)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_output_control (code, label_nl, sort_order) VALUES
  ('full_manual_check', 'Ik controleer inhoud en bronnen volledig', 10),
  ('important_parts_check', 'Ik controleer alleen belangrijke onderdelen', 20),
  ('colleague_or_expert_check', 'Een collega of deskundige controleert', 30),
  ('automatic_processing', 'Het systeem verwerkt de output automatisch verder', 40),
  ('usually_no_check', 'Meestal geen afzonderlijke controle', 50),
  ('varies', 'Dat verschilt sterk', 60),
  ('unknown', 'Weet ik niet zeker', 90)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_deviation_authority (code, label_nl, sort_order) VALUES
  ('always', 'Ja, altijd', 10),
  ('usually', 'Meestal', 20),
  ('sometimes', 'Soms', 30),
  ('hardly', 'Vrijwel niet', 40),
  ('not_applicable', 'Niet van toepassing', 80),
  ('unknown', 'Weet ik niet zeker', 90)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_people_impact (code, label_nl, sort_order) VALUES
  ('none_visible', 'Geen directe invloed op personen zichtbaar', 10),
  ('customers_or_clients', 'Kan klanten, clienten of inwoners raken', 20),
  ('employees_or_candidates', 'Kan medewerkers of kandidaten raken', 30),
  ('important_decision', 'Kan een belangrijk advies of besluit beinvloeden', 40),
  ('unknown', 'Weet ik niet zeker', 90)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_ai_transparency (code, label_nl, sort_order) VALUES
  ('yes', 'Ja', 10),
  ('sometimes', 'Soms', 20),
  ('no', 'Nee', 30),
  ('not_relevant', 'Niet relevant', 80),
  ('unknown_relevance', 'Ik weet niet wanneer dat relevant is', 90)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_value_type (code, label_nl, sort_order) VALUES
  ('time_saving', 'Tijdwinst', 10),
  ('first_quality', 'Betere eerste opzet', 20),
  ('final_quality', 'Betere eindkwaliteit', 30),
  ('workload_reduction', 'Lagere werkdruk', 40),
  ('faster_service', 'Snellere interne of klantdienstverlening', 50),
  ('new_capability', 'Nieuwe mogelijkheid', 60),
  ('no_clear_value', 'Geen duidelijke waarde zichtbaar', 80),
  ('negative_effect', 'Levert juist extra werk of risico op', 90)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_value_beneficiary (code, label_nl, sort_order) VALUES
  ('respondent', 'Voor mijzelf in mijn werk', 10),
  ('team', 'Voor het team', 20),
  ('customers_or_clients', 'Voor klanten, clienten of inwoners', 30),
  ('organization', 'Voor de organisatie als geheel', 40),
  ('unclear_or_shifted_work', 'Onduidelijk of werk verschuift vooral naar anderen', 80)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_net_effect (code, label_nl, sort_order) VALUES
  ('clearly_positive', 'Duidelijk positief', 10),
  ('somewhat_positive', 'Enigszins positief', 20),
  ('neutral', 'Ongeveer gelijk', 30),
  ('mixed', 'Gemengd: winst maar ook extra controle of herstelwerk', 40),
  ('negative', 'Eerder negatief', 50),
  ('unknown', 'Weet ik niet zeker', 90)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_control_rework (code, label_nl, sort_order) VALUES
  ('little', 'Weinig extra controle of herstelwerk', 10),
  ('normal', 'Normale controle zoals bij ander werk', 20),
  ('substantial', 'Aanzienlijke controle of correctie nodig', 30),
  ('often_rework', 'Regelmatig herstelwerk nodig', 40),
  ('unknown', 'Weet ik niet zeker', 90)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_shareability (code, label_nl, sort_order) VALUES
  ('yes_same_task', 'Ja, voor collega''s met dezelfde taak', 10),
  ('maybe_with_conditions', 'Misschien, maar alleen met voorwaarden', 20),
  ('no_context_specific', 'Nee, te context- of persoonsgebonden', 30),
  ('unknown', 'Weet ik niet zeker', 90)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_condition_need (code, label_nl, sort_order) VALUES
  ('clear_data_rules', 'Duidelijkere gegevensregels', 10),
  ('business_tooling', 'Zakelijke tooling of licentie', 20),
  ('better_output_control', 'Betere outputcontrole', 30),
  ('clear_ownership', 'Duidelijk eigenaarschap', 40),
  ('supplier_information', 'Leveranciersinformatie', 50),
  ('transparency_agreements', 'Transparantieafspraken', 60),
  ('training_support', 'Training of ondersteuning', 70),
  ('specialist_review', 'Specialistische beoordeling', 80),
  ('nothing_visible', 'Niets aanvullends zichtbaar', 90),
  ('unknown', 'Weet ik niet zeker', 100)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_near_miss_signal (code, label_nl, sort_order) VALUES
  ('none', 'Nee', 10),
  ('incorrect_or_invented', 'Onjuiste of verzonnen informatie', 20),
  ('biased_or_unwanted', 'Ongewenste of bevooroordeelde output', 30),
  ('sensitive_data_entered', 'Gevoelige informatie ingevoerd', 40),
  ('wrong_account_environment', 'Verkeerd account of verkeerde omgeving', 50),
  ('output_almost_used_wrongly', 'Output bijna onjuist gebruikt', 60),
  ('other', 'Anders', 80),
  ('prefer_not_to_answer', 'Wil ik niet beantwoorden', 90)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_escalation_route_awareness (code, label_nl, sort_order) VALUES
  ('clear', 'Ja, dat is duidelijk', 10),
  ('partial', 'Gedeeltelijk', 20),
  ('not_clear', 'Nee', 30),
  ('no_owner_visible', 'Er is volgens mij geen aangewezen eigenaar', 40),
  ('unknown', 'Weet ik niet zeker', 90)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_skill_domain (code, label_nl, sort_order) VALUES
  ('data_use', 'Veilig gegevensgebruik', 10),
  ('output_check', 'Outputcontrole', 20),
  ('hallucination_bias', 'Hallucinaties en bias herkennen', 30),
  ('transparency', 'Transparantie over AI-gebruik', 40),
  ('human_oversight', 'Menselijk toezicht en afwijken', 50),
  ('supplier_awareness', 'Leveranciers- en toolbewustzijn', 60),
  ('escalation', 'Escaleren bij twijfel', 70)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

INSERT INTO public.ref_skill_response (code, label_nl, sort_order) VALUES
  ('preferred_action', 'Voorkeursactie of veilige handelingskeuze', 10),
  ('partial_action', 'Deels passende handelingskeuze', 20),
  ('risky_action', 'Risicovolle handelingskeuze', 30),
  ('does_not_know', 'Weet niet wat te doen', 40),
  ('not_applicable', 'Niet van toepassing', 80)
ON CONFLICT (code) DO UPDATE SET label_nl = EXCLUDED.label_nl, sort_order = EXCLUDED.sort_order;

-- -----------------------------------------------------------------------------
-- AI-Foto application-level survey records
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.survey_application (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_run_id uuid NOT NULL REFERENCES public.survey_run(id) ON DELETE CASCADE,
  survey_tool_id uuid NOT NULL REFERENCES public.survey_tool(id) ON DELETE CASCADE,
  survey_tool_use_case_id uuid REFERENCES public.survey_tool_use_case(id) ON DELETE SET NULL,
  depth_rank text NOT NULL DEFAULT 'primary',
  task_description_limited text,
  application_frequency_code text REFERENCES public.ref_application_frequency(code),
  account_environment_code text REFERENCES public.ref_application_account_environment(code),
  output_destination_code text REFERENCES public.ref_output_destination(code),
  output_control_code text REFERENCES public.ref_output_control(code),
  deviation_authority_code text REFERENCES public.ref_deviation_authority(code),
  people_impact_code text REFERENCES public.ref_people_impact(code),
  transparency_code text REFERENCES public.ref_ai_transparency(code),
  beneficiary_code text REFERENCES public.ref_value_beneficiary(code),
  net_effect_code text REFERENCES public.ref_net_effect(code),
  control_rework_code text REFERENCES public.ref_control_rework(code),
  shareability_code text REFERENCES public.ref_shareability(code),
  escalation_route_awareness_code text REFERENCES public.ref_escalation_route_awareness(code),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_application_depth_rank_check
    CHECK (depth_rank IN ('primary', 'secondary')),
  CONSTRAINT survey_application_task_description_length_check
    CHECK (task_description_limited IS NULL OR length(task_description_limited) <= 500),
  CONSTRAINT survey_application_unique_depth
    UNIQUE (survey_run_id, depth_rank)
);

CREATE INDEX IF NOT EXISTS idx_survey_application_run
  ON public.survey_application(survey_run_id);

CREATE INDEX IF NOT EXISTS idx_survey_application_tool
  ON public.survey_application(survey_tool_id);

CREATE INDEX IF NOT EXISTS idx_survey_application_use_case
  ON public.survey_application(survey_tool_use_case_id);

CREATE TABLE IF NOT EXISTS public.survey_application_data_type (
  survey_application_id uuid NOT NULL REFERENCES public.survey_application(id) ON DELETE CASCADE,
  data_type_code text NOT NULL REFERENCES public.ref_data_type(code),
  PRIMARY KEY (survey_application_id, data_type_code)
);

CREATE TABLE IF NOT EXISTS public.survey_application_value_type (
  survey_application_id uuid NOT NULL REFERENCES public.survey_application(id) ON DELETE CASCADE,
  value_type_code text NOT NULL REFERENCES public.ref_value_type(code),
  PRIMARY KEY (survey_application_id, value_type_code)
);

CREATE TABLE IF NOT EXISTS public.survey_application_condition_need (
  survey_application_id uuid NOT NULL REFERENCES public.survey_application(id) ON DELETE CASCADE,
  condition_need_code text NOT NULL REFERENCES public.ref_condition_need(code),
  PRIMARY KEY (survey_application_id, condition_need_code)
);

CREATE TABLE IF NOT EXISTS public.survey_application_near_miss_signal (
  survey_application_id uuid NOT NULL REFERENCES public.survey_application(id) ON DELETE CASCADE,
  near_miss_signal_code text NOT NULL REFERENCES public.ref_near_miss_signal(code),
  PRIMARY KEY (survey_application_id, near_miss_signal_code)
);

CREATE TABLE IF NOT EXISTS public.survey_application_support_need (
  survey_application_id uuid NOT NULL REFERENCES public.survey_application(id) ON DELETE CASCADE,
  support_need_code text NOT NULL REFERENCES public.ref_support_need(code),
  PRIMARY KEY (survey_application_id, support_need_code)
);

CREATE TABLE IF NOT EXISTS public.survey_application_skill_response (
  survey_application_id uuid NOT NULL REFERENCES public.survey_application(id) ON DELETE CASCADE,
  skill_domain_code text NOT NULL REFERENCES public.ref_skill_domain(code),
  skill_response_code text NOT NULL REFERENCES public.ref_skill_response(code),
  PRIMARY KEY (survey_application_id, skill_domain_code)
);

-- Cross-run integrity: an application must point to a tool and use-case from
-- the same survey run. The use-case may be null for staged/partial saves.
CREATE OR REPLACE FUNCTION public.validate_survey_application()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tool_run uuid;
  v_use_case_tool uuid;
BEGIN
  SELECT survey_run_id
    INTO v_tool_run
    FROM public.survey_tool
   WHERE id = NEW.survey_tool_id;

  IF v_tool_run IS NULL THEN
    RAISE EXCEPTION 'survey_tool_not_found';
  END IF;

  IF v_tool_run IS DISTINCT FROM NEW.survey_run_id THEN
    RAISE EXCEPTION 'survey_application_tool_run_mismatch';
  END IF;

  IF NEW.survey_tool_use_case_id IS NOT NULL THEN
    SELECT survey_tool_id
      INTO v_use_case_tool
      FROM public.survey_tool_use_case
     WHERE id = NEW.survey_tool_use_case_id;

    IF v_use_case_tool IS NULL THEN
      RAISE EXCEPTION 'survey_tool_use_case_not_found';
    END IF;

    IF v_use_case_tool IS DISTINCT FROM NEW.survey_tool_id THEN
      RAISE EXCEPTION 'survey_application_use_case_tool_mismatch';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_survey_application ON public.survey_application;
CREATE TRIGGER trg_validate_survey_application
  BEFORE INSERT OR UPDATE ON public.survey_application
  FOR EACH ROW EXECUTE FUNCTION public.validate_survey_application();

-- Helper for RLS checks on application child tables.
CREATE OR REPLACE FUNCTION public.survey_application_run(_application_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT survey_run_id
    FROM public.survey_application
   WHERE id = _application_id;
$$;

REVOKE ALL ON FUNCTION public.survey_application_run(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.survey_application_run(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- RLS and grants
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT unnest(ARRAY[
      'ref_application_frequency',
      'ref_application_account_environment',
      'ref_output_destination',
      'ref_output_control',
      'ref_deviation_authority',
      'ref_people_impact',
      'ref_ai_transparency',
      'ref_value_type',
      'ref_value_beneficiary',
      'ref_net_effect',
      'ref_control_rework',
      'ref_shareability',
      'ref_condition_need',
      'ref_near_miss_signal',
      'ref_escalation_route_awareness',
      'ref_skill_domain',
      'ref_skill_response'
    ]) AS tname
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tname);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', r.tname);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated;', r.tname);

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

ALTER TABLE public.survey_application ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_application_data_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_application_value_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_application_condition_need ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_application_near_miss_signal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_application_support_need ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_application_skill_response ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.survey_application,
  public.survey_application_data_type,
  public.survey_application_value_type,
  public.survey_application_condition_need,
  public.survey_application_near_miss_signal,
  public.survey_application_support_need,
  public.survey_application_skill_response
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.survey_application,
  public.survey_application_data_type,
  public.survey_application_value_type,
  public.survey_application_condition_need,
  public.survey_application_near_miss_signal,
  public.survey_application_support_need,
  public.survey_application_skill_response
TO authenticated;

DROP POLICY IF EXISTS survey_application_select ON public.survey_application;
CREATE POLICY survey_application_select ON public.survey_application
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(public.survey_run_org(survey_run_id))
  );

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT unnest(ARRAY[
      'survey_application_data_type',
      'survey_application_value_type',
      'survey_application_condition_need',
      'survey_application_near_miss_signal',
      'survey_application_support_need',
      'survey_application_skill_response'
    ]) AS tname
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', r.tname || '_select', r.tname);
    EXECUTE format($p$
      CREATE POLICY %I ON public.%I
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin(auth.uid())
        OR public.is_org_admin_or_dpo_for(
          public.survey_run_org(public.survey_application_run(survey_application_id))
        )
      );
    $p$, r.tname || '_select', r.tname);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Respondent RPC for AI-Foto application-level saves
-- -----------------------------------------------------------------------------

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
    transparency_code,
    beneficiary_code,
    net_effect_code,
    control_rework_code,
    shareability_code,
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
    NULLIF(p_payload->>'transparency_code', ''),
    NULLIF(p_payload->>'beneficiary_code', ''),
    NULLIF(p_payload->>'net_effect_code', ''),
    NULLIF(p_payload->>'control_rework_code', ''),
    NULLIF(p_payload->>'shareability_code', ''),
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
    transparency_code = EXCLUDED.transparency_code,
    beneficiary_code = EXCLUDED.beneficiary_code,
    net_effect_code = EXCLUDED.net_effect_code,
    control_rework_code = EXCLUDED.control_rework_code,
    shareability_code = EXCLUDED.shareability_code,
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

REVOKE ALL ON FUNCTION public.save_survey_application(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_survey_application(uuid, text, jsonb) TO anon, authenticated;

COMMIT;
