-- =============================================================================
-- RouteAI Learning page attempts
-- =============================================================================
-- Purpose:
--   Store learner answers for the topic/page based Learning System without
--   coupling them to automatic grading yet.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.learning_page_attempts (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id                uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_id                uuid NOT NULL REFERENCES public.learning_pages(id) ON DELETE CASCADE,
  course_id              uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  attempt_number         int NOT NULL DEFAULT 1,
  status                 text NOT NULL DEFAULT 'submitted',
  answers                jsonb NOT NULL DEFAULT '{}'::jsonb,
  score                  int,
  max_score              int,
  percentage             int,
  passed                 boolean,
  manual_review_required boolean NOT NULL DEFAULT false,
  reviewer_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_notes         text,
  started_at             timestamptz NOT NULL DEFAULT now(),
  submitted_at           timestamptz NOT NULL DEFAULT now(),
  graded_at              timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_page_attempts_status_chk
    CHECK (status IN ('started', 'submitted', 'graded')),
  CONSTRAINT learning_page_attempts_attempt_chk CHECK (attempt_number > 0),
  CONSTRAINT learning_page_attempts_answers_chk CHECK (jsonb_typeof(answers) = 'object'),
  CONSTRAINT learning_page_attempts_score_chk CHECK (
    score IS NULL OR (score >= 0 AND (max_score IS NULL OR score <= max_score))
  ),
  CONSTRAINT learning_page_attempts_percentage_chk CHECK (
    percentage IS NULL OR percentage BETWEEN 0 AND 100
  ),
  CONSTRAINT learning_page_attempts_unique UNIQUE (user_id, page_id, course_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS learning_page_attempts_org_status_idx
  ON public.learning_page_attempts(org_id, status);

CREATE INDEX IF NOT EXISTS learning_page_attempts_answers_idx
  ON public.learning_page_attempts USING gin(answers);

CREATE TRIGGER trg_learning_page_attempts_updated
  BEFORE UPDATE ON public.learning_page_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.learning_page_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY learning_page_attempts_select_self_or_admin ON public.learning_page_attempts
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(org_id)
  );

CREATE POLICY learning_page_attempts_insert_self ON public.learning_page_attempts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND org_id = public.get_user_org_id(auth.uid())
    AND score IS NULL
    AND max_score IS NULL
    AND percentage IS NULL
    AND passed IS NULL
    AND reviewer_id IS NULL
    AND reviewer_notes IS NULL
    AND graded_at IS NULL
    AND status <> 'graded'
  );

CREATE POLICY learning_page_attempts_update_self_or_reviewer ON public.learning_page_attempts
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_learning_admin_for(org_id)
  )
  WITH CHECK (
    (user_id = auth.uid() AND org_id = public.get_user_org_id(auth.uid()))
    OR public.is_learning_admin_for(org_id)
  );
