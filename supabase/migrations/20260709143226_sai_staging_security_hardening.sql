-- SAI staging security hardening.
--
-- Purpose:
-- - opt existing projects out of broad public-schema default grants for future
--   objects;
-- - remove accidental direct table access for anon/authenticated roles;
-- - restore only the explicit authenticated grants that are backed by RLS
--   policies;
-- - enable RLS on reference tables that already had policies; and
-- - split super-admin write policies away from SELECT policies to avoid
--   overlapping permissive SELECT policies.
--
-- Respondent-facing writes remain RPC-only. The public survey RPCs keep their
-- EXECUTE grants and continue to validate submission tokens server-side.

BEGIN;

-- Existing Supabase projects may still auto-grant broad privileges to API
-- roles for newly created public objects. Make future exposure opt-in for the
-- API roles used by browser clients. Service-role behavior is left unchanged.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Reference tables are runtime/configuration data. They are readable by
-- authenticated users and writable only by super admins through RLS policies.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT unnest(ARRAY[
      'ref_department',
      'ref_ai_frequency',
      'ref_motivation',
      'ref_no_ai_reason',
      'ref_data_awareness',
      'ref_anonymization',
      'ref_browser_extension',
      'ref_automation_usage',
      'ref_policy_awareness',
      'ref_skill_level',
      'ref_processing_output',
      'ref_use_case',
      'ref_context',
      'ref_account_type',
      'ref_data_type',
      'ref_top_concern',
      'ref_support_need',
      'ref_preference_reason',
      'ref_catalog_beheerstatus',
      'ref_org_policy_status',
      'ref_eu_ai_act_flag'
    ]) AS tname
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tname);

    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', r.tname);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated;', r.tname);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'ref_write_super_admin_' || r.tname, r.tname);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'ref_insert_super_admin_' || r.tname, r.tname);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'ref_update_super_admin_' || r.tname, r.tname);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'ref_delete_super_admin_' || r.tname, r.tname);

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

-- Rebuild SAI table grants from a deny-by-default posture. Anon respondents
-- must use token-validated SECURITY DEFINER RPCs, not direct table endpoints.
REVOKE ALL ON TABLE
  public.organizations,
  public.profiles,
  public.user_roles,
  public.tools_library,
  public.org_tool_policy,
  public.org_tool_policy_snapshot,
  public.scan_wave,
  public.scan_scoring_config,
  public.survey_run,
  public.survey_profile,
  public.survey_motivation,
  public.survey_data_type,
  public.survey_top_concern,
  public.survey_support_need,
  public.survey_tool_preference_reason,
  public.survey_tool,
  public.survey_tool_account,
  public.survey_tool_use_case,
  public.survey_tool_use_case_context,
  public.survey_run_ambassador_opt_in,
  public.tool_catalog_discovery,
  public.risk_result,
  public.risk_result_tool,
  public.dpo_review_items,
  public.audit_events,
  public.report_exports
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.organizations,
  public.profiles,
  public.user_roles,
  public.tools_library,
  public.org_tool_policy,
  public.org_tool_policy_snapshot,
  public.scan_wave,
  public.scan_scoring_config,
  public.survey_run,
  public.survey_profile,
  public.survey_motivation,
  public.survey_data_type,
  public.survey_top_concern,
  public.survey_support_need,
  public.survey_tool_preference_reason,
  public.survey_tool,
  public.survey_tool_account,
  public.survey_tool_use_case,
  public.survey_tool_use_case_context,
  public.tool_catalog_discovery,
  public.risk_result,
  public.risk_result_tool,
  public.dpo_review_items,
  public.audit_events,
  public.report_exports
TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE
  public.user_roles,
  public.tools_library,
  public.org_tool_policy,
  public.scan_wave,
  public.scan_scoring_config,
  public.report_exports
TO authenticated;

GRANT UPDATE ON TABLE public.dpo_review_items TO authenticated;
GRANT UPDATE, DELETE ON TABLE public.tool_catalog_discovery TO authenticated;

-- Replace FOR ALL write policies that overlapped with separate SELECT
-- policies. This keeps the same write intent while removing duplicate
-- permissive SELECT paths.
DROP POLICY IF EXISTS user_roles_write_super_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert_super_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update_super_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete_super_admin ON public.user_roles;

CREATE POLICY user_roles_insert_super_admin ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY user_roles_update_super_admin ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY user_roles_delete_super_admin ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS tools_library_write_super_admin ON public.tools_library;
DROP POLICY IF EXISTS tools_library_insert_super_admin ON public.tools_library;
DROP POLICY IF EXISTS tools_library_update_super_admin ON public.tools_library;
DROP POLICY IF EXISTS tools_library_delete_super_admin ON public.tools_library;

