-- =============================================================================
-- Shadow AI Scan V8.1 — RLS Policies (CONCEPT v1)
-- =============================================================================
-- Bijbehorend schema: v8_1_target_schema.sql (CONCEPT v3)
-- Dit bestand definieert RLS-policies en grants voor alle V8.1-tabellen,
-- inclusief de wrapper-RPC voor mv_risk_clusters.
--
-- Dit is een CONCEPT — niet uitvoeren zonder review.
--
-- Conventies:
--   • RLS via SECURITY DEFINER helperfuncties (geen inline subqueries op
--     dezelfde tabel — voorkomt recursie).
--   • Eén CREATE POLICY per (tabel, operatie, doelgroep). Liever expliciet
--     dan slimme samengestelde policies.
--   • Anonieme respondent: `anon` rol; ingelogde gebruikers: `authenticated`.
--   • Schrijven naar scoring/audit-tabellen uitsluitend via SECURITY DEFINER
--     functions of service_role — never client.
--   • `service_role` bypassed RLS standaard in Supabase; we gebruiken het
--     hier expliciet voor edge functions die respondent-flows orkestreren.
-- =============================================================================


-- =============================================================================
-- 0. HELPERFUNCTIES (placeholders / hergebruik)
-- =============================================================================
-- Hergebruik bestaande Lovable-helpers indien aanwezig. De CREATE OR REPLACE
-- definities hieronder zijn idempotente fallbacks; productie-implementaties
-- staan in de hoofd-DB en MOGEN NIET worden gewijzigd door dit bestand.

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'org_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_dpo(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'dpo');
$$;

-- Combi-helper: caller is org_admin of dpo voor _org_id.
CREATE OR REPLACE FUNCTION public.is_org_admin_or_dpo_for(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND _org_id = public.get_user_org_id(auth.uid())
    AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid()));
$$;

REVOKE ALL ON FUNCTION public.is_org_admin_or_dpo_for(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_admin_or_dpo_for(uuid) TO authenticated, anon;


-- =============================================================================
-- 1. REFERENCE-TABELLEN (ref_*) — read-only voor authenticated, write super_admin
-- =============================================================================
-- Anon krijgt GEEN toegang (respondent-flow gebruikt edge function met service_role
-- die labels server-side ophaalt; voorkomt enumeratie van ongepubliceerde codes).

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
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true);',
                   'ref_select_authenticated_' || r.tname, r.tname);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));',
                   'ref_write_super_admin_' || r.tname, r.tname);
  END LOOP;
END$$;


-- =============================================================================
-- 2. ORGANIZATIONS & PROFILES (dependency stubs — minimaal)
-- =============================================================================
-- Voor zover deze tabellen niet al policies hebben in de bestaande DB.
-- ASSUMPTIE: in productie bestaan hier al policies; onderstaande overschrijft niets
-- (CREATE POLICY faalt bij dubbele naam — gebruik DROP POLICY IF EXISTS bij rerun).

CREATE POLICY org_select_super_admin ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY org_select_own_org ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.get_user_org_id(auth.uid()));

CREATE POLICY profiles_select_self ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_super_admin(auth.uid())
         OR public.is_org_admin_or_dpo_for(org_id));


-- =============================================================================
-- 3. TOOLS_LIBRARY (platform-globaal) + ORG_TOOL_POLICY (org-niveau)
-- =============================================================================

-- tools_library: SELECT voor authenticated; write super_admin.
CREATE POLICY tools_library_select_authenticated ON public.tools_library
  FOR SELECT TO authenticated USING (true);

CREATE POLICY tools_library_write_super_admin ON public.tools_library
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- org_tool_policy: SELECT/WRITE voor org_admin/dpo eigen org + super_admin.
CREATE POLICY otp_select ON public.org_tool_policy
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY otp_insert ON public.org_tool_policy
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY otp_update ON public.org_tool_policy
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY otp_delete ON public.org_tool_policy
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));


