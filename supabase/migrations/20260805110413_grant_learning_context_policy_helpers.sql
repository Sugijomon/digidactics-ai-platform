-- The Context Pack management policy calls this existing SECURITY DEFINER
-- helper. It performs its own auth.uid()/role/org checks, but the authenticated
-- role still needs table-level EXECUTE permission for policy evaluation.
REVOKE ALL ON FUNCTION public.is_learning_admin_for(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_learning_admin_for(uuid) TO authenticated;
