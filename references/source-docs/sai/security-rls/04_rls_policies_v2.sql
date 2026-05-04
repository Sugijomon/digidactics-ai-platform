-- =============================================================================
-- Shadow AI Scan V8.1 — RLS Policies (PRODUCTIE-HARD v2)
-- =============================================================================
-- Bijbehorend schema: v8_1_target_schema.sql (CONCEPT v3)
--
-- Doel van deze v2 t.o.v. v1:
--   1. GEEN directe anon writes meer op survey_run/child-tables. In plaats
--      daarvan een submission-token RPC-patroon: edge function maakt run aan,
--      geeft gehashte token terug, vervolgschrijfacties lopen via SD-RPC's
--      die token + run_id valideren.
--   2. tool_catalog_discovery dwingt org_id == survey_run.org_id af (trigger).
--   3. Idempotent: alle CREATE POLICY's via DROP POLICY IF EXISTS.
--   4. Helper-functions worden NIET overschreven indien ze al bestaan in
--      productie. We gebruiken een DO-block met to_regprocedure-checks.
--   5. calculate_v8_score blijft SECURITY DEFINER maar wordt afgeschermd door
--      een wrapper RPC die org-rechten valideert. Direct EXECUTE-grant op de
--      onderliggende function wordt INGETROKKEN voor authenticated.
--   6. Append-only blijft afgedwongen (geen UPDATE/DELETE-policies + triggers
--      uit schema v3).
--   7. mv_risk_clusters: enforcement van min_cell_size in wrapper RPC blijft.
--   8. Bewuste comments per kritieke policy.
--
-- Conventies:
--   • Eén CREATE POLICY per (tabel, operatie). Naamgeving: <prefix>_<op>_<doel>.
--   • Anonieme respondent (`anon`) krijgt UITSLUITEND EXECUTE-rechten op
--     specifieke RPC's. Geen tabel-INSERT/UPDATE/SELECT meer.
--   • `service_role` bypassed RLS — gebruikt door edge functions.
-- =============================================================================


-- =============================================================================
-- 0. HELPERFUNCTIES — non-destructief, alleen aanmaken indien afwezig
-- =============================================================================
-- v1 deed CREATE OR REPLACE op project-helpers (get_user_org_id, is_*).
-- Dat overschrijft de productie-implementatie en is onveilig. We checken eerst.

DO $$
BEGIN
  -- get_user_org_id(uuid)
  IF to_regprocedure('public.get_user_org_id(uuid)') IS NULL THEN
    EXECUTE $f$
      CREATE FUNCTION public.get_user_org_id(_user_id uuid)
      RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $body$
        SELECT org_id FROM public.profiles WHERE id = _user_id LIMIT 1;
      $body$;
    $f$;
  END IF;

  IF to_regprocedure('public.is_super_admin(uuid)') IS NULL THEN
    EXECUTE $f$
      CREATE FUNCTION public.is_super_admin(_user_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $body$
        SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
      $body$;
    $f$;
  END IF;

  IF to_regprocedure('public.is_org_admin(uuid)') IS NULL THEN
    EXECUTE $f$
      CREATE FUNCTION public.is_org_admin(_user_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $body$
        SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'org_admin');
      $body$;
    $f$;
  END IF;

  IF to_regprocedure('public.is_dpo(uuid)') IS NULL THEN
    EXECUTE $f$
      CREATE FUNCTION public.is_dpo(_user_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $body$
        SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'dpo');
      $body$;
    $f$;
  END IF;
END$$;

-- Combi-helper: deze is V8.1-specifiek en mag wel overschreven worden,
-- omdat hij niet door legacy-code wordt gebruikt.
CREATE OR REPLACE FUNCTION public.is_org_admin_or_dpo_for(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND _org_id = public.get_user_org_id(auth.uid())
    AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid()));
$$;

