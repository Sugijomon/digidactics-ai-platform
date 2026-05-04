-- =============================================================================
-- Shadow AI Scan V8.1 — Target Schema (CONCEPT v2)
-- =============================================================================
-- Doel: schoon V8.1-productieschema voor de nieuwe Next.js + Supabase build.
-- Dit is een CONCEPT — niet uitvoeren zonder review.
--
-- Wijzigingen v2 (zie v8_1_target_schema_changes.md voor volledige changelog):
--   1. report_exports uitgebreid met audit-/governance-velden (storage-pad,
--      retention, scoring/policy snapshot referenties, suppressed cells, status).
--   2. tools_library.tool_code: comment uitgebreid met backfill-strategie.
--   3. risk_result(_tool) uitgebreid met scoring_config_id, raw_exposure_score,
--      priority_score_raw, dpo_review_required, tier-banding, review_threshold,
--      min_cell_size, score_breakdown en policy-snapshot verwijzing.
--   4. ambassador_email verhuisd naar aparte tabel survey_run_ambassador_opt_in.
--   5. calculate_v8_score expliciet SECURITY DEFINER + verbod op client-scoring.
--   6. scan_scoring_config versioneerbaar (geen UNIQUE op org_id; partial unique
--      index op is_active).
--   7. organizations + profiles als minimale dependency-stubs opgenomen.
--
-- Bronnen:
--   • src/lib/shadowSurveyEngineV8.ts (persistente schrijflaag)
--   • src/lib/v8ScoreEngine.ts        (scorelogica, leest dezelfde tabellen)
--   • Shadow_AI_Scan_Scoring_V8_1.md  (scoredefinitie)
--   • database-schema-shadow-ai.md    (datamodel, leidend)
--   • v8_1_mapping_report.md          (legacy → V8.1 mapping)
--
-- Conventies:
--   • Alle tabellen in schema `public`.
--   • UUID primary keys, gen_random_uuid().
--   • Multi-tenant via org_id; RLS op elke tabel (policies in apart bestand).
--   • Reference-tabellen (`ref_*`) zijn platform-globaal (org_id NULL toegestaan).
--   • Code-kolommen (snake_case strings) i.p.v. enums → uitbreidbaar zonder DDL.
--   • Validatie via TRIGGERS, niet CHECK constraints (i.v.m. immutability-issue).
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
-- V8.1 hergebruikt deze tabellen uit de bestaande Lovable-database.
-- In een greenfield-deployment moeten ze minimaal de hieronder genoemde velden
-- bezitten. CREATE IF NOT EXISTS zorgt dat dit script idempotent is binnen
-- een lege database, maar raakt een bestaande tabel niet aan.

CREATE TABLE IF NOT EXISTS public.organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  plan_type     text NOT NULL DEFAULT 'shadow_only',  -- shadow_only|routeai|both
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY,                     -- = auth.users.id (geen FK; zie conventie)
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
-- Alle vragenlijst-codes zijn data, geen enum. Dat geeft vertaalbaarheid (locale)
-- en uitbreidbaarheid zonder migratie. Eén ref_* tabel per dimensie.

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
--      • lowercase, NFKD-normalisatie, accenten strippen
--      • niet-alfanumeriek → '-'; collapse herhaalde '-'; trim leading/trailing
--      • voorbeeld: "ChatGPT (OpenAI)" → "chatgpt-openai"
--   2. Collision handling: bij duplicate key suffix '-2', '-3', ... toevoegen.
--   3. tool_code is IMMUTABLE na eerste gebruik in survey_tool / org_tool_policy
--      / risk_result_tool. Hernoemen breekt historische snapshots.
--   4. Wijziging van tool_name beïnvloedt tool_code NIET (blijft gefixeerd).
--   5. Een trigger op UPDATE tools_library moet wijziging van tool_code
--      blokkeren wanneer er minstens één verwijzende rij bestaat
--      (implementatie in 03_triggers.sql).

