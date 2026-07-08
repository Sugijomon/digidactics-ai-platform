-- =============================================================================
-- SAI staging RLS role matrix smoke test
-- =============================================================================
-- Purpose:
--   Prove the release role matrix for anon, DPO, org-admin, super-admin, and
--   regular user access without mutating product data.
--
-- Staging-only usage:
--   psql "<staging-db-url>" -v ON_ERROR_STOP=1 \
--     -v smoke_org_id=00000000-0000-0000-0000-000000000101 \
--     -v other_org_id=<different-existing-org-id> \
--     -v dpo_user_id=<auth-user-id-with-dpo-role-in-smoke-org> \
--     -v org_admin_user_id=<auth-user-id-with-org-admin-role-in-smoke-org> \
--     -v regular_user_id=<auth-user-id-with-user-role-in-smoke-org> \
--     -v super_admin_user_id=<auth-user-id-with-super-admin-role> \
--     -f supabase/smoke-tests/20260708120000_rls_role_matrix_smoke.sql
--
-- Preconditions:
--   - Run after all migrations.
--   - Use staging/local only, never production.
--   - The smoke org and another org exist.
--   - The supplied users exist in public.user_roles with the stated roles.
--   - The smoke org has at least one survey_run, from a real staging survey run
--     or staging-only seed data.
--
-- The script uses READ ONLY transactions and rolls back every role context.
-- =============================================================================

\set ON_ERROR_STOP on

\if :{?smoke_org_id}
\else
  \set smoke_org_id '00000000-0000-0000-0000-000000000101'
\endif

\if :{?other_org_id}
\else
  \echo 'Missing required psql variable: other_org_id'
  \quit 1
\endif

\if :{?dpo_user_id}
\else
  \echo 'Missing required psql variable: dpo_user_id'
  \quit 1
\endif

\if :{?org_admin_user_id}
\else
  \echo 'Missing required psql variable: org_admin_user_id'
  \quit 1
\endif

\if :{?regular_user_id}
\else
  \echo 'Missing required psql variable: regular_user_id'
  \quit 1
\endif

\if :{?super_admin_user_id}
\else
  \echo 'Missing required psql variable: super_admin_user_id'
  \quit 1
\endif

\echo '0. fixture preflight as elevated SQL runner'
BEGIN READ ONLY;
SELECT set_config('sai.smoke_org_id', :'smoke_org_id', true);
SELECT set_config('sai.other_org_id', :'other_org_id', true);
SELECT set_config('sai.dpo_user_id', :'dpo_user_id', true);
SELECT set_config('sai.org_admin_user_id', :'org_admin_user_id', true);
SELECT set_config('sai.regular_user_id', :'regular_user_id', true);
SELECT set_config('sai.super_admin_user_id', :'super_admin_user_id', true);
DO $$
DECLARE
  v_smoke_org_id uuid := current_setting('sai.smoke_org_id')::uuid;
  v_other_org_id uuid := current_setting('sai.other_org_id')::uuid;
  v_dpo_user_id uuid := current_setting('sai.dpo_user_id')::uuid;
  v_org_admin_user_id uuid := current_setting('sai.org_admin_user_id')::uuid;
  v_regular_user_id uuid := current_setting('sai.regular_user_id')::uuid;
  v_super_admin_user_id uuid := current_setting('sai.super_admin_user_id')::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_smoke_org_id) THEN
    RAISE EXCEPTION 'Missing smoke organization %', v_smoke_org_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_other_org_id) THEN
    RAISE EXCEPTION 'Missing other organization %', v_other_org_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.survey_run WHERE org_id = v_smoke_org_id) THEN
    RAISE EXCEPTION 'Smoke organization % needs at least one survey_run for dashboard RLS evidence', v_smoke_org_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_dpo_user_id AND org_id = v_smoke_org_id AND role = 'dpo'
  ) THEN
    RAISE EXCEPTION 'Missing dpo role row for % in smoke org', v_dpo_user_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_org_admin_user_id AND org_id = v_smoke_org_id AND role = 'org_admin'
  ) THEN
    RAISE EXCEPTION 'Missing org_admin role row for % in smoke org', v_org_admin_user_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_regular_user_id AND org_id = v_smoke_org_id AND role = 'user'
  ) THEN
    RAISE EXCEPTION 'Missing user role row for % in smoke org', v_regular_user_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_super_admin_user_id AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Missing super_admin role row for %', v_super_admin_user_id;
  END IF;