-- =============================================================================
-- 3b. ORG_TOOL_POLICY_SNAPSHOT — read DPO/admin, write alleen via SD-function
-- =============================================================================
-- INSERT mag NIET vanuit client-rol; uitsluitend via SECURITY DEFINER functions
-- (calculate_v8_score / capture_policy_snapshot) of service_role.
-- UPDATE/DELETE: NOOIT (append-only — afgedwongen door trigger in schema v3).

CREATE POLICY otps_select ON public.org_tool_policy_snapshot
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

-- Geen INSERT/UPDATE/DELETE policy voor authenticated → alles geblokkeerd.
-- service_role bypassed RLS automatisch.


-- =============================================================================
-- 4. SCAN_WAVE & SCAN_SCORING_CONFIG
-- =============================================================================

CREATE POLICY wave_select ON public.scan_wave
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY wave_write ON public.scan_wave
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

-- scan_wave: anon mag actieve waves NIET zien (lookup gebeurt in edge function
-- via service_role op basis van wave-token).

CREATE POLICY ssc_select ON public.scan_scoring_config
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY ssc_write_super_admin ON public.scan_scoring_config
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- DPO/org_admin mag config LEZEN maar niet schrijven — versionering is
-- methodologische beslissing van platform (super_admin) of via aparte RPC.


-- =============================================================================
-- 5. SURVEY RUN — anonieme respondent insert + read voor admins
-- =============================================================================
-- Respondent-flow wordt georkestreerd door een edge function (service_role).
-- Onderstaande policies laten OOK directe anon-insert toe als fallback voor
-- de in-app web-survey (zonder edge function). Bewuste keuze: respondent ziet
-- alleen eigen run via `id` — geen listing.

-- INSERT: anon én authenticated mogen een nieuwe run aanmaken voor een
-- BESTAANDE org. Geen org-validatie hier mogelijk (anon kent geen org-id);
-- edge function MOET wave_id valideren tegen geheim/token vóór insert.
CREATE POLICY survey_run_insert_public ON public.survey_run
  FOR INSERT TO anon, authenticated
  WITH CHECK (org_id IS NOT NULL);

-- UPDATE: respondent mag eigen run completen. Beperking: alleen wanneer
-- completed_at NULL is (eerst-keer-completen). Cross-tenant onmogelijk omdat
-- ze de id moeten kennen.
-- N.B. een sterkere bescherming vereist een per-run secret of edge-function-only flow;
-- zie open punten.
CREATE POLICY survey_run_update_complete ON public.survey_run
  FOR UPDATE TO anon, authenticated
  USING (completed_at IS NULL)
  WITH CHECK (true);

-- SELECT: alleen super_admin + org_admin/dpo eigen org. Respondent ziet eigen
-- resultaat via aggregaat-RPC die op id+token werkt (geen RLS-route).
CREATE POLICY survey_run_select_admin ON public.survey_run
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

-- DELETE: alleen super_admin (audit-bescherming).
CREATE POLICY survey_run_delete_super_admin ON public.survey_run
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));


-- =============================================================================
-- 5b. SURVEY_RUN_AMBASSADOR_OPT_IN — PII strikt afgeschermd
-- =============================================================================
-- INSERT alleen via edge function (service_role). Geen anon/authenticated INSERT
-- policy → standaard geblokkeerd. UPDATE/DELETE eveneens geblokkeerd voor
-- clients (de-anonimisering moet service-side gebeuren met audit-trail).

CREATE POLICY ambassador_optin_select ON public.survey_run_ambassador_opt_in
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));


-- =============================================================================
-- 6. SURVEY CHILD-TABELLEN — insert door respondent, read door admin
-- =============================================================================
-- Patroon: anonymous mag INSERT zolang de bovenliggende survey_run nog open is
-- (completed_at IS NULL) en bij dezelfde org_id hoort. SELECT alleen voor admins
-- van die org (respondent heeft geen behoefte aan terugleeshuishouding via RLS).

-- Helper voor child-tabel ownership:
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

GRANT EXECUTE ON FUNCTION public.survey_run_is_open(uuid)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.survey_run_org(uuid)      TO anon, authenticated;

