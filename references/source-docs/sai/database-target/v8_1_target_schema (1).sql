-- =============================================================================
-- Shadow AI Scan V8.1 — Target Schema (CONCEPT v3)
-- =============================================================================
-- Doel: schoon V8.1-productieschema voor de nieuwe Next.js + Supabase build.
-- Dit is een CONCEPT — niet uitvoeren zonder review.
--
-- Wijzigingen v3 t.o.v. v2 (zie v8_1_target_schema_changes.md voor details):
--   1. Aparte tabel `org_tool_policy_snapshot` toegevoegd (immutable audit-bron).
--      survey_tool / risk_result_tool / report_exports verwijzen daar nu naar
--      i.p.v. naar de mutable `org_tool_policy`.
--   2. risk_result splitst banding in `score_tier` (low|elevated|high|critical)
--      en `review_class` (standard|priority_review|toxic_shadow). assigned_tier
--      verdwijnt. risk_result_tool krijgt een eigen `score_tier_tool`.
--   3. Trigger op `survey_run_ambassador_opt_in` controleert nu ook expliciet
--      dat NEW.org_id = survey_run.org_id (cross-tenant lekprotectie).
--   4. Nieuwe productietabellen: `dpo_review_items`, `audit_events`.
--      Materialized view-stub `mv_risk_clusters` toegevoegd (refresh handmatig).
--   5. Privacy-comment toegevoegd op alle `score_breakdown` jsonb-kolommen:
--      geen vrije tekst, geen raw_tool_name, geen email, geen direct
--      identificeerbare waarden.
--   6. `calculate_v8_score` skelet bijgewerkt: gebruikt org_tool_policy_snapshot,
--      vult score_tier + review_class apart, schrijft dpo_review_items en
--      audit_events.
--
-- Wijzigingen v2 (historie):
--   • report_exports met audit-/governance-velden, private storage_path.
--   • tools_library.tool_code backfill-strategie.
--   • risk_result(_tool) uitgebreid met scoring_config_id, raw scores, breakdown.
--   • ambassador_email verhuisd naar survey_run_ambassador_opt_in.
--   • calculate_v8_score expliciet SECURITY DEFINER + verbod op client-scoring.
--   • scan_scoring_config versioneerbaar (partial unique index op is_active).
--   • organizations + profiles als minimale dependency-stubs.
--
-- Bronnen:
--   • src/lib/shadowSurveyEngineV8.ts (persistente schrijflaag)
--   • src/lib/v8ScoreEngine.ts        (scorelogica)
--   • Shadow_AI_Scan_Scoring_V8_1.md  (scoredefinitie)
--   • database-schema-shadow-ai.md    (datamodel, leidend)
--   • v8_1_mapping_report.md          (legacy → V8.1 mapping)
--
-- Conventies:
--   • Alle tabellen in schema `public`.
--   • UUID primary keys, gen_random_uuid().
--   • Multi-tenant via org_id; RLS op elke tabel (policies in apart bestand).
--   • Reference-tabellen (`ref_*`) zijn platform-globaal.
--   • Code-kolommen i.p.v. enums → uitbreidbaar zonder DDL.
--   • Validatie via TRIGGERS, niet CHECK constraints.
--   • Geen FK naar auth.users; gebruik profiles.id.
-- =============================================================================


-- =============================================================================
-- 0. EXTENSIONS & SHARED HELPERS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- 0b. DEPENDENCY STUBS — organizations & profiles
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  plan_type     text NOT NULL DEFAULT 'shadow_only',  -- shadow_only|routeai|both
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY,
  org_id        uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  email         text,
  full_name     text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);


-- =============================================================================
-- 1. REFERENCE-TABELLEN (codelijsten)
-- =============================================================================