END $$;
ROLLBACK;

\echo '1. anon grants are narrow'
BEGIN READ ONLY;
DO $$
BEGIN
  IF has_table_privilege('anon', 'public.survey_run', 'INSERT') THEN
    RAISE EXCEPTION 'anon must not have direct INSERT on survey_run';
  END IF;

  IF has_table_privilege('anon', 'public.survey_tool', 'INSERT') THEN
    RAISE EXCEPTION 'anon must not have direct INSERT on survey_tool';
  END IF;

  IF has_function_privilege('anon', 'public.calculate_v8_score(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute calculate_v8_score directly';
  END IF;

  IF NOT has_function_privilege('anon', 'public.start_survey_run(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon should execute respondent RPC start_survey_run(text)';
  END IF;
END $$;
ROLLBACK;

\echo '2. DPO can read own org dashboard rows and not another org'
BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'dpo_user_id', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'dpo_user_id', 'role', 'authenticated')::text,
  true
);
SELECT set_config('sai.smoke_org_id', :'smoke_org_id', true);
SELECT set_config('sai.other_org_id', :'other_org_id', true);
DO $$
DECLARE
  v_smoke_org_id uuid := current_setting('sai.smoke_org_id')::uuid;
  v_other_org_id uuid := current_setting('sai.other_org_id')::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_smoke_org_id) THEN
    RAISE EXCEPTION 'DPO cannot read own organization';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.survey_run WHERE org_id = v_smoke_org_id) THEN
    RAISE EXCEPTION 'DPO cannot read own organization survey_run rows';
  END IF;

  IF EXISTS (SELECT 1 FROM public.survey_run WHERE org_id = v_other_org_id) THEN
    RAISE EXCEPTION 'DPO can read another organization survey_run rows';
  END IF;
END $$;
ROLLBACK;

\echo '3. org-admin can read own org dashboard rows and not another org'
BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'org_admin_user_id', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'org_admin_user_id', 'role', 'authenticated')::text,
  true
);
SELECT set_config('sai.smoke_org_id', :'smoke_org_id', true);
SELECT set_config('sai.other_org_id', :'other_org_id', true);
DO $$
DECLARE
  v_smoke_org_id uuid := current_setting('sai.smoke_org_id')::uuid;
  v_other_org_id uuid := current_setting('sai.other_org_id')::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.survey_run WHERE org_id = v_smoke_org_id) THEN
    RAISE EXCEPTION 'org-admin cannot read own organization survey_run rows';
  END IF;

  IF EXISTS (SELECT 1 FROM public.survey_run WHERE org_id = v_other_org_id) THEN
    RAISE EXCEPTION 'org-admin can read another organization survey_run rows';
  END IF;
END $$;
ROLLBACK;

\echo '4. regular user cannot read dashboard rows'
BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'regular_user_id', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'regular_user_id', 'role', 'authenticated')::text,
  true
);
SELECT set_config('sai.smoke_org_id', :'smoke_org_id', true);
DO $$
DECLARE
  v_smoke_org_id uuid := current_setting('sai.smoke_org_id')::uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.survey_run WHERE org_id = v_smoke_org_id) THEN
    RAISE EXCEPTION 'regular user can read dashboard survey_run rows';
  END IF;
END $$;
ROLLBACK;

\echo '5. super-admin can read across organizations'
BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'super_admin_user_id', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'super_admin_user_id', 'role', 'authenticated')::text,
  true
);
SELECT set_config('sai.smoke_org_id', :'smoke_org_id', true);
SELECT set_config('sai.other_org_id', :'other_org_id', true);
DO $$
DECLARE
  v_smoke_org_id uuid := current_setting('sai.smoke_org_id')::uuid;
  v_other_org_id uuid := current_setting('sai.other_org_id')::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_smoke_org_id) THEN
    RAISE EXCEPTION 'super-admin cannot read smoke organization';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_other_org_id) THEN
    RAISE EXCEPTION 'super-admin cannot read other organization';
  END IF;
END $$;
ROLLBACK;

\echo 'RLS role matrix smoke passed'

-- =============================================================================
-- End smoke test
-- =============================================================================