-- Macro: identieke policies op alle survey_*-childtabellen die een
-- survey_run_id-kolom hebben.
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
    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR INSERT TO anon, authenticated
        WITH CHECK (public.survey_run_is_open(survey_run_id));
    $p$, 'sc_insert_' || r.tname, r.tname);

    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR UPDATE TO anon, authenticated
        USING (public.survey_run_is_open(survey_run_id))
        WITH CHECK (public.survey_run_is_open(survey_run_id));
    $p$, 'sc_update_' || r.tname, r.tname);

    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
        USING (
          public.is_super_admin(auth.uid())
          OR public.is_org_admin_or_dpo_for(public.survey_run_org(survey_run_id))
        );
    $p$, 'sc_select_' || r.tname, r.tname);

    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
        USING (public.is_super_admin(auth.uid()));
    $p$, 'sc_delete_' || r.tname, r.tname);
  END LOOP;
END$$;

-- survey_tool_use_case + use_case_context + account refereren via survey_tool_id
-- (geen survey_run_id direct). Aparte helper:
CREATE OR REPLACE FUNCTION public.survey_tool_run(_tool_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT survey_run_id FROM public.survey_tool WHERE id = _tool_id LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.survey_tool_run(uuid) TO anon, authenticated;

CREATE POLICY stuc_insert ON public.survey_tool_use_case
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.survey_run_is_open(public.survey_tool_run(survey_tool_id)));

CREATE POLICY stuc_select ON public.survey_tool_use_case
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(public.survey_run_org(public.survey_tool_run(survey_tool_id)))
  );

CREATE POLICY stuc_delete ON public.survey_tool_use_case
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- survey_tool_use_case_context — via survey_tool_use_case
CREATE OR REPLACE FUNCTION public.survey_tool_use_case_run(_uc_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT st.survey_run_id
    FROM public.survey_tool_use_case uc
    JOIN public.survey_tool st ON st.id = uc.survey_tool_id
   WHERE uc.id = _uc_id LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.survey_tool_use_case_run(uuid) TO anon, authenticated;

CREATE POLICY stucc_insert ON public.survey_tool_use_case_context
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.survey_run_is_open(public.survey_tool_use_case_run(survey_tool_use_case_id)));

CREATE POLICY stucc_select ON public.survey_tool_use_case_context
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(public.survey_run_org(public.survey_tool_use_case_run(survey_tool_use_case_id)))
  );

-- survey_tool_account
CREATE POLICY sta_insert ON public.survey_tool_account
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.survey_run_is_open(public.survey_tool_run(survey_tool_id)));

CREATE POLICY sta_update ON public.survey_tool_account
  FOR UPDATE TO anon, authenticated
  USING (public.survey_run_is_open(public.survey_tool_run(survey_tool_id)))
  WITH CHECK (public.survey_run_is_open(public.survey_tool_run(survey_tool_id)));

CREATE POLICY sta_select ON public.survey_tool_account
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(public.survey_run_org(public.survey_tool_run(survey_tool_id)))
  );


-- =============================================================================
-- 7. TOOL_CATALOG_DISCOVERY — DPO review queue
-- =============================================================================

-- INSERT mag tijdens open survey (zelfde regel als overige child-tabellen).
CREATE POLICY tcd_insert ON public.tool_catalog_discovery
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.survey_run_is_open(survey_run_id));

CREATE POLICY tcd_select ON public.tool_catalog_discovery
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY tcd_update ON public.tool_catalog_discovery
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY tcd_delete ON public.tool_catalog_discovery
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));


-- =============================================================================
-- 8. SCORING RESULTATEN — alleen lezen; schrijven via SD-function/service_role
-- =============================================================================

CREATE POLICY rr_select ON public.risk_result
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

-- Geen INSERT/UPDATE/DELETE policy voor authenticated → geblokkeerd.
-- calculate_v8_score (SECURITY DEFINER) en service_role schrijven.

CREATE POLICY rrt_select ON public.risk_result_tool
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));