CREATE TABLE public.tools_library (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_code         text UNIQUE NOT NULL,         -- stabiele publieke slug
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

-- Versioneerbare scoring-config: meerdere historische rijen per org,
-- maximaal één actief tegelijkertijd (afgedwongen via partial unique index).
-- Snapshots in risk_result en report_exports verwijzen naar de specifieke
-- scoring_config_id die op het scoremoment actief was.
CREATE TABLE public.scan_scoring_config (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scoring_config_key       text NOT NULL,           -- bv. 'default', 'pilot-2026q2'
  methodology_version      text NOT NULL,           -- bv. 'v8.1.0'
  config_json              jsonb NOT NULL DEFAULT '{}'::jsonb, -- weights, thresholds, banding
  dashboard_min_cell_size  int  NOT NULL DEFAULT 5, -- k-anonimiteit
  effective_from           timestamptz NOT NULL DEFAULT now(),
  effective_to             timestamptz,
  is_active                boolean NOT NULL DEFAULT true,
  created_by               uuid,                    -- profiles.id (super_admin/dpo)
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Maximaal één actieve config per org.
CREATE UNIQUE INDEX idx_scan_scoring_config_active_per_org
  ON public.scan_scoring_config(org_id)
  WHERE is_active = true;

CREATE INDEX idx_scan_scoring_config_org_effective
  ON public.scan_scoring_config(org_id, effective_from DESC);


-- =============================================================================
-- 4. SURVEY RUN (één per respondent, één per wave)
-- =============================================================================
-- Belangrijk: ambassador-email is verplaatst naar survey_run_ambassador_opt_in
-- (zie sectie 4b) om PII-scope te beperken en RLS te kunnen aanscherpen.

CREATE TABLE public.survey_run (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  wave_id             uuid REFERENCES public.scan_wave(id) ON DELETE SET NULL,
  locale              text NOT NULL DEFAULT 'nl',
  source              text NOT NULL DEFAULT 'web',   -- web|email|qr|api
  started_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,
  -- Booleaanse vlag mag hier blijven (geen PII); e-mail zit in opt-in tabel.
  consent_ambassador  boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_survey_run_org_wave ON public.survey_run(org_id, wave_id);
CREATE INDEX idx_survey_run_completed ON public.survey_run(org_id) WHERE completed_at IS NOT NULL;

-- Trigger: org_id/wave_id immutable na aanmaak.
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
-- Aparte tabel zodat:
--   • PII (email) niet in elke survey_run-query meelift;
--   • RLS strikter is dan op survey_run zelf;
--   • verwijderen van email los kan van scrubben/anonimiseren survey_run.
--
-- RLS placeholder (definitie in 04_rls_policies.sql):
--   • SELECT/INSERT/UPDATE/DELETE: alleen super_admin OF
--     (org_admin/dpo voor eigen org).
--   • Geen anon/respondent-toegang na insert (write-once vanuit edge function).
--   • Respondent kan via edge function eigen opt-in registreren; daarna geen
--     directe SELECT meer.

CREATE TABLE public.survey_run_ambassador_opt_in (
  survey_run_id     uuid PRIMARY KEY REFERENCES public.survey_run(id) ON DELETE CASCADE,
  org_id            uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email             text NOT NULL,
  consent_given_at  timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ambassador_optin_org ON public.survey_run_ambassador_opt_in(org_id);

-- Validatie: email niet leeg, en survey_run.consent_ambassador moet true zijn.
CREATE OR REPLACE FUNCTION public.validate_ambassador_opt_in()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_consent boolean;
BEGIN
  IF NEW.email IS NULL OR length(trim(NEW.email)) = 0 THEN
    RAISE EXCEPTION 'email is verplicht voor ambassador opt-in';
  END IF;
  SELECT consent_ambassador INTO v_consent
    FROM public.survey_run WHERE id = NEW.survey_run_id;
  IF v_consent IS NOT TRUE THEN
    RAISE EXCEPTION 'survey_run.consent_ambassador moet true zijn voor opt-in';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_ambassador_opt_in
  BEFORE INSERT OR UPDATE ON public.survey_run_ambassador_opt_in
  FOR EACH ROW EXECUTE FUNCTION public.validate_ambassador_opt_in();


-- =============================================================================
-- 5. SURVEY PROFILE (1:1 met survey_run, alle "single-choice"-antwoorden)
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
-- 7. SURVEY TOOLS (per gekozen tool een rij + nested use-cases/contexts)
-- =============================================================================

CREATE TABLE public.survey_tool (
  id                                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_run_id                     uuid NOT NULL REFERENCES public.survey_run(id) ON DELETE CASCADE,
  tool_code                         text REFERENCES public.tools_library(tool_code),
  tool_name                         text NOT NULL,
  is_custom                         boolean NOT NULL DEFAULT false,
  catalog_beheerstatus_code         text REFERENCES public.ref_catalog_beheerstatus(code),
  -- Snapshots t.t.v. invullen (bevriest beleid voor reproduceerbare scoring).
  org_policy_status_code_snapshot   text NOT NULL DEFAULT 'newly_discovered'
                                    REFERENCES public.ref_org_policy_status(code),
  eu_ai_act_flag_code_snapshot      text NOT NULL DEFAULT 'none'
                                    REFERENCES public.ref_eu_ai_act_flag(code),
  -- Verwijzing naar concrete policy-rij die gesnapshotted is (mag NULL bij custom).
  policy_snapshot_id                uuid REFERENCES public.org_tool_policy(id) ON DELETE SET NULL,
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
-- 8. TOOL DISCOVERY (DPO-review queue voor vrije invoer)
-- =============================================================================

CREATE TABLE public.tool_catalog_discovery (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  survey_run_id       uuid NOT NULL REFERENCES public.survey_run(id) ON DELETE CASCADE,
  survey_tool_id      uuid NOT NULL REFERENCES public.survey_tool(id) ON DELETE CASCADE,
  raw_tool_name       text NOT NULL,
  discovery_source    text NOT NULL DEFAULT 'survey',  -- survey|import|integration
  review_status       text NOT NULL DEFAULT 'pending', -- pending|matched|rejected|new_library
  matched_tool_code   text REFERENCES public.tools_library(tool_code),
  reviewed_by         uuid,
  reviewed_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_discovery_org_status ON public.tool_catalog_discovery(org_id, review_status);


-- =============================================================================
-- 9. SCORING RESULTATEN
-- =============================================================================
-- V8.1: scores worden uitsluitend door public.calculate_v8_score(...) gevuld
-- (zie sectie 13). Direct INSERT/UPDATE vanuit clients is verboden — handhaaf
-- via RLS in 04_rls_policies.sql (alleen SECURITY DEFINER function mag schrijven).

CREATE TABLE public.risk_result (
  survey_run_id            uuid PRIMARY KEY REFERENCES public.survey_run(id) ON DELETE CASCADE,
  org_id                   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scoring_config_id        uuid NOT NULL REFERENCES public.scan_scoring_config(id),
  engine_version           text NOT NULL,                  -- bv. 'v8.1.0'
  person_score             numeric(5,2) NOT NULL DEFAULT 0,
  highest_priority_score   numeric(5,2) NOT NULL DEFAULT 0,
  priority_score_raw       numeric(5,2) NOT NULL DEFAULT 0, -- vóór banding/cap
  -- V8.1 banding: standard < review_threshold ≤ priority_review < toxic_shadow
  assigned_tier            text NOT NULL,                  -- standard|priority_review|toxic_shadow
  review_threshold         numeric(5,2),                   -- snapshot uit config
  min_cell_size            int NOT NULL DEFAULT 5,         -- snapshot k-anonimiteit
  dpo_review_required      boolean NOT NULL DEFAULT false,
  review_trigger_codes     text[] NOT NULL DEFAULT '{}',
  scored_at                timestamptz NOT NULL DEFAULT now(),
  -- Volledige score-breakdown (inputs, intermediates, applied weights) voor audit.
  score_breakdown          jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_risk_result_org_tier ON public.risk_result(org_id, assigned_tier);
CREATE INDEX idx_risk_result_dpo_flag ON public.risk_result(org_id) WHERE dpo_review_required = true;

CREATE TABLE public.risk_result_tool (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_run_id       uuid NOT NULL REFERENCES public.survey_run(id) ON DELETE CASCADE,
  survey_tool_id      uuid NOT NULL REFERENCES public.survey_tool(id) ON DELETE CASCADE,
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scoring_config_id   uuid NOT NULL REFERENCES public.scan_scoring_config(id),
  -- Snapshot van policy-context op scoremoment (kan afwijken van survey_tool
  -- snapshot bij rescoring na policy-update).
  policy_snapshot_id  uuid REFERENCES public.org_tool_policy(id) ON DELETE SET NULL,
  shadow_score        numeric(5,2) NOT NULL DEFAULT 0,
  exposure_score      numeric(5,2) NOT NULL DEFAULT 0,
  raw_exposure_score  numeric(5,2) NOT NULL DEFAULT 0,    -- vóór amplifier-cap
  priority_score      numeric(5,2) NOT NULL DEFAULT 0,
  priority_score_raw  numeric(5,2) NOT NULL DEFAULT 0,
  trigger_codes       text[] NOT NULL DEFAULT '{}',
  score_breakdown     jsonb NOT NULL DEFAULT '{}'::jsonb,
  scored_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_run_id, survey_tool_id)
);
CREATE INDEX idx_risk_result_tool_org ON public.risk_result_tool(org_id);


-- =============================================================================
-- 10. REPORT EXPORTS (private Supabase Storage + audit-trail)
-- =============================================================================
-- Bestanden worden opgeslagen in een PRIVATE Storage-bucket.
-- `storage_path` verwijst naar het object-pad (bv. 'reports/<org_id>/<id>.pdf').
-- Downloaden gebeurt uitsluitend via signed URL (createSignedUrl) — er wordt
-- bewust géén publieke URL als bronveld bewaard.
--
-- Auditvelden bevriezen de exact gebruikte configuratie + view-versie zodat
-- een export later forensisch reproduceerbaar is.

CREATE TABLE public.report_exports (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  wave_id                 uuid REFERENCES public.scan_wave(id) ON DELETE SET NULL,
  export_type             text NOT NULL,                 -- pdf_dpo|pdf_board|csv_raw|csv_dictionary
  filters                 jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Storage (private bucket) — geen publieke URL.
  storage_path            text,                          -- 'reports/<org_id>/<id>.<ext>'
  file_size_bytes         bigint,
  row_count               int,

  -- Audit / reproduceerbaarheid
  scoring_config_id       uuid REFERENCES public.scan_scoring_config(id),
  policy_snapshot_id      uuid REFERENCES public.org_tool_policy(id) ON DELETE SET NULL,
  view_or_query_version   text,                          -- bv. 'dpo_risk_clusters@v1.2'
  trigger_codes_used      text[] NOT NULL DEFAULT '{}',
  min_cell_size           int NOT NULL DEFAULT 5,        -- k toegepast in deze export
  k_anonymity_applied     int,                           -- daadwerkelijk gehanteerd k
  suppressed_cell_count   int NOT NULL DEFAULT 0,        -- aantal cellen onderdrukt < k

  -- Lifecycle
  export_status           text NOT NULL DEFAULT 'pending', -- pending|generating|ready|failed|expired|deleted
  created_by              uuid NOT NULL,                 -- profiles.id
  created_at              timestamptz NOT NULL DEFAULT now(),
  expires_at              timestamptz,                   -- harde TTL (signed URL)
  retention_until         timestamptz,                   -- bewaarbeleid (>= expires_at)
  deleted_at              timestamptz
);
CREATE INDEX idx_report_exports_org      ON public.report_exports(org_id, created_at DESC);
CREATE INDEX idx_report_exports_status   ON public.report_exports(org_id, export_status);
CREATE INDEX idx_report_exports_retain   ON public.report_exports(retention_until) WHERE deleted_at IS NULL;


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


-- =============================================================================
-- 12. RLS  (placeholder — definitieve policies in 04_rls_policies.sql)
-- =============================================================================
-- Patroon (consistent met legacy):
--   • super_admin: alles
--   • org_admin / dpo: WHERE org_id = get_user_org_id(auth.uid())
--   • respondent (anon): INSERT eigen survey_run + child rows; geen SELECT op risk_result
--   • risk_result(_tool): WRITE alleen via SECURITY DEFINER calculate_v8_score
--   • survey_run_ambassador_opt_in: alleen super_admin + org_admin/dpo eigen org
--   • report_exports: alleen org_admin/dpo eigen org + super_admin
--   • ref_*: SELECT publiek voor authenticated; WRITE alleen super_admin

ALTER TABLE public.organizations                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools_library                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_tool_policy                   ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.report_exports                    ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 13. SCORING — server-side via SECURITY DEFINER pg_function
-- =============================================================================
-- BELANGRIJK: client-side scoring is in V8.1 NIET TOEGESTAAN voor productie.
--   • De client/edge mag uitsluitend public.calculate_v8_score(...) aanroepen.
--   • Direct INSERT/UPDATE op risk_result(_tool) wordt geblokkeerd door RLS.
--   • Reden: integriteit, audit-trail, en consistentie tussen dashboards en
--     gegenereerde report_exports.
--
-- De function:
--   • leest survey_profile + alle survey_* child-tabellen
--   • leest de actieve scan_scoring_config voor de org en bevriest scoring_config_id
--   • bevriest policy_snapshot_id per tool (komt uit survey_tool of huidige policy
--     bij rescoring; gedrag is configureerbaar via config_json)
--   • berekent per tool: shadow / exposure (raw + capped) / priority + triggers
--   • berekent person_score, assigned_tier (V8.1 banding) en dpo_review_required
--   • UPSERT risk_result + risk_result_tool met volledige score_breakdown
--   • RETURN jsonb met breakdown (zelfde payload die in score_breakdown staat)

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
  -- 1. Lookup survey_run + actieve scan_scoring_config (en log scoring_config_id).
  -- 2. Aggregaties over survey_tool/use_case/context/account/data_type.
  -- 3. Apply weights uit config_json; bereken raw + final scores.
  -- 4. Bepaal triggers (special_category_data, hr_evaluation_context, agentic, ...).
  -- 5. Bepaal banding + dpo_review_required op basis van review_threshold.
  -- 6. UPSERT risk_result + risk_result_tool (incl. score_breakdown jsonb).
  -- 7. RETURN v_result.
  RAISE EXCEPTION 'calculate_v8_score: not yet implemented';
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_v8_score(uuid) FROM PUBLIC;
-- GRANT alleen aan service_role + authenticated (definitief in policies-bestand).

-- =============================================================================
-- EINDE CONCEPT v2
-- =============================================================================