REVOKE ALL ON FUNCTION public.is_org_admin_or_dpo_for(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_org_admin_or_dpo_for(uuid) TO authenticated;
-- Geen GRANT aan anon: anonieme respondent gebruikt SD-RPC's, nooit deze helper.


-- =============================================================================
-- 0b. SUBMISSION-TOKEN MECHANISME — basis voor anon survey writes
-- =============================================================================
-- Probleem v1: anon mag survey_run inserten met alleen een UUID. Iemand die
-- run-id's enumereert kan child-rows toevoegen aan andermans run zolang
-- completed_at = NULL. Onacceptabel.
--
-- Oplossing v2:
--   • Bij survey_run-creatie genereert de DB een geheim submission_token (32 bytes).
--   • Alleen de SHA-256 hash wordt opgeslagen in survey_run.submission_token_hash.
--   • De edge function (service_role) of start-RPC retourneert het cleartext-token
--     éénmalig aan de client.
--   • Alle vervolg-writes lopen via SD-RPC's die (run_id, token) krijgen en
--     hash(token) == submission_token_hash valideren.
--   • Bij completeSurveyRun wordt de hash op NULL gezet (token-burn) zodat
--     hergebruik niet mogelijk is.
--
-- Vereiste schema-aanpassing (mag in v3 schema worden bijgewerkt of via
-- losse migratie; hier idempotent toegevoegd):

ALTER TABLE public.survey_run
  ADD COLUMN IF NOT EXISTS submission_token_hash bytea;

CREATE INDEX IF NOT EXISTS idx_survey_run_submission_token_hash
  ON public.survey_run (submission_token_hash)
  WHERE submission_token_hash IS NOT NULL;

-- Token-validatie helper — STRICT, NULL-safe.
CREATE OR REPLACE FUNCTION public.survey_run_token_valid(_run_id uuid, _token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.survey_run
     WHERE id = _run_id
       AND submission_token_hash IS NOT NULL
       AND completed_at IS NULL
       AND submission_token_hash = digest(_token, 'sha256')
  );
$$;

REVOKE ALL ON FUNCTION public.survey_run_token_valid(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.survey_run_token_valid(uuid, text) TO anon, authenticated;

-- Vereist extensie pgcrypto voor digest(); idempotent.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


-- =============================================================================
-- 1. REFERENCE-TABELLEN — read-only voor authenticated, write super_admin
-- =============================================================================
-- Anon krijgt GEEN directe SELECT. Labels worden door edge function geladen.
-- Reden: voorkomt enumeratie van ongepubliceerde codes en houdt anon
-- attack surface minimaal.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT unnest(ARRAY[
      'ref_department','ref_ai_frequency','ref_motivation','ref_no_ai_reason',
      'ref_data_awareness','ref_anonymization','ref_browser_extension',
      'ref_automation_usage','ref_policy_awareness','ref_skill_level',
      'ref_processing_output','ref_use_case','ref_context','ref_account_type',
      'ref_data_type','ref_top_concern','ref_support_need',
      'ref_preference_reason','ref_catalog_beheerstatus',
      'ref_org_policy_status','ref_eu_ai_act_flag'
    ]) AS tname
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;',
      'ref_select_authenticated_' || r.tname, r.tname);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;',
      'ref_write_super_admin_' || r.tname, r.tname);

    -- Iedere ingelogde gebruiker mag referentielabels lezen (UI-rendering).
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true);',
      'ref_select_authenticated_' || r.tname, r.tname);

    -- Alleen super_admin beheert de canonieke referentiedata.
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR ALL TO authenticated
      USING (public.is_super_admin(auth.uid()))
      WITH CHECK (public.is_super_admin(auth.uid()));$p$,
      'ref_write_super_admin_' || r.tname, r.tname);
  END LOOP;
END$$;


-- =============================================================================
-- 2. ORGANIZATIONS & PROFILES — minimale stubs (alleen toevoegen indien afwezig)
-- =============================================================================
-- BELANGRIJK: in productie bestaan hier waarschijnlijk al policies. We laten
-- bestaande beleidsregels intact en voegen alleen toe wat ontbreekt.

DROP POLICY IF EXISTS v81_org_select_super_admin ON public.organizations;
CREATE POLICY v81_org_select_super_admin ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));
-- Reden: super_admin moet alle organisaties kunnen inspecteren voor support.

DROP POLICY IF EXISTS v81_org_select_own_org ON public.organizations;
CREATE POLICY v81_org_select_own_org ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.get_user_org_id(auth.uid()));
-- Reden: gebruiker mag eigen organisatiegegevens zien voor UI/branding.

DROP POLICY IF EXISTS v81_profiles_select_self ON public.profiles;
CREATE POLICY v81_profiles_select_self ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(org_id)
  );
-- Reden: gebruiker ziet eigen profiel; admin/DPO ziet teamprofielen voor scan-mgmt.