-- =============================================================================
-- 9. DPO_REVIEW_ITEMS — werkqueue: read+update voor DPO/admin, insert via SD
-- =============================================================================

CREATE POLICY dri_select ON public.dpo_review_items
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

-- DPO/org_admin mag status/decision-velden bijwerken.
-- WITH CHECK: voorkomt dat een UPDATE de rij naar een andere org verplaatst.
CREATE POLICY dri_update ON public.dpo_review_items
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

-- Geen INSERT-policy → uitsluitend SECURITY DEFINER calculate_v8_score of service_role.
-- Geen DELETE-policy → audit-bescherming (status='dismissed' i.p.v. delete).


-- =============================================================================
-- 10. AUDIT_EVENTS — append-only; read voor admin/DPO/super_admin
-- =============================================================================

CREATE POLICY ae_select_super_admin ON public.audit_events
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY ae_select_org ON public.audit_events
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_admin_or_dpo_for(org_id));

-- Geen INSERT-policy voor clients → uitsluitend SD-functions of service_role.
-- UPDATE/DELETE worden bovendien door trigger `protect_audit_events_immutable`
-- geblokkeerd (zie schema v3).


-- =============================================================================
-- 11. REPORT_EXPORTS — read+create voor admin/DPO eigen org
-- =============================================================================
-- Aanmaak gebeurt typisch via een edge function die het bestand genereert,
-- naar de private storage-bucket schrijft en dan de rij invoegt. We staan
-- echter ook directe INSERT toe door org_admin/dpo voor metadata-flows
-- (status='pending' → edge function pikt op).

CREATE POLICY re_select ON public.report_exports
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY re_insert ON public.report_exports
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id))
    AND created_by = auth.uid()
  );

CREATE POLICY re_update ON public.report_exports
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY re_delete ON public.report_exports
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- LET OP: er wordt bewust GEEN publieke-URL-policy geïntroduceerd. Downloads
-- gebeuren via signed URLs op de private storage-bucket; de RLS hierboven
-- regelt alleen de metadata-rij.


-- =============================================================================
-- 12. MV_RISK_CLUSTERS — geen directe grants; wrapper-RPC
-- =============================================================================
-- Materialized views ondersteunen geen RLS. Daarom:
--   • REVOKE alle directe access van de MV.
--   • Bied SECURITY DEFINER RPC `dpo_risk_clusters_v2(p_org_id)` aan die
--     org-filter en min_cell_size-suppressie toepast.

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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min_cell int := 5;
BEGIN
  -- RBAC
  IF NOT (
    public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(p_org_id)
  ) THEN
    RAISE EXCEPTION 'unauthorized: dpo_risk_clusters_v2';
  END IF;

  -- Haal min_cell_size uit actieve scoring-config van deze org.
  SELECT COALESCE(MAX(dashboard_min_cell_size), 5)
    INTO v_min_cell
    FROM public.scan_scoring_config
   WHERE org_id = p_org_id AND is_active = true;

  RETURN QUERY
  SELECT
    mv.score_tier,
    mv.review_class,
    mv.dominant_trigger,
    mv.respondent_count,
    mv.avg_person_score,
    mv.avg_priority,
    mv.first_scored_at,
    mv.last_scored_at
  FROM public.mv_risk_clusters mv
  WHERE mv.org_id = p_org_id
    AND mv.respondent_count >= v_min_cell;
END;
$$;

REVOKE ALL ON FUNCTION public.dpo_risk_clusters_v2(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dpo_risk_clusters_v2(uuid) TO authenticated;


-- =============================================================================
-- 13. SCORING FUNCTION — execute-grants
-- =============================================================================
-- calculate_v8_score is SECURITY DEFINER en moet aanroepbaar zijn vanuit
-- edge functions (service_role) en eventueel vanuit een ingelogde DPO/admin
-- voor handmatige rescoring.

REVOKE ALL ON FUNCTION public.calculate_v8_score(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_v8_score(uuid) TO authenticated;
-- service_role heeft executie standaard.


-- =============================================================================
-- EINDE 04_rls_policies.sql — CONCEPT v1
-- =============================================================================
