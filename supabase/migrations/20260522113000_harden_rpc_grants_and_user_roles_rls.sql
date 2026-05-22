-- Harden helper RPC grants and add explicit user_roles RLS policies.
-- The Supabase CLI is not available in this workspace, so this migration was
-- created manually and should be applied with the Supabase migration tooling.
--
-- Respondent-facing RPCs remain executable by anon/authenticated by design:
-- start_survey_run, complete_survey_run, save_*, set_ambassador_optin, and
-- register_tool_discovery all validate submission tokens server-side.

BEGIN;

-- user_roles is used for role resolution. Keep it explicitly readable only to
-- the user themself, same-org admins/DPOs, and super admins.
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_select_self_or_admin ON public.user_roles;
CREATE POLICY user_roles_select_self_or_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR (
      org_id IS NOT NULL
      AND public.is_org_admin_or_dpo_for(org_id)
    )
  );

DROP POLICY IF EXISTS user_roles_write_super_admin ON public.user_roles;
CREATE POLICY user_roles_write_super_admin ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Helper functions are needed by RLS policies for signed-in admin/DPO reads,
-- but they should not be callable by anon or PUBLIC through the API surface.
REVOKE ALL ON FUNCTION public.get_user_org_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_dpo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.survey_run_is_open(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.survey_run_org(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.survey_tool_run(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.survey_tool_use_case_run(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_user_org_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_dpo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.survey_run_is_open(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.survey_run_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.survey_tool_run(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.survey_tool_use_case_run(uuid) TO authenticated;

-- rls_auto_enable is an event-trigger helper and should not be executable from
-- REST/RPC roles.
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

COMMIT;