-- =============================================================================
-- 3. TOOLS_LIBRARY (platform) + ORG_TOOL_POLICY (org)
-- =============================================================================

DROP POLICY IF EXISTS tools_library_select_authenticated ON public.tools_library;
CREATE POLICY tools_library_select_authenticated ON public.tools_library
  FOR SELECT TO authenticated USING (true);
-- Reden: catalogus is platform-globaal en niet vertrouwelijk.

DROP POLICY IF EXISTS tools_library_write_super_admin ON public.tools_library;
CREATE POLICY tools_library_write_super_admin ON public.tools_library
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
-- Reden: alleen platformbeheer mag canonieke tool-records muteren.

DROP POLICY IF EXISTS otp_select ON public.org_tool_policy;
CREATE POLICY otp_select ON public.org_tool_policy
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

DROP POLICY IF EXISTS otp_insert ON public.org_tool_policy;
CREATE POLICY otp_insert ON public.org_tool_policy
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

DROP POLICY IF EXISTS otp_update ON public.org_tool_policy;
CREATE POLICY otp_update ON public.org_tool_policy
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

DROP POLICY IF EXISTS otp_delete ON public.org_tool_policy;
CREATE POLICY otp_delete ON public.org_tool_policy
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));
-- Reden: org_admin/dpo bepaalt het beleid voor eigen organisatie; super_admin
-- voor support. Anon heeft hier nooit toegang.


-- =============================================================================
-- 3b. ORG_TOOL_POLICY_SNAPSHOT — read-only voor admin/DPO; insert via SD only
-- =============================================================================
-- Append-only: geen INSERT/UPDATE/DELETE-policy voor authenticated → standaard
-- geblokkeerd. Schrijven uitsluitend via calculate_v8_score / capture_policy_snapshot
-- (beide SECURITY DEFINER) of service_role.

DROP POLICY IF EXISTS otps_select ON public.org_tool_policy_snapshot;
CREATE POLICY otps_select ON public.org_tool_policy_snapshot
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));
-- Reden: snapshots zijn auditbron voor scoring; DPO moet ze kunnen inspecteren.


-- =============================================================================
-- 4. SCAN_WAVE & SCAN_SCORING_CONFIG
-- =============================================================================

DROP POLICY IF EXISTS wave_select ON public.scan_wave;
CREATE POLICY wave_select ON public.scan_wave
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

DROP POLICY IF EXISTS wave_write ON public.scan_wave;
CREATE POLICY wave_write ON public.scan_wave
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));
-- Reden: DPO opent en sluit scan-waves; anon ziet niets (resolution gebeurt
-- in edge function via geheim wave-token).

DROP POLICY IF EXISTS ssc_select ON public.scan_scoring_config;
CREATE POLICY ssc_select ON public.scan_scoring_config
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

DROP POLICY IF EXISTS ssc_write_super_admin ON public.scan_scoring_config;
CREATE POLICY ssc_write_super_admin ON public.scan_scoring_config
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
-- Reden: scoringsmethodologie is platformverantwoordelijkheid; DPO mag lezen
-- voor uitleg/audit, niet schrijven.


-- =============================================================================
-- 5. SURVEY_RUN — geen anon-INSERT meer; flow via SD-RPC start_survey_run
-- =============================================================================
-- v1 stond anon DIRECTE INSERT toe op survey_run mits org_id IS NOT NULL. Dat
-- maakte cross-tenant misbruik triviaal. v2 verwijdert die policy en routeert
-- aanmaak via een edge function/RPC die wave-token valideert en het
-- submission_token_hash zet.

-- Uitdrukkelijk drop van v1-naam:
DROP POLICY IF EXISTS survey_run_insert_public ON public.survey_run;
DROP POLICY IF EXISTS survey_run_update_complete ON public.survey_run;

-- SELECT: alleen super_admin + org_admin/dpo eigen org.
DROP POLICY IF EXISTS survey_run_select_admin ON public.survey_run;
CREATE POLICY survey_run_select_admin ON public.survey_run
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));
-- Reden: PII-vrije runs zijn voor governance-rapportage; respondent zelf
-- gebruikt geen RLS-route maar token-RPC.

DROP POLICY IF EXISTS survey_run_delete_super_admin ON public.survey_run;
CREATE POLICY survey_run_delete_super_admin ON public.survey_run
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));
-- Reden: audit-bescherming. Verwijderen uitsluitend platformbeheer.

