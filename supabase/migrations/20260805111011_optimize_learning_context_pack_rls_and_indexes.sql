-- Cache auth.uid() once per statement in the new Context Pack policies and
-- avoid overlapping permissive SELECT policies for administrators.
DROP POLICY IF EXISTS learning_context_pack_manage_admin
  ON public.learning_context_pack_releases;
DROP POLICY IF EXISTS learning_context_pack_select_org
  ON public.learning_context_pack_releases;

CREATE POLICY learning_context_pack_select_org
  ON public.learning_context_pack_releases
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin((SELECT auth.uid()))
    OR (
      org_id = public.get_user_org_id((SELECT auth.uid()))
      AND (
        status = 'published'
        OR public.is_learning_admin_for(org_id)
        OR public.is_org_admin_or_dpo_for(org_id)
        OR EXISTS (
          SELECT 1
          FROM public.learning_course_enrollments enrollment
          WHERE enrollment.user_id = (SELECT auth.uid())
            AND enrollment.context_pack_release_id = learning_context_pack_releases.id
        )
      )
    )
  );

CREATE POLICY learning_context_pack_insert_admin
  ON public.learning_context_pack_releases
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_learning_admin_for(org_id)
    OR public.is_org_admin_or_dpo_for(org_id)
  );

CREATE POLICY learning_context_pack_update_admin
  ON public.learning_context_pack_releases
  FOR UPDATE TO authenticated
  USING (
    public.is_learning_admin_for(org_id)
    OR public.is_org_admin_or_dpo_for(org_id)
  )
  WITH CHECK (
    public.is_learning_admin_for(org_id)
    OR public.is_org_admin_or_dpo_for(org_id)
  );

CREATE POLICY learning_context_pack_delete_admin
  ON public.learning_context_pack_releases
  FOR DELETE TO authenticated
  USING (
    public.is_learning_admin_for(org_id)
    OR public.is_org_admin_or_dpo_for(org_id)
  );

DROP POLICY IF EXISTS learning_context_ack_select_self_or_admin
  ON public.learning_context_acknowledgements;
DROP POLICY IF EXISTS learning_context_ack_insert_self
  ON public.learning_context_acknowledgements;

CREATE POLICY learning_context_ack_select_self_or_admin
  ON public.learning_context_acknowledgements
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_super_admin((SELECT auth.uid()))
    OR public.is_org_admin_or_dpo_for(org_id)
  );

CREATE POLICY learning_context_ack_insert_self
  ON public.learning_context_acknowledgements
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND org_id = public.get_user_org_id((SELECT auth.uid()))
  );

-- Cover the scoped foreign keys used for release rollout and evidence lookups.
CREATE INDEX IF NOT EXISTS learning_catalog_context_pack_scope_idx
  ON public.learning_catalog(active_context_pack_id, org_id, course_id);

DROP INDEX IF EXISTS public.learning_enrollment_context_pack_idx;
CREATE INDEX IF NOT EXISTS learning_enrollment_context_pack_scope_idx
  ON public.learning_course_enrollments(context_pack_release_id, org_id, course_id);

CREATE INDEX IF NOT EXISTS learning_context_ack_context_pack_idx
  ON public.learning_context_acknowledgements(context_pack_release_id);

CREATE INDEX IF NOT EXISTS learning_context_ack_user_idx
  ON public.learning_context_acknowledgements(user_id);

CREATE INDEX IF NOT EXISTS learning_context_pack_course_idx
  ON public.learning_context_pack_releases(course_id);

CREATE INDEX IF NOT EXISTS learning_context_pack_created_by_idx
  ON public.learning_context_pack_releases(created_by);
