-- Enable authenticated DPO/org-admin dashboard reads.
--
-- RLS remains the security boundary. These grants only allow the authenticated
-- Postgres role to attempt SELECTs; row visibility is still controlled by the
-- org-scoped RLS policies and helper functions.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT ur.org_id
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.org_id IS NOT NULL
      ORDER BY
        CASE ur.role
          WHEN 'org_admin' THEN 1
          WHEN 'dpo' THEN 2
          WHEN 'manager' THEN 3
          WHEN 'content_editor' THEN 4
          WHEN 'user' THEN 5
          ELSE 6
        END,
        ur.created_at
      LIMIT 1
    ),
    (
      SELECT p.org_id
      FROM public.profiles p
      WHERE p.id = _user_id
      LIMIT 1
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_user_org_id(uuid) TO authenticated;

GRANT SELECT ON TABLE
  public.organizations,
  public.scan_wave,
  public.scan_scoring_config,
  public.survey_run,
  public.survey_profile,
  public.survey_data_type,
  public.survey_support_need,
  public.survey_tool,
  public.survey_tool_account,
  public.survey_tool_use_case,
  public.survey_tool_use_case_context,
  public.risk_result,
  public.risk_result_tool,
  public.dpo_review_items,
  public.audit_events,
  public.report_exports
TO authenticated;

COMMIT;