CREATE TABLE public.ref_department (
  code         text PRIMARY KEY,
  label_nl     text NOT NULL,
  label_en     text,
  sort_order   int  NOT NULL DEFAULT 100,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ref_ai_frequency (
  code         text PRIMARY KEY,
  label_nl     text NOT NULL,
  weight       numeric(4,2) NOT NULL DEFAULT 0,
  sort_order   int NOT NULL DEFAULT 100,
  is_active    boolean NOT NULL DEFAULT true
);

CREATE TABLE public.ref_motivation        (code text PRIMARY KEY, label_nl text NOT NULL, allows_other boolean NOT NULL DEFAULT false, sort_order int DEFAULT 100, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.ref_no_ai_reason      (code text PRIMARY KEY, label_nl text NOT NULL, sort_order int DEFAULT 100, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.ref_data_awareness    (code text PRIMARY KEY, label_nl text NOT NULL, awareness_score int NOT NULL DEFAULT 0, sort_order int DEFAULT 100, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.ref_anonymization     (code text PRIMARY KEY, label_nl text NOT NULL, hygiene_score int NOT NULL DEFAULT 0, sort_order int DEFAULT 100, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.ref_browser_extension (code text PRIMARY KEY, label_nl text NOT NULL, exposure_weight numeric(4,2) DEFAULT 0, sort_order int DEFAULT 100, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.ref_automation_usage  (code text PRIMARY KEY, label_nl text NOT NULL, agentic_flag boolean NOT NULL DEFAULT false, sort_order int DEFAULT 100, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.ref_policy_awareness  (code text PRIMARY KEY, label_nl text NOT NULL, sort_order int DEFAULT 100, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.ref_skill_level       (code text PRIMARY KEY, label_nl text NOT NULL, sort_order int DEFAULT 100, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.ref_processing_output (code text PRIMARY KEY, label_nl text NOT NULL, sort_order int DEFAULT 100, is_active boolean NOT NULL DEFAULT true);

CREATE TABLE public.ref_use_case (
  code              text PRIMARY KEY,
  label_nl          text NOT NULL,
  ai_act_archetype  text,
  trigger_codes     text[] NOT NULL DEFAULT '{}',
  sort_order        int DEFAULT 100,
  is_active         boolean NOT NULL DEFAULT true
);

CREATE TABLE public.ref_context (
  code              text PRIMARY KEY,
  label_nl          text NOT NULL,
  exposure_weight   numeric(4,2) NOT NULL DEFAULT 0,
  shadow_weight     numeric(4,2) NOT NULL DEFAULT 0,
  trigger_codes     text[] NOT NULL DEFAULT '{}',
  sort_order        int DEFAULT 100,
  is_active         boolean NOT NULL DEFAULT true
);

CREATE TABLE public.ref_account_type (
  code              text PRIMARY KEY,
  label_nl          text NOT NULL,
  is_personal       boolean NOT NULL DEFAULT false,
  shadow_weight     numeric(4,2) NOT NULL DEFAULT 0,
  sort_order        int DEFAULT 100,
  is_active         boolean NOT NULL DEFAULT true
);

CREATE TABLE public.ref_data_type (
  code              text PRIMARY KEY,
  label_nl          text NOT NULL,
  is_special_category   boolean NOT NULL DEFAULT false,
  is_business_confidential boolean NOT NULL DEFAULT false,
  exposure_weight   numeric(4,2) NOT NULL DEFAULT 0,
  sort_order        int DEFAULT 100,
  is_active         boolean NOT NULL DEFAULT true
);

CREATE TABLE public.ref_top_concern        (code text PRIMARY KEY, label_nl text NOT NULL, allows_other boolean DEFAULT false, sort_order int DEFAULT 100, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.ref_support_need       (code text PRIMARY KEY, label_nl text NOT NULL, sort_order int DEFAULT 100, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.ref_preference_reason  (code text PRIMARY KEY, label_nl text NOT NULL, sort_order int DEFAULT 100, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.ref_catalog_beheerstatus (code text PRIMARY KEY, label_nl text NOT NULL, sort_order int DEFAULT 100, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.ref_org_policy_status  (code text PRIMARY KEY, label_nl text NOT NULL, sort_order int DEFAULT 100, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.ref_eu_ai_act_flag     (code text PRIMARY KEY, label_nl text NOT NULL, sort_order int DEFAULT 100, is_active boolean NOT NULL DEFAULT true);


-- =============================================================================
-- 2. TOOL-CATALOGUS (org-niveau policy + platform library)
-- =============================================================================
-- Stabiele tool_code (slug) als publieke sleutel naast UUID-PK.
--
-- BACKFILL-STRATEGIE (eenmalig bij migratie van legacy tools_library):
--   1. tool_code := slugify(name)
--   2. Collision: suffix '-2', '-3', ...
--   3. tool_code IMMUTABLE na eerste gebruik in survey_tool / org_tool_policy
--      / risk_result_tool / org_tool_policy_snapshot.
--   4. Wijziging van tool_name beïnvloedt tool_code NIET.

CREATE TABLE public.tools_library (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_code         text UNIQUE NOT NULL,
  name              text NOT NULL,
  vendor            text,
  category          text,
  description       text,
  logo_url          text,
  default_eu_ai_act_flag_code text REFERENCES public.ref_eu_ai_act_flag(code),
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- LIVE policy — kan op elk moment door org_admin/dpo worden aangepast.
-- Dit is GEEN audit-bron; voor reproduceerbare scoring zie org_tool_policy_snapshot.
CREATE TABLE public.org_tool_policy (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tool_code         text NOT NULL REFERENCES public.tools_library(tool_code) ON DELETE RESTRICT,
  org_policy_status_code text NOT NULL REFERENCES public.ref_org_policy_status(code),
  eu_ai_act_flag_code    text NOT NULL REFERENCES public.ref_eu_ai_act_flag(code) DEFAULT 'none',
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, tool_code)
);
CREATE INDEX idx_org_tool_policy_org ON public.org_tool_policy(org_id);


-- =============================================================================
-- 2b. ORG TOOL POLICY SNAPSHOT — IMMUTABLE AUDIT-BRON
-- =============================================================================
-- Bevriest de policy-context op het moment van gebruik (bij invullen survey of
-- bij scoring/rescoring). Append-only: een rij wordt nooit gewijzigd.
--
-- Reden: org_tool_policy is mutable (DPO kan beleid bijwerken). Voor
-- reproduceerbare scoring en audit MOETEN risk_result_tool / survey_tool /
-- report_exports verwijzen naar een onveranderlijk snapshot, niet naar
-- de live policy-rij.
--
-- `content_hash` = sha256 over (tool_code, org_policy_status_code,
-- eu_ai_act_flag_code, notes) — gebruikt voor de-duplicatie zodat dezelfde
-- effectieve policy slechts één snapshot per org krijgt totdat hij wijzigt.

CREATE TABLE public.org_tool_policy_snapshot (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tool_code                text NOT NULL REFERENCES public.tools_library(tool_code) ON DELETE RESTRICT,
  org_policy_status_code   text NOT NULL REFERENCES public.ref_org_policy_status(code),
  eu_ai_act_flag_code      text NOT NULL REFERENCES public.ref_eu_ai_act_flag(code),
  notes                    text,
  content_hash             text NOT NULL,                      -- sha256 hex
  source_policy_id         uuid REFERENCES public.org_tool_policy(id) ON DELETE SET NULL,
  captured_at              timestamptz NOT NULL DEFAULT now(),
  captured_by              uuid                                -- profiles.id of NULL bij system
);

CREATE INDEX idx_policy_snapshot_org_tool ON public.org_tool_policy_snapshot(org_id, tool_code);
-- De-duplicatie: één snapshot per org+tool+content_hash.
CREATE UNIQUE INDEX uq_policy_snapshot_dedup
  ON public.org_tool_policy_snapshot(org_id, tool_code, content_hash);

-- Trigger: append-only — UPDATE/DELETE blokkeren.
CREATE OR REPLACE FUNCTION public.protect_policy_snapshot_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'org_tool_policy_snapshot is append-only';
END;
$$;

CREATE TRIGGER trg_policy_snapshot_no_update
  BEFORE UPDATE OR DELETE ON public.org_tool_policy_snapshot
  FOR EACH ROW EXECUTE FUNCTION public.protect_policy_snapshot_immutable();


-- =============================================================================
-- 3. SCAN GOLVEN & SCORING-CONFIG (versioneerbaar)
-- =============================================================================

CREATE TABLE public.scan_wave (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name          text NOT NULL,
  starts_at     timestamptz,
  ends_at       timestamptz,
  status        text NOT NULL DEFAULT 'draft',  -- draft|active|closed
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.scan_scoring_config (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scoring_config_key       text NOT NULL,
  methodology_version      text NOT NULL,
  config_json              jsonb NOT NULL DEFAULT '{}'::jsonb,
  dashboard_min_cell_size  int  NOT NULL DEFAULT 5,
  effective_from           timestamptz NOT NULL DEFAULT now(),
  effective_to             timestamptz,
  is_active                boolean NOT NULL DEFAULT true,
  created_by               uuid,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_scan_scoring_config_active_per_org
  ON public.scan_scoring_config(org_id) WHERE is_active = true;

CREATE INDEX idx_scan_scoring_config_org_effective
  ON public.scan_scoring_config(org_id, effective_from DESC);


-- =============================================================================
-- 4. SURVEY RUN
-- =============================================================================

CREATE TABLE public.survey_run (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  wave_id             uuid REFERENCES public.scan_wave(id) ON DELETE SET NULL,
  locale              text NOT NULL DEFAULT 'nl',
  source              text NOT NULL DEFAULT 'web',
  started_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,
  consent_ambassador  boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_survey_run_org_wave ON public.survey_run(org_id, wave_id);
CREATE INDEX idx_survey_run_completed ON public.survey_run(org_id) WHERE completed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_survey_run()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.org_id IS DISTINCT FROM NEW.org_id THEN
      RAISE EXCEPTION 'org_id mag niet wijzigen';
    END IF;
    IF OLD.wave_id IS NOT NULL AND NEW.wave_id IS DISTINCT FROM OLD.wave_id THEN
      RAISE EXCEPTION 'wave_id mag niet wijzigen';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_survey_run
  BEFORE INSERT OR UPDATE ON public.survey_run
  FOR EACH ROW EXECUTE FUNCTION public.validate_survey_run();


-- =============================================================================
-- 4b. SURVEY RUN — AMBASSADOR OPT-IN  (PII geïsoleerd)
-- =============================================================================

CREATE TABLE public.survey_run_ambassador_opt_in (
  survey_run_id     uuid PRIMARY KEY REFERENCES public.survey_run(id) ON DELETE CASCADE,
  org_id            uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email             text NOT NULL,
  consent_given_at  timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ambassador_optin_org ON public.survey_run_ambassador_opt_in(org_id);

-- Validatie:
--   • email niet leeg
--   • survey_run.consent_ambassador = true
--   • NEW.org_id MOET gelijk zijn aan survey_run.org_id (cross-tenant lekprotectie)
CREATE OR REPLACE FUNCTION public.validate_ambassador_opt_in()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_consent boolean;
  v_run_org uuid;
BEGIN
  IF NEW.email IS NULL OR length(trim(NEW.email)) = 0 THEN
    RAISE EXCEPTION 'email is verplicht voor ambassador opt-in';
  END IF;

  SELECT consent_ambassador, org_id INTO v_consent, v_run_org
    FROM public.survey_run WHERE id = NEW.survey_run_id;

  IF v_run_org IS NULL THEN
    RAISE EXCEPTION 'survey_run % bestaat niet', NEW.survey_run_id;
  END IF;

  IF v_consent IS NOT TRUE THEN
    RAISE EXCEPTION 'survey_run.consent_ambassador moet true zijn voor opt-in';
  END IF;

  IF NEW.org_id IS DISTINCT FROM v_run_org THEN
    RAISE EXCEPTION 'org_id (%) komt niet overeen met survey_run.org_id (%) — cross-tenant geblokkeerd',
      NEW.org_id, v_run_org;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_ambassador_opt_in
  BEFORE INSERT OR UPDATE ON public.survey_run_ambassador_opt_in
  FOR EACH ROW EXECUTE FUNCTION public.validate_ambassador_opt_in();


-- =============================================================================
-- 5. SURVEY PROFILE
-- =============================================================================

CREATE TABLE public.survey_profile (
  survey_run_id              uuid PRIMARY KEY REFERENCES public.survey_run(id) ON DELETE CASCADE,
  department_code            text REFERENCES public.ref_department(code),
  department_other_text      text,
  ai_frequency_code          text REFERENCES public.ref_ai_frequency(code),
  no_ai_reason_code          text REFERENCES public.ref_no_ai_reason(code),
  data_awareness_code        text REFERENCES public.ref_data_awareness(code),
  anonymization_behavior_code text REFERENCES public.ref_anonymization(code),
  browser_extension_usage_code text REFERENCES public.ref_browser_extension(code),
  automation_usage_code      text REFERENCES public.ref_automation_usage(code),
  ai_policy_awareness_code   text REFERENCES public.ref_policy_awareness(code),
  ai_skill_level_code        text REFERENCES public.ref_skill_level(code),
  processing_output_code     text REFERENCES public.ref_processing_output(code),
  top_concern_other_text     text,
  future_usecases_text       text,
  updated_at                 timestamptz NOT NULL DEFAULT now()
);


-- =============================================================================
-- 6. SURVEY MULTI-CHOICE TABELLEN
-- =============================================================================

CREATE TABLE public.survey_motivation (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_run_id            uuid NOT NULL REFERENCES public.survey_run(id) ON DELETE CASCADE,
  motivation_code          text NOT NULL REFERENCES public.ref_motivation(code),
  motivation_other_text    text,
  UNIQUE (survey_run_id, motivation_code)
);

CREATE TABLE public.survey_data_type (
  survey_run_id    uuid NOT NULL REFERENCES public.survey_run(id) ON DELETE CASCADE,
  data_type_code   text NOT NULL REFERENCES public.ref_data_type(code),
  PRIMARY KEY (survey_run_id, data_type_code)
);

CREATE TABLE public.survey_top_concern (
  survey_run_id      uuid NOT NULL REFERENCES public.survey_run(id) ON DELETE CASCADE,
  top_concern_code   text NOT NULL REFERENCES public.ref_top_concern(code),
  PRIMARY KEY (survey_run_id, top_concern_code)
);

CREATE TABLE public.survey_support_need (
  survey_run_id      uuid NOT NULL REFERENCES public.survey_run(id) ON DELETE CASCADE,
  support_need_code  text NOT NULL REFERENCES public.ref_support_need(code),
  PRIMARY KEY (survey_run_id, support_need_code)
);

CREATE TABLE public.survey_tool_preference_reason (
  survey_run_id            uuid NOT NULL REFERENCES public.survey_run(id) ON DELETE CASCADE,
  preference_reason_code   text NOT NULL REFERENCES public.ref_preference_reason(code),
  PRIMARY KEY (survey_run_id, preference_reason_code)
);


-- =============================================================================
-- 7. SURVEY TOOLS
-- =============================================================================

CREATE TABLE public.survey_tool (
  id                                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_run_id                     uuid NOT NULL REFERENCES public.survey_run(id) ON DELETE CASCADE,
  tool_code                         text REFERENCES public.tools_library(tool_code),
  tool_name                         text NOT NULL,
  is_custom                         boolean NOT NULL DEFAULT false,
  catalog_beheerstatus_code         text REFERENCES public.ref_catalog_beheerstatus(code),
  -- Snapshots t.t.v. invullen (denormalized voor snelle UI-rendering).
  -- AUDITBRON: policy_snapshot_id verwijst naar onveranderlijke snapshot-rij.
  org_policy_status_code_snapshot   text NOT NULL DEFAULT 'newly_discovered'
                                    REFERENCES public.ref_org_policy_status(code),
  eu_ai_act_flag_code_snapshot      text NOT NULL DEFAULT 'none'
                                    REFERENCES public.ref_eu_ai_act_flag(code),
  policy_snapshot_id                uuid REFERENCES public.org_tool_policy_snapshot(id) ON DELETE RESTRICT,
  created_at                        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_survey_tool_run ON public.survey_tool(survey_run_id);

CREATE TABLE public.survey_tool_use_case (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_tool_id    uuid NOT NULL REFERENCES public.survey_tool(id) ON DELETE CASCADE,
  use_case_code     text NOT NULL REFERENCES public.ref_use_case(code),
  UNIQUE (survey_tool_id, use_case_code)
);

CREATE TABLE public.survey_tool_use_case_context (
  survey_tool_use_case_id  uuid NOT NULL REFERENCES public.survey_tool_use_case(id) ON DELETE CASCADE,
  context_code             text NOT NULL REFERENCES public.ref_context(code),
  PRIMARY KEY (survey_tool_use_case_id, context_code)
);

CREATE TABLE public.survey_tool_account (
  survey_tool_id    uuid PRIMARY KEY REFERENCES public.survey_tool(id) ON DELETE CASCADE,
  account_type_code text NOT NULL REFERENCES public.ref_account_type(code)
);


-- =============================================================================
-- 8. TOOL DISCOVERY
-- =============================================================================

CREATE TABLE public.tool_catalog_discovery (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  survey_run_id       uuid NOT NULL REFERENCES public.survey_run(id) ON DELETE CASCADE,
  survey_tool_id      uuid NOT NULL REFERENCES public.survey_tool(id) ON DELETE CASCADE,
  raw_tool_name       text NOT NULL,
  discovery_source    text NOT NULL DEFAULT 'survey',
  review_status       text NOT NULL DEFAULT 'pending',
  matched_tool_code   text REFERENCES public.tools_library(tool_code),
  reviewed_by         uuid,
  reviewed_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_discovery_org_status ON public.tool_catalog_discovery(org_id, review_status);


-- =============================================================================
-- 9. SCORING RESULTATEN
-- =============================================================================
-- V8.1: scores worden uitsluitend door public.calculate_v8_score(...) gevuld.
-- Direct INSERT/UPDATE vanuit clients is verboden — handhaaf via RLS.
--
-- V8.1 banding splitsing:
--   • score_tier   = kwantitatieve klasse op de score-as
--                    (low | elevated | high | critical)
--   • review_class = procesklasse die de DPO-workflow aanstuurt
--                    (standard | priority_review | toxic_shadow)
-- Beide zijn onafhankelijk: een 'high' score met geen blocking trigger blijft
-- review_class='standard'; een 'low' score met een verboden tool kan toch
-- review_class='toxic_shadow' krijgen.

CREATE TABLE public.risk_result (
  survey_run_id            uuid PRIMARY KEY REFERENCES public.survey_run(id) ON DELETE CASCADE,
  org_id                   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scoring_config_id        uuid NOT NULL REFERENCES public.scan_scoring_config(id),
  engine_version           text NOT NULL,
  person_score             numeric(5,2) NOT NULL DEFAULT 0,
  highest_priority_score   numeric(5,2) NOT NULL DEFAULT 0,
  priority_score_raw       numeric(5,2) NOT NULL DEFAULT 0,

  -- V8.1 banding (gesplitst):
  score_tier               text NOT NULL,                  -- low|elevated|high|critical
  review_class             text NOT NULL DEFAULT 'standard', -- standard|priority_review|toxic_shadow

  review_threshold         numeric(5,2),
  min_cell_size            int NOT NULL DEFAULT 5,
  dpo_review_required      boolean NOT NULL DEFAULT false,
  review_trigger_codes     text[] NOT NULL DEFAULT '{}',
  scored_at                timestamptz NOT NULL DEFAULT now(),

  -- PRIVACY: score_breakdown bevat UITSLUITEND codes, numerieke waarden,
  -- gewichten en aggregaten. NOOIT vrije tekst, raw_tool_name, email, of
  -- direct identificeerbare velden. Vrije-tekstvelden (department_other_text,
  -- top_concern_other_text, future_usecases_text, motivation_other_text,
  -- ambassador_email) MOGEN HIER NIET IN.
  score_breakdown          jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_risk_result_org_score_tier   ON public.risk_result(org_id, score_tier);
CREATE INDEX idx_risk_result_org_review_class ON public.risk_result(org_id, review_class);
CREATE INDEX idx_risk_result_dpo_flag         ON public.risk_result(org_id) WHERE dpo_review_required = true;

CREATE TABLE public.risk_result_tool (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_run_id       uuid NOT NULL REFERENCES public.survey_run(id) ON DELETE CASCADE,
  survey_tool_id      uuid NOT NULL REFERENCES public.survey_tool(id) ON DELETE CASCADE,
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scoring_config_id   uuid NOT NULL REFERENCES public.scan_scoring_config(id),
  -- AUDITBRON: snapshot van policy op scoremoment (immutable).
  policy_snapshot_id  uuid NOT NULL REFERENCES public.org_tool_policy_snapshot(id) ON DELETE RESTRICT,
  shadow_score        numeric(5,2) NOT NULL DEFAULT 0,
  exposure_score      numeric(5,2) NOT NULL DEFAULT 0,
  raw_exposure_score  numeric(5,2) NOT NULL DEFAULT 0,
  priority_score      numeric(5,2) NOT NULL DEFAULT 0,
  priority_score_raw  numeric(5,2) NOT NULL DEFAULT 0,
  -- Kwantitatieve tier per tool — review_class blijft op person-niveau
  -- (één review_class per respondent op risk_result).
  score_tier_tool     text NOT NULL,                       -- low|elevated|high|critical
  trigger_codes       text[] NOT NULL DEFAULT '{}',

  -- PRIVACY: zie comment op risk_result.score_breakdown — geen vrije tekst,
  -- geen raw_tool_name, geen email, geen direct identificeerbare waarden.
  score_breakdown     jsonb NOT NULL DEFAULT '{}'::jsonb,
  scored_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_run_id, survey_tool_id)
);
CREATE INDEX idx_risk_result_tool_org  ON public.risk_result_tool(org_id);
CREATE INDEX idx_risk_result_tool_tier ON public.risk_result_tool(org_id, score_tier_tool);


-- =============================================================================
-- 9b. DPO REVIEW ITEMS — werkqueue voor de DPO
-- =============================================================================
-- Wordt gevuld door calculate_v8_score wanneer review_class != 'standard' OF
-- bij specifieke trigger_codes. Eén open item per (survey_run_id, reason_code).
-- Levenscyclus volledig in deze tabel: status + besluit + tijdstempels.

CREATE TABLE public.dpo_review_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  survey_run_id      uuid NOT NULL REFERENCES public.survey_run(id) ON DELETE CASCADE,
  survey_tool_id     uuid REFERENCES public.survey_tool(id) ON DELETE SET NULL,
  scoring_config_id  uuid NOT NULL REFERENCES public.scan_scoring_config(id),
  policy_snapshot_id uuid REFERENCES public.org_tool_policy_snapshot(id) ON DELETE SET NULL,

  reason_code        text NOT NULL,             -- bv. 'toxic_shadow', 'special_category_data'
  review_class       text NOT NULL,             -- standard|priority_review|toxic_shadow
  trigger_codes      text[] NOT NULL DEFAULT '{}',
  priority_score     numeric(5,2),

  status             text NOT NULL DEFAULT 'open',  -- open|in_review|resolved|dismissed
  decision_code      text,                      -- approved|rejected|escalated|info_requested
  decision_notes     text,
  assigned_to        uuid,                      -- profiles.id (DPO)
  resolved_by        uuid,                      -- profiles.id
  resolved_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  UNIQUE (survey_run_id, reason_code)           -- voorkomt duplicaten bij rescoring
);
CREATE INDEX idx_dpo_review_items_org_status ON public.dpo_review_items(org_id, status);
CREATE INDEX idx_dpo_review_items_assigned   ON public.dpo_review_items(assigned_to) WHERE status IN ('open','in_review');


-- =============================================================================
-- 9c. AUDIT EVENTS — append-only log voor scoring/policy/export-acties
-- =============================================================================
-- Algemene audit-trail los van applicatieve admin_audit_log uit legacy.
-- Geschreven door: calculate_v8_score, policy-snapshot-creatie, report_export-
-- generatie, dpo_review_items state-changes. PRIVACY: actor_id = uuid, geen PII.

CREATE TABLE public.audit_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  event_type      text NOT NULL,                 -- score.calculated|policy.snapshot|export.generated|dpo_review.updated|...
  actor_id        uuid,                          -- profiles.id of NULL bij system
  actor_kind      text NOT NULL DEFAULT 'system',-- system|user|service
  subject_table   text,                          -- bv. 'risk_result'
  subject_id      text,                          -- uuid of composite key als text
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb, -- alleen codes/ids, geen PII
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_events_org_time ON public.audit_events(org_id, created_at DESC);
CREATE INDEX idx_audit_events_type     ON public.audit_events(event_type, created_at DESC);

-- Append-only enforcement.
CREATE OR REPLACE FUNCTION public.protect_audit_events_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

CREATE TRIGGER trg_audit_events_no_update
  BEFORE UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.protect_audit_events_immutable();


-- =============================================================================
-- 9d. RISK CLUSTERS — materialized view (k-anoniem dashboard-aggregaat)
-- =============================================================================
-- Bewuste keuze voor MATERIALIZED VIEW i.p.v. tabel:
--   • Aggregaat over risk_result + risk_result_tool, geen authoritatieve data.
--   • Refresh handmatig door super_admin/dpo of via cron na volledige wave.
--   • Past k-anonimiteit toe (min_cell_size uit scan_scoring_config).
--   • Schema/structuur correspondeert met legacy RPC dpo_risk_clusters().
-- LET OP: RLS werkt niet rechtstreeks op materialized views — wrap voor
-- DPO-toegang in een SECURITY DEFINER view of RPC die org_id filtert.

CREATE MATERIALIZED VIEW public.mv_risk_clusters AS
SELECT
  rr.org_id,
  rr.score_tier,
  rr.review_class,
  COALESCE((rr.review_trigger_codes)[1], 'none')           AS dominant_trigger,
  COUNT(*)::int                                            AS respondent_count,
  AVG(rr.person_score)::numeric(5,2)                       AS avg_person_score,
  AVG(rr.highest_priority_score)::numeric(5,2)             AS avg_priority,
  MIN(rr.scored_at)                                        AS first_scored_at,
  MAX(rr.scored_at)                                        AS last_scored_at
FROM public.risk_result rr
GROUP BY rr.org_id, rr.score_tier, rr.review_class,
         COALESCE((rr.review_trigger_codes)[1], 'none')
WITH NO DATA;

CREATE UNIQUE INDEX idx_mv_risk_clusters_unique
  ON public.mv_risk_clusters(org_id, score_tier, review_class, dominant_trigger);

-- Refresh handmatig: REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_risk_clusters;


-- =============================================================================
-- 10. REPORT EXPORTS (private Supabase Storage + audit-trail)
-- =============================================================================

CREATE TABLE public.report_exports (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  wave_id                 uuid REFERENCES public.scan_wave(id) ON DELETE SET NULL,
  export_type             text NOT NULL,
  filters                 jsonb NOT NULL DEFAULT '{}'::jsonb,

  storage_path            text,
  file_size_bytes         bigint,
  row_count               int,

  -- Audit / reproduceerbaarheid — verwijst naar IMMUTABLE snapshot.
  scoring_config_id       uuid REFERENCES public.scan_scoring_config(id),
  policy_snapshot_id      uuid REFERENCES public.org_tool_policy_snapshot(id) ON DELETE RESTRICT,
  view_or_query_version   text,
  trigger_codes_used      text[] NOT NULL DEFAULT '{}',
  min_cell_size           int NOT NULL DEFAULT 5,
  k_anonymity_applied     int,
  suppressed_cell_count   int NOT NULL DEFAULT 0,

  export_status           text NOT NULL DEFAULT 'pending',
  created_by              uuid NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  expires_at              timestamptz,
  retention_until         timestamptz,
  deleted_at              timestamptz
);
CREATE INDEX idx_report_exports_org    ON public.report_exports(org_id, created_at DESC);
CREATE INDEX idx_report_exports_status ON public.report_exports(org_id, export_status);
CREATE INDEX idx_report_exports_retain ON public.report_exports(retention_until) WHERE deleted_at IS NULL;


-- =============================================================================
-- 11. UPDATED_AT TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_organizations_updated      BEFORE UPDATE ON public.organizations      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated           BEFORE UPDATE ON public.profiles           FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tools_library_updated      BEFORE UPDATE ON public.tools_library      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_org_tool_policy_updated    BEFORE UPDATE ON public.org_tool_policy    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_scan_wave_updated          BEFORE UPDATE ON public.scan_wave          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_scan_scoring_config_updated BEFORE UPDATE ON public.scan_scoring_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_survey_run_updated         BEFORE UPDATE ON public.survey_run         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_survey_profile_updated     BEFORE UPDATE ON public.survey_profile     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_dpo_review_items_updated   BEFORE UPDATE ON public.dpo_review_items   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- 12. RLS  (placeholder — definitieve policies in 04_rls_policies.sql)
-- =============================================================================
-- Patroon:
--   • super_admin: alles
--   • org_admin / dpo: WHERE org_id = get_user_org_id(auth.uid())
--   • respondent (anon): INSERT eigen survey_run + child rows; geen SELECT op risk_result
--   • risk_result(_tool): WRITE alleen via SECURITY DEFINER calculate_v8_score
--   • org_tool_policy_snapshot: INSERT alleen via SECURITY DEFINER (nooit direct)
--   • dpo_review_items: SELECT/UPDATE org_admin/dpo eigen org; INSERT via function
--   • audit_events: INSERT via SECURITY DEFINER; SELECT super_admin + DPO/org_admin eigen org
--   • mv_risk_clusters: GEEN directe access — wrap in SECURITY DEFINER view/RPC
--   • survey_run_ambassador_opt_in: alleen super_admin + org_admin/dpo eigen org
--   • report_exports: alleen org_admin/dpo eigen org + super_admin
--   • ref_*: SELECT publiek voor authenticated; WRITE alleen super_admin

ALTER TABLE public.organizations                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools_library                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_tool_policy                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_tool_policy_snapshot          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_wave                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_scoring_config               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_run                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_run_ambassador_opt_in      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_profile                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_motivation                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_data_type                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_top_concern                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_support_need               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_tool_preference_reason     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_tool                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_tool_use_case              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_tool_use_case_context      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_tool_account               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_catalog_discovery            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_result                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_result_tool                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpo_review_items                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_exports                    ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 13. SCORING — server-side via SECURITY DEFINER pg_function
-- =============================================================================
-- BELANGRIJK: client-side scoring is in V8.1 NIET TOEGESTAAN voor productie.
--   • Client/edge mag uitsluitend public.calculate_v8_score(...) aanroepen.
--   • Direct INSERT/UPDATE op risk_result(_tool) wordt geblokkeerd door RLS.
--
-- Verantwoordelijkheden van deze function (v3):
--   1. Lookup survey_run + actieve scan_scoring_config (bevries scoring_config_id).
--   2. Voor elke survey_tool:
--        a. Bepaal effectieve policy uit org_tool_policy (live).
--        b. Bereken content_hash; zoek of insert in org_tool_policy_snapshot
--           (de-dup via uq_policy_snapshot_dedup) → policy_snapshot_id.
--        c. Aggregaties over use_case/context/account/data_type.
--        d. Apply weights uit config_json; bereken raw + final scores.
--   3. Bepaal triggers (special_category_data, hr_evaluation_context, agentic, …).
--   4. Vul score_tier (low|elevated|high|critical) op basis van score-banding.
--   5. Vul review_class (standard|priority_review|toxic_shadow) op basis van
--      trigger-codes EN score_tier (orthogonale logica — beide kunnen onafhankelijk
--      escaleren).
--   6. UPSERT risk_result + risk_result_tool (met score_breakdown — privacy-
--      regels in sectie 9 strikt naleven).
--   7. Voor elk niet-standard review_class of blocking trigger:
--        UPSERT public.dpo_review_items(survey_run_id, reason_code, …) op
--        unieke (survey_run_id, reason_code). Bestaande open items die niet
--        meer relevant zijn (rescoring) → status = 'dismissed'.
--   8. INSERT public.audit_events:
--        event_type='score.calculated',
--        payload = { engine_version, scoring_config_id, score_tier, review_class,
--                    tool_count, trigger_codes }  -- GEEN PII.
--   9. RETURN jsonb met breakdown (zelfde payload als score_breakdown).

CREATE OR REPLACE FUNCTION public.calculate_v8_score(p_survey_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- TODO: implementatie — zie spec hierboven.
  RAISE EXCEPTION 'calculate_v8_score: not yet implemented';
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_v8_score(uuid) FROM PUBLIC;
-- GRANT alleen aan service_role + authenticated (definitief in policies-bestand).

-- =============================================================================
-- EINDE CONCEPT v3
-- =============================================================================