CREATE POLICY tools_library_insert_super_admin ON public.tools_library
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY tools_library_update_super_admin ON public.tools_library
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY tools_library_delete_super_admin ON public.tools_library
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS wave_write ON public.scan_wave;
DROP POLICY IF EXISTS wave_insert_admin ON public.scan_wave;
DROP POLICY IF EXISTS wave_update_admin ON public.scan_wave;
DROP POLICY IF EXISTS wave_delete_admin ON public.scan_wave;

CREATE POLICY wave_insert_admin ON public.scan_wave
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY wave_update_admin ON public.scan_wave
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY wave_delete_admin ON public.scan_wave
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(org_id));

DROP POLICY IF EXISTS ssc_write_super_admin ON public.scan_scoring_config;
DROP POLICY IF EXISTS ssc_insert_super_admin ON public.scan_scoring_config;
DROP POLICY IF EXISTS ssc_update_super_admin ON public.scan_scoring_config;
DROP POLICY IF EXISTS ssc_delete_super_admin ON public.scan_scoring_config;

CREATE POLICY ssc_insert_super_admin ON public.scan_scoring_config
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY ssc_update_super_admin ON public.scan_scoring_config
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY ssc_delete_super_admin ON public.scan_scoring_config
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- These tables intentionally have no API role grants after hardening. Remove
-- stale policies so the policy catalog does not suggest a direct API path that
-- no longer exists.
DROP POLICY IF EXISTS ambassador_optin_select ON public.survey_run_ambassador_opt_in;
DROP POLICY IF EXISTS survey_run_delete_super_admin ON public.survey_run;

-- Existing SECURITY DEFINER functions may still have inherited PUBLIC execute
-- grants from older/default project privileges. Treat public functions as an
-- explicit API surface: respondent RPCs remain callable by anon/authenticated;
-- dashboard/RLS helpers remain authenticated-only; internal scoring/token
-- helpers and auth triggers are not directly callable by API roles.
DO $$
DECLARE
  r record;
  public_rpc_signatures text[] := ARRAY[
    'complete_survey_run(p_run_id uuid, p_token text)',
    'register_tool_discovery(p_run_id uuid, p_token text, p_survey_tool_id uuid, p_raw_tool_name text)',
    'save_concerns(p_run_id uuid, p_token text, p_codes jsonb)',
    'save_data_types(p_run_id uuid, p_token text, p_codes jsonb)',
    'save_motivations(p_run_id uuid, p_token text, p_items jsonb)',
    'save_profile(p_run_id uuid, p_token text, p_payload jsonb)',
    'save_support_needs(p_run_id uuid, p_token text, p_codes jsonb)',
    'save_tool(p_run_id uuid, p_token text, p_payload jsonb)',
    'save_tool_account(p_run_id uuid, p_token text, p_survey_tool_id uuid, p_account_type_code text)',
    'save_tool_preference_reasons(p_run_id uuid, p_token text, p_codes jsonb)',
    'save_tool_use_case(p_run_id uuid, p_token text, p_survey_tool_id uuid, p_use_case_code text)',
    'save_tool_use_case_context(p_run_id uuid, p_token text, p_survey_tool_use_case_id uuid, p_context_codes jsonb)',
    'save_tool_use_cases(p_run_id uuid, p_token text, p_survey_tool_id uuid, p_use_case_codes jsonb)',
    'set_ambassador_optin(p_run_id uuid, p_token text, p_email text)',
    'start_survey_run(p_wave_token text)'
  ];
  authenticated_rpc_signatures text[] := ARRAY[
    'dpo_risk_clusters_v2(p_org_id uuid)',
    'get_user_org_id(_user_id uuid)',
    'is_dpo(_user_id uuid)',
    'is_org_admin(_user_id uuid)',
    'is_org_admin_or_dpo_for(_org_id uuid)',
    'is_super_admin(_user_id uuid)',
    'recalculate_v8_score(p_run_id uuid)',
    'survey_run_is_open(_run_id uuid)',
    'survey_run_org(_run_id uuid)',
    'survey_tool_run(_tool_id uuid)',
    'survey_tool_use_case_run(_uc_id uuid)'
  ];
  signature text;
BEGIN
  FOR r IN
    SELECT
      p.oid,
      p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated;', r.oid::regprocedure);

    IF r.signature = ANY (public_rpc_signatures) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated;', r.oid::regprocedure);
    ELSIF r.signature = ANY (authenticated_rpc_signatures) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated;', r.oid::regprocedure);
    END IF;
  END LOOP;
END $$;

-- Keep DPO review queue lookups efficient as the pilot grows.
CREATE INDEX IF NOT EXISTS idx_dpo_review_items_survey_tool_id
  ON public.dpo_review_items (survey_tool_id);

CREATE INDEX IF NOT EXISTS idx_dpo_review_items_scoring_config_id
  ON public.dpo_review_items (scoring_config_id);

CREATE INDEX IF NOT EXISTS idx_dpo_review_items_policy_snapshot_id
  ON public.dpo_review_items (policy_snapshot_id);

COMMIT;