-- GEEN INSERT-policy → anon en authenticated kunnen niet rechtstreeks inserten.
-- Aanmaak gebeurt via SD-RPC `start_survey_run(p_wave_token text)` die in een
-- aparte file (06_edge_functions / RPC's) wordt geleverd. Skelet:

CREATE OR REPLACE FUNCTION public.start_survey_run(p_wave_token text)
RETURNS TABLE (run_id uuid, submission_token text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_wave    record;
  v_token   text;
  v_run_id  uuid;
BEGIN
  -- 1. Resolve wave via geheim token (kolom wave_token_hash op scan_wave verwacht).
  SELECT id, org_id
    INTO v_wave
    FROM public.scan_wave
   WHERE wave_token_hash IS NOT NULL
     AND wave_token_hash = digest(p_wave_token, 'sha256')
     AND (closes_at IS NULL OR closes_at > now())
   LIMIT 1;

  IF v_wave.id IS NULL THEN
    RAISE EXCEPTION 'invalid_or_closed_wave';
  END IF;

  -- 2. Genereer submission token (32 bytes → hex).
  v_token := encode(gen_random_bytes(32), 'hex');

  -- 3. Insert run met token-hash.
  INSERT INTO public.survey_run (org_id, wave_id, locale, source, submission_token_hash)
       VALUES (v_wave.org_id, v_wave.id, 'nl', 'web', digest(v_token, 'sha256'))
       RETURNING id INTO v_run_id;

  RETURN QUERY SELECT v_run_id, v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.start_survey_run(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.start_survey_run(text) TO anon, authenticated;
-- Reden: enige route waarmee anon een run kan creëren; vereist geheim
-- wave-token uit invite-link. Geen org_id-leak mogelijk.

-- complete_survey_run: token-gevalideerde afsluitfunctie.
-- Brandt het token (zet hash op NULL) en triggert scoring.
CREATE OR REPLACE FUNCTION public.complete_survey_run(p_run_id uuid, p_token text)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT public.survey_run_token_valid(p_run_id, p_token) THEN
    RAISE EXCEPTION 'invalid_token_or_run_closed';
  END IF;

  UPDATE public.survey_run
     SET completed_at = now(),
         submission_token_hash = NULL  -- token-burn
   WHERE id = p_run_id;

  -- Scoring is fire-and-forget — fouten blokkeren afsluiting niet.
  BEGIN
    PERFORM public.calculate_v8_score(p_run_id);
  EXCEPTION WHEN OTHERS THEN
    -- log via audit_events — niet doorgooien.
    INSERT INTO public.audit_events (org_id, event_type, payload)
    SELECT org_id, 'scoring_failed_in_complete', jsonb_build_object('run_id', p_run_id, 'sqlerrm', SQLERRM)
      FROM public.survey_run WHERE id = p_run_id;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_survey_run(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.complete_survey_run(uuid, text) TO anon, authenticated;


-- =============================================================================
-- 5b. SURVEY_RUN_AMBASSADOR_OPT_IN — PII strikt afgeschermd
-- =============================================================================
-- Geen INSERT/UPDATE/DELETE-policy voor clients. Aanmaak via SD-RPC
-- `set_ambassador_optin(p_run_id, p_token, p_email)` die token-validatie doet
-- en cross-tenant copy voorkomt.

DROP POLICY IF EXISTS ambassador_optin_select ON public.survey_run_ambassador_opt_in;
CREATE POLICY ambassador_optin_select ON public.survey_run_ambassador_opt_in
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));
-- Reden: PII-tabel; alleen org-rollen mogen e-mails inzien. Respondent ziet
-- niets terug (eenrichtingsverkeer).

CREATE OR REPLACE FUNCTION public.set_ambassador_optin(
  p_run_id uuid, p_token text, p_email text
) RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid;
BEGIN
  IF NOT public.survey_run_token_valid(p_run_id, p_token) THEN
    RAISE EXCEPTION 'invalid_token_or_run_closed';
  END IF;
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'email_required';
  END IF;

  SELECT org_id INTO v_org FROM public.survey_run WHERE id = p_run_id;

  INSERT INTO public.survey_run_ambassador_opt_in (survey_run_id, org_id, email)
       VALUES (p_run_id, v_org, lower(trim(p_email)))
  ON CONFLICT (survey_run_id) DO UPDATE
       SET email = EXCLUDED.email,
           consent_given_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_ambassador_optin(uuid, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.set_ambassador_optin(uuid, text, text) TO anon, authenticated;


-- =============================================================================
-- 6. SURVEY CHILD-TABELLEN — geen anon RLS-INSERT; via save_* SD-RPC's
-- =============================================================================
-- v1 had brede `anon, authenticated INSERT` met enkel `survey_run_is_open`.
-- v2 trekt die in en levert SD-RPC's. Hier definiëren we een GENERIC RPC
-- skelet dat per tabel hergebruikt wordt; concrete save_*-RPC's worden in
-- 06_edge_rpcs.sql opgeleverd. Voor nu: SELECT door admin/DPO blijft bestaan,
-- INSERT/UPDATE/DELETE policies worden expliciet gedropt.

-- Drop v1 policies en (her)maak alleen SELECT/DELETE-admin policies.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT unnest(ARRAY[
      'survey_profile','survey_motivation','survey_data_type',
      'survey_top_concern','survey_support_need',
      'survey_tool_preference_reason','survey_tool'
    ]) AS tname
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'sc_insert_' || r.tname, r.tname);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'sc_update_' || r.tname, r.tname);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'sc_select_' || r.tname, r.tname);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'sc_delete_' || r.tname, r.tname);

    -- SELECT voor admin/DPO eigen org.
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
      USING (
        public.is_super_admin(auth.uid())
        OR public.is_org_admin_or_dpo_for(public.survey_run_org(survey_run_id))
      );$p$, 'sc_select_' || r.tname, r.tname);

    -- DELETE alleen super_admin (audit-bescherming).
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
      USING (public.is_super_admin(auth.uid()));$p$, 'sc_delete_' || r.tname, r.tname);
    -- Geen INSERT/UPDATE-policy → schrijven uitsluitend via SD-RPC's en service_role.
  END LOOP;
