-- Allow authenticated users to resolve their own organization role.
--
-- RLS remains the security boundary. The active user_roles SELECT policy only
-- exposes the user's own row, same-org admin/DPO rows, or super-admin rows.
-- Without this table-level SELECT grant, the Next.js dashboard cannot load the
-- authenticated user's role even when the RLS policy allows it.

BEGIN;

GRANT SELECT ON TABLE public.user_roles TO authenticated;

COMMIT;
