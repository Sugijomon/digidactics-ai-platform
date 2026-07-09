-- =============================================================================
-- Legacy dependency bootstrap: public.user_roles
-- =============================================================================
-- The SAI RLS helpers in 20260504120000_rls_policies_v2_1.sql resolve DPO,
-- org-admin, and super-admin membership through the legacy public.user_roles
-- table. Live/staging projects already had this table, but a clean local
-- Supabase rebuild from migrations needs the dependency represented explicitly.
--
-- Keep this migration deliberately small and idempotent. RLS policies and
-- grants for user_roles are applied later in
-- 20260522113000_harden_rpc_grants_and_user_roles_rls.sql and
-- 20260527090000_grant_user_roles_select_to_authenticated.sql.
-- =============================================================================

INSERT INTO public.organizations (id, name, plan_type)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Platform Administration',
  'both'
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  org_id     uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
             REFERENCES public.organizations(id) ON DELETE CASCADE,
  role       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_org_id
  ON public.user_roles(org_id);