END$$;

-- Helpers blijven nodig voor de SELECT-policy.
CREATE OR REPLACE FUNCTION public.survey_run_is_open(_run_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.survey_run
     WHERE id = _run_id AND completed_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.survey_run_org(_run_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.survey_run WHERE id = _run_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.survey_run_is_open(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.survey_run_org(uuid)     TO authenticated;
-- Geen GRANT aan anon: anon gebruikt token-RPC's, niet deze helpers.

-- survey_tool_use_case / context / account: idem — v1 policies droppen.
DROP POLICY IF EXISTS stuc_insert  ON public.survey_tool_use_case;
DROP POLICY IF EXISTS stuc_select  ON public.survey_tool_use_case;
DROP POLICY IF EXISTS stuc_delete  ON public.survey_tool_use_case;
DROP POLICY IF EXISTS stucc_insert ON public.survey_tool_use_case_context;
DROP POLICY IF EXISTS stucc_select ON public.survey_tool_use_case_context;
DROP POLICY IF EXISTS sta_insert   ON public.survey_tool_account;
DROP POLICY IF EXISTS sta_update   ON public.survey_tool_account;
DROP POLICY IF EXISTS sta_select   ON public.survey_tool_account;

-- SELECT-policies opnieuw aanmaken voor admin/DPO; geen INSERT/UPDATE voor clients.
CREATE POLICY stuc_select ON public.survey_tool_use_case
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(public.survey_run_org(public.survey_tool_run(survey_tool_id)))
  );

CREATE POLICY stucc_select ON public.survey_tool_use_case_context
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(public.survey_run_org(public.survey_tool_use_case_run(survey_tool_use_case_id)))
  );

CREATE POLICY sta_select ON public.survey_tool_account
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(public.survey_run_org(public.survey_tool_run(survey_tool_id)))
  );

-- Helpers (re-create idempotent — alleen lookups, geen schrijfrechten).
CREATE OR REPLACE FUNCTION public.survey_tool_run(_tool_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT survey_run_id FROM public.survey_tool WHERE id = _tool_id LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.survey_tool_use_case_run(_uc_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT st.survey_run_id
    FROM public.survey_tool_use_case uc
    JOIN public.survey_tool st ON st.id = uc.survey_tool_id
   WHERE uc.id = _uc_id LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.survey_tool_run(uuid)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.survey_tool_use_case_run(uuid) TO authenticated;


-- =============================================================================
-- 7. TOOL_CATALOG_DISCOVERY — DPO review queue + cross-tenant guard
-- =============================================================================
-- v1 stond anon INSERT toe zonder org-validatie, waarmee een aanvaller
-- discovery-rijen op vreemde org kon plaatsen. v2: geen anon-INSERT, en
-- bovendien een trigger die afdwingt dat NEW.org_id == survey_run.org_id.

DROP POLICY IF EXISTS tcd_insert ON public.tool_catalog_discovery;
DROP POLICY IF EXISTS tcd_select ON public.tool_catalog_discovery;
DROP POLICY IF EXISTS tcd_update ON public.tool_catalog_discovery;
DROP POLICY IF EXISTS tcd_delete ON public.tool_catalog_discovery;

CREATE POLICY tcd_select ON public.tool_catalog_discovery
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));
-- Reden: DPO behandelt de queue.

CREATE POLICY tcd_update ON public.tool_catalog_discovery
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));
-- Reden: DPO mag review_status muteren binnen eigen org; cross-tenant move
-- geblokkeerd via WITH CHECK.

CREATE POLICY tcd_delete ON public.tool_catalog_discovery
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));
-- Geen INSERT-policy → uitsluitend via SD-RPC `register_tool_discovery(run_id, token, raw_name)`.

-- Cross-tenant guard: dwing org-consistentie af op alle INSERT/UPDATE.
CREATE OR REPLACE FUNCTION public.tool_catalog_discovery_enforce_org()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_run_org uuid;
BEGIN
  IF NEW.survey_run_id IS NULL THEN
    RAISE EXCEPTION 'tool_catalog_discovery.survey_run_id is verplicht';
  END IF;
  SELECT org_id INTO v_run_org FROM public.survey_run WHERE id = NEW.survey_run_id;
  IF v_run_org IS NULL THEN
    RAISE EXCEPTION 'survey_run % bestaat niet', NEW.survey_run_id;
  END IF;
  IF NEW.org_id IS DISTINCT FROM v_run_org THEN
    RAISE EXCEPTION 'tool_catalog_discovery.org_id (%) komt niet overeen met survey_run.org_id (%)',
      NEW.org_id, v_run_org;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tcd_enforce_org ON public.tool_catalog_discovery;
CREATE TRIGGER trg_tcd_enforce_org
  BEFORE INSERT OR UPDATE OF org_id, survey_run_id ON public.tool_catalog_discovery
  FOR EACH ROW EXECUTE FUNCTION public.tool_catalog_discovery_enforce_org();
-- Reden: defense-in-depth — ook als er ooit per ongeluk een INSERT-policy
-- terugkomt, blijft cross-tenant onmogelijk.


-- =============================================================================
-- 8. RISK_RESULT / RISK_RESULT_TOOL — append-only; alleen SELECT voor admins
-- =============================================================================

DROP POLICY IF EXISTS rr_select  ON public.risk_result;
DROP POLICY IF EXISTS rrt_select ON public.risk_result_tool;

CREATE POLICY rr_select ON public.risk_result
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY rrt_select ON public.risk_result_tool
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));
-- Reden: scoring-output is voor governance-rapportage. Geen INSERT/UPDATE/
-- DELETE-policy → uitsluitend calculate_v8_score (SD) of service_role.
-- Append-only-trigger uit schema v3 blokkeert UPDATE/DELETE bovendien.


-- =============================================================================
-- 9. DPO_REVIEW_ITEMS — werkqueue
-- =============================================================================

DROP POLICY IF EXISTS dri_select ON public.dpo_review_items;
DROP POLICY IF EXISTS dri_update ON public.dpo_review_items;

CREATE POLICY dri_select ON public.dpo_review_items
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY dri_update ON public.dpo_review_items
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));
-- Reden: DPO werkt items af. INSERT alleen via calculate_v8_score (SD);
-- DELETE niet toegestaan — gebruik status='dismissed'.


-- =============================================================================
-- 10. AUDIT_EVENTS — append-only; lezen door admin/DPO/super_admin
-- =============================================================================

DROP POLICY IF EXISTS ae_select_super_admin ON public.audit_events;
DROP POLICY IF EXISTS ae_select_org         ON public.audit_events;

CREATE POLICY ae_select_super_admin ON public.audit_events
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY ae_select_org ON public.audit_events
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_admin_or_dpo_for(org_id));
-- Reden: audit-logs zijn essentieel voor governance-rapportage. INSERT
-- uitsluitend via SD-functions/service_role. UPDATE/DELETE geblokkeerd door
-- trigger `protect_audit_events_immutable` uit schema v3.


-- =============================================================================
-- 11. REPORT_EXPORTS — metadata-CRUD voor admin/DPO eigen org
-- =============================================================================

DROP POLICY IF EXISTS re_select ON public.report_exports;
DROP POLICY IF EXISTS re_insert ON public.report_exports;
DROP POLICY IF EXISTS re_update ON public.report_exports;
DROP POLICY IF EXISTS re_delete ON public.report_exports;

CREATE POLICY re_select ON public.report_exports
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY re_insert ON public.report_exports
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id))
    AND created_by = auth.uid()
  );
-- Reden: voorkomt impersonation; created_by moet de echte caller zijn.

CREATE POLICY re_update ON public.report_exports
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY re_delete ON public.report_exports
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));
-- Reden: bestanden zelf staan in een PRIVATE storage-bucket. Downloads via
-- signed URL. Geen publieke-URL-policy.


-- =============================================================================
-- 12. MV_RISK_CLUSTERS — geen directe grants; wrapper-RPC met k-anonimiteit
-- =============================================================================

REVOKE ALL ON public.mv_risk_clusters FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dpo_risk_clusters_v2(p_org_id uuid)
RETURNS TABLE (
  score_tier        text,
  review_class      text,
  dominant_trigger  text,
  respondent_count  int,
  avg_person_score  numeric,
  avg_priority      numeric,
  first_scored_at   timestamptz,
  last_scored_at    timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_min_cell int := 5;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(p_org_id)) THEN
    RAISE EXCEPTION 'unauthorized: dpo_risk_clusters_v2';
  END IF;

  SELECT COALESCE(MAX(dashboard_min_cell_size), 5)
    INTO v_min_cell
    FROM public.scan_scoring_config
   WHERE org_id = p_org_id AND is_active = true;

  RETURN QUERY
  SELECT
    mv.score_tier, mv.review_class, mv.dominant_trigger,
    mv.respondent_count, mv.avg_person_score, mv.avg_priority,
    mv.first_scored_at, mv.last_scored_at
  FROM public.mv_risk_clusters mv
  WHERE mv.org_id = p_org_id
    AND mv.respondent_count >= v_min_cell;
END;
$$;

REVOKE ALL ON FUNCTION public.dpo_risk_clusters_v2(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.dpo_risk_clusters_v2(uuid) TO authenticated;
-- Reden: MV's ondersteunen geen RLS. Wrapper enforceert org-scope én
-- min_cell_size suppressie (k-anonimiteit).


-- =============================================================================
-- 13. SCORING FUNCTION — afgeschermd via wrapper RPC
-- =============================================================================
-- v1 gaf authenticated direct EXECUTE op calculate_v8_score(uuid). Dat staat
-- toe dat élke ingelogde gebruiker scoring kan triggeren op WILLEKEURIGE
-- run_id, ook van andere orgs. v2 trekt dit in en biedt een wrapper.

REVOKE ALL ON FUNCTION public.calculate_v8_score(uuid) FROM PUBLIC, anon, authenticated;
-- service_role behoudt EXECUTE standaard.

CREATE OR REPLACE FUNCTION public.recalculate_v8_score(p_run_id uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid;
BEGIN
  SELECT org_id INTO v_org FROM public.survey_run WHERE id = p_run_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'run % bestaat niet', p_run_id;
  END IF;
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(v_org)) THEN
    RAISE EXCEPTION 'unauthorized: recalculate_v8_score';
  END IF;
  PERFORM public.calculate_v8_score(p_run_id);

  INSERT INTO public.audit_events (org_id, event_type, payload, actor_user_id)
  VALUES (v_org, 'score_recalculated', jsonb_build_object('run_id', p_run_id), auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_v8_score(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.recalculate_v8_score(uuid) TO authenticated;
-- Reden: handmatige rescoring blijft mogelijk voor DPO/admin/super_admin van
-- de eigen org, maar vereist expliciete RBAC-check + audit-trail.


-- =============================================================================
-- EINDE 04_rls_policies_v2.sql — PRODUCTIE-HARD
-- =============================================================================
