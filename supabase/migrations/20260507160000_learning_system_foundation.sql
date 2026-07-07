-- =============================================================================
-- RouteAI Learning System Foundation
-- =============================================================================
-- Purpose:
--   Add a modular learning system to the shared SAI & RAI Supabase database.
--   This is intentionally not a Lovable table dump. It preserves the useful
--   Lovable concepts (courses, lessons, JSONB content, progress, attempts)
--   while adding versioning, auditability, org-scoping, and future RouteAI
--   recommendation hooks.
--
-- Design principles:
--   - JSONB lesson content is a feature: regulation, sector cases, and examples
--     can evolve without DDL.
--   - Stable codes are used for content and rules; UUIDs remain primary keys.
--   - Platform content has org_id NULL. Organization-specific overrides/content
--     use org_id.
--   - RLS is enabled on every table.
--   - Learning can run independently now and connect to SAI scan outputs later.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =============================================================================
-- 1. HELPERS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.learning_content_is_valid(_content jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    jsonb_typeof(_content) = 'object'
    AND (
      jsonb_typeof(_content -> 'blocks') = 'array'
      OR jsonb_typeof(_content -> 'topics') = 'array'
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_learning_lesson_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.content_schema_version < 1 THEN
    RAISE EXCEPTION 'content_schema_version must be >= 1';
  END IF;

  IF public.learning_content_is_valid(NEW.content) IS NOT TRUE THEN
    RAISE EXCEPTION 'learning lesson content must be a json object with blocks[] or topics[]';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_learning_attempt_grading()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_learning_admin_for(NEW.org_id) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.score IS NOT NULL
      OR NEW.max_score IS NOT NULL
      OR NEW.percentage IS NOT NULL
      OR NEW.passed IS NOT NULL
      OR NEW.reviewer_id IS NOT NULL
      OR NEW.reviewer_notes IS NOT NULL
      OR NEW.graded_at IS NOT NULL
      OR NEW.status = 'graded'
    THEN
      RAISE EXCEPTION 'learners cannot grade their own learning attempts';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.score IS DISTINCT FROM OLD.score
      OR NEW.max_score IS DISTINCT FROM OLD.max_score
      OR NEW.percentage IS DISTINCT FROM OLD.percentage
      OR NEW.passed IS DISTINCT FROM OLD.passed
      OR NEW.manual_review_required IS DISTINCT FROM OLD.manual_review_required
      OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
      OR NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes
      OR NEW.graded_at IS DISTINCT FROM OLD.graded_at
      OR (OLD.status <> 'graded' AND NEW.status = 'graded')
    THEN
      RAISE EXCEPTION 'only learning admins can update grading fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_learning_admin_for(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      public.is_super_admin(auth.uid())
      OR EXISTS (
        SELECT 1
          FROM public.user_roles ur
         WHERE ur.user_id = auth.uid()
           AND ur.role = 'content_editor'
           AND (
             (_org_id IS NULL AND ur.org_id IS NULL)
             OR (_org_id IS NOT NULL AND (ur.org_id = _org_id OR ur.org_id IS NULL))
           )
      )
      OR (
        _org_id IS NOT NULL
        AND public.is_org_admin(auth.uid())
        AND _org_id = public.get_user_org_id(auth.uid())
      )
    );
$$;

REVOKE ALL ON FUNCTION public.learning_content_is_valid(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_learning_lesson_content() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_learning_attempt_grading() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_learning_admin_for(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_learning_admin_for(uuid) TO authenticated;


-- =============================================================================
-- 2. AUTHORITATIVE CONTENT
-- =============================================================================

CREATE TABLE public.learning_courses (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code                text NOT NULL,
  org_id                     uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  title                      text NOT NULL,
  subtitle                   text,
  description                text,
  status                     text NOT NULL DEFAULT 'draft', -- draft|published|archived
  difficulty_level           text NOT NULL DEFAULT 'foundation', -- foundation|intermediate|advanced
  audience_roles             text[] NOT NULL DEFAULT '{}',
  sector_tags                text[] NOT NULL DEFAULT '{}',
  regulatory_frameworks      text[] NOT NULL DEFAULT '{}',
  required_for_onboarding    boolean NOT NULL DEFAULT false,
  unlocks_capability         text,
  passing_threshold          int NOT NULL DEFAULT 80,
  version                    int NOT NULL DEFAULT 1,
  created_by                 uuid,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  published_at               timestamptz,
  CONSTRAINT learning_courses_status_chk
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT learning_courses_difficulty_chk
    CHECK (difficulty_level IN ('foundation', 'intermediate', 'advanced')),
  CONSTRAINT learning_courses_threshold_chk
    CHECK (passing_threshold BETWEEN 0 AND 100),
  CONSTRAINT learning_courses_code_scope_unique UNIQUE (org_id, course_code)
);

-- Postgres UNIQUE treats NULLs as distinct. This index enforces unique platform
-- course codes where org_id is NULL.
CREATE UNIQUE INDEX learning_courses_platform_code_unique
  ON public.learning_courses(course_code)
  WHERE org_id IS NULL;

CREATE INDEX learning_courses_org_status_idx
  ON public.learning_courses(org_id, status);


CREATE TABLE public.learning_lessons (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_code                text NOT NULL,
  org_id                     uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  title                      text NOT NULL,
  summary                    text,
  lesson_type                text NOT NULL DEFAULT 'lesson', -- lesson|microlearning|assessment|case_lab
  status                     text NOT NULL DEFAULT 'draft',  -- draft|published|archived
  difficulty_level           text NOT NULL DEFAULT 'foundation',
  estimated_duration_minutes int,
  content_schema_version     int NOT NULL DEFAULT 1,
  content                    jsonb NOT NULL DEFAULT '{"blocks":[]}'::jsonb,
  sector_tags                text[] NOT NULL DEFAULT '{}',
  use_case_codes             text[] NOT NULL DEFAULT '{}',
  context_codes              text[] NOT NULL DEFAULT '{}',
  trigger_codes              text[] NOT NULL DEFAULT '{}',
  regulatory_frameworks      text[] NOT NULL DEFAULT '{}',
  ai_act_archetypes          text[] NOT NULL DEFAULT '{}',
  version                    int NOT NULL DEFAULT 1,
  supersedes_lesson_id       uuid REFERENCES public.learning_lessons(id) ON DELETE SET NULL,
  created_by                 uuid,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  published_at               timestamptz,
  CONSTRAINT learning_lessons_status_chk
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT learning_lessons_type_chk
    CHECK (lesson_type IN ('lesson', 'microlearning', 'assessment', 'case_lab')),
  CONSTRAINT learning_lessons_difficulty_chk
    CHECK (difficulty_level IN ('foundation', 'intermediate', 'advanced')),
  CONSTRAINT learning_lessons_duration_chk
    CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0),
  CONSTRAINT learning_lessons_code_scope_unique UNIQUE (org_id, lesson_code)
);

CREATE UNIQUE INDEX learning_lessons_platform_code_unique
  ON public.learning_lessons(lesson_code)
  WHERE org_id IS NULL;

CREATE INDEX learning_lessons_org_status_idx
  ON public.learning_lessons(org_id, status);

CREATE INDEX learning_lessons_trigger_codes_idx
  ON public.learning_lessons USING gin(trigger_codes);

CREATE INDEX learning_lessons_use_case_codes_idx
  ON public.learning_lessons USING gin(use_case_codes);

CREATE INDEX learning_lessons_content_idx
  ON public.learning_lessons USING gin(content);

CREATE TRIGGER trg_validate_learning_lesson_content
  BEFORE INSERT OR UPDATE ON public.learning_lessons
  FOR EACH ROW EXECUTE FUNCTION public.validate_learning_lesson_content();


CREATE TABLE public.learning_course_lessons (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id           uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  lesson_id           uuid NOT NULL REFERENCES public.learning_lessons(id) ON DELETE RESTRICT,
  sequence_order      int NOT NULL,
  is_required         boolean NOT NULL DEFAULT true,
  unlock_rule         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_course_lessons_order_chk CHECK (sequence_order > 0),
  CONSTRAINT learning_course_lessons_course_lesson_unique UNIQUE (course_id, lesson_id),
  CONSTRAINT learning_course_lessons_course_order_unique UNIQUE (course_id, sequence_order)
);

CREATE INDEX learning_course_lessons_course_idx
  ON public.learning_course_lessons(course_id, sequence_order);


-- Organization-level availability and customization. This lets RouteAI enable
-- platform content per customer without forking the authoritative lesson.
CREATE TABLE public.learning_catalog (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id                  uuid REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  lesson_id                  uuid REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  is_enabled                 boolean NOT NULL DEFAULT true,
  is_mandatory               boolean NOT NULL DEFAULT false,
  assigned_to_roles          text[] NOT NULL DEFAULT '{}',
  sector_tags                text[] NOT NULL DEFAULT '{}',
  custom_title               text,
  custom_intro               text,
  custom_deadline_days       int,
  priority                   int NOT NULL DEFAULT 0,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_catalog_target_chk CHECK (
    (course_id IS NOT NULL AND lesson_id IS NULL)
    OR (course_id IS NULL AND lesson_id IS NOT NULL)
  ),
  CONSTRAINT learning_catalog_deadline_chk CHECK (
    custom_deadline_days IS NULL OR custom_deadline_days > 0
  )
);

CREATE UNIQUE INDEX learning_catalog_course_unique
  ON public.learning_catalog(org_id, course_id)
  WHERE course_id IS NOT NULL;

CREATE UNIQUE INDEX learning_catalog_lesson_unique
  ON public.learning_catalog(org_id, lesson_id)
  WHERE lesson_id IS NOT NULL;

CREATE INDEX learning_catalog_org_enabled_idx
  ON public.learning_catalog(org_id, is_enabled, priority DESC);


-- =============================================================================
-- 3. LEARNER STATE
-- =============================================================================

CREATE TABLE public.learning_course_enrollments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id             uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  status                text NOT NULL DEFAULT 'not_started', -- not_started|in_progress|completed|expired
  source                text NOT NULL DEFAULT 'manual',      -- manual|mandatory|recommendation|onboarding
  due_at                timestamptz,
  started_at            timestamptz,
  completed_at          timestamptz,
  progress_percentage   int NOT NULL DEFAULT 0,
  final_score           int,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_course_enrollments_status_chk
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'expired')),
  CONSTRAINT learning_course_enrollments_progress_chk
    CHECK (progress_percentage BETWEEN 0 AND 100),
  CONSTRAINT learning_course_enrollments_score_chk
    CHECK (final_score IS NULL OR final_score BETWEEN 0 AND 100),
  CONSTRAINT learning_course_enrollments_unique UNIQUE (user_id, course_id)
);

CREATE INDEX learning_course_enrollments_org_status_idx
  ON public.learning_course_enrollments(org_id, status);


CREATE TABLE public.learning_lesson_progress (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id             uuid NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  course_id             uuid REFERENCES public.learning_courses(id) ON DELETE SET NULL,
  status                text NOT NULL DEFAULT 'not_started', -- not_started|in_progress|completed
  current_block_id      text,
  completed_block_ids   jsonb NOT NULL DEFAULT '[]'::jsonb,
  progress_percentage   int NOT NULL DEFAULT 0,
  started_at            timestamptz,
  completed_at          timestamptz,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_lesson_progress_status_chk
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  CONSTRAINT learning_lesson_progress_blocks_chk
    CHECK (jsonb_typeof(completed_block_ids) = 'array'),
  CONSTRAINT learning_lesson_progress_percentage_chk
    CHECK (progress_percentage BETWEEN 0 AND 100),
  CONSTRAINT learning_lesson_progress_unique UNIQUE (user_id, lesson_id, course_id)
);

CREATE INDEX learning_lesson_progress_org_status_idx
  ON public.learning_lesson_progress(org_id, status);

CREATE UNIQUE INDEX learning_lesson_progress_standalone_unique
  ON public.learning_lesson_progress(user_id, lesson_id)
  WHERE course_id IS NULL;


CREATE TABLE public.learning_lesson_attempts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id             uuid NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  course_id             uuid REFERENCES public.learning_courses(id) ON DELETE SET NULL,
  attempt_number        int NOT NULL DEFAULT 1,
  status                text NOT NULL DEFAULT 'started', -- started|submitted|graded
  answers               jsonb NOT NULL DEFAULT '{}'::jsonb,
  score                 int,
  max_score             int,
  percentage            int,
  passed                boolean,
  manual_review_required boolean NOT NULL DEFAULT false,
  reviewer_id           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_notes        text,
  started_at            timestamptz NOT NULL DEFAULT now(),
  submitted_at          timestamptz,
  graded_at             timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_lesson_attempts_status_chk
    CHECK (status IN ('started', 'submitted', 'graded')),
  CONSTRAINT learning_lesson_attempts_attempt_chk CHECK (attempt_number > 0),
  CONSTRAINT learning_lesson_attempts_score_chk CHECK (
    score IS NULL OR (score >= 0 AND (max_score IS NULL OR score <= max_score))
  ),
  CONSTRAINT learning_lesson_attempts_percentage_chk CHECK (
    percentage IS NULL OR percentage BETWEEN 0 AND 100
  ),
  CONSTRAINT learning_lesson_attempts_unique UNIQUE (user_id, lesson_id, course_id, attempt_number)
);

CREATE INDEX learning_lesson_attempts_org_status_idx
  ON public.learning_lesson_attempts(org_id, status);

CREATE UNIQUE INDEX learning_lesson_attempts_standalone_unique
  ON public.learning_lesson_attempts(user_id, lesson_id, attempt_number)
  WHERE course_id IS NULL;

CREATE TRIGGER trg_protect_learning_attempt_grading
  BEFORE INSERT OR UPDATE ON public.learning_lesson_attempts
  FOR EACH ROW EXECUTE FUNCTION public.protect_learning_attempt_grading();


-- =============================================================================
-- 4. ROUTEAI RECOMMENDATION BRIDGE
-- =============================================================================

CREATE TABLE public.learning_recommendation_rules (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code             text NOT NULL,
  org_id                uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  title                 text NOT NULL,
  rationale             text,
  source_scope          text NOT NULL DEFAULT 'platform', -- platform|routeai|manual
  trigger_codes         text[] NOT NULL DEFAULT '{}',
  use_case_codes        text[] NOT NULL DEFAULT '{}',
  context_codes         text[] NOT NULL DEFAULT '{}',
  tool_codes            text[] NOT NULL DEFAULT '{}',
  score_tiers           text[] NOT NULL DEFAULT '{}',
  review_classes        text[] NOT NULL DEFAULT '{}',
  course_id             uuid REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  lesson_id             uuid REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  priority              int NOT NULL DEFAULT 0,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_recommendation_rules_target_chk CHECK (
    (course_id IS NOT NULL AND lesson_id IS NULL)
    OR (course_id IS NULL AND lesson_id IS NOT NULL)
  ),
  CONSTRAINT learning_recommendation_rules_scope_chk CHECK (
    source_scope IN ('platform', 'routeai', 'manual')
  ),
  CONSTRAINT learning_recommendation_rules_code_scope_unique UNIQUE (org_id, rule_code)
);

CREATE UNIQUE INDEX learning_recommendation_rules_platform_code_unique
  ON public.learning_recommendation_rules(rule_code)
  WHERE org_id IS NULL;

CREATE INDEX learning_recommendation_rules_trigger_idx
  ON public.learning_recommendation_rules USING gin(trigger_codes);

CREATE INDEX learning_recommendation_rules_use_case_idx
  ON public.learning_recommendation_rules USING gin(use_case_codes);


-- =============================================================================
-- 5. UPDATED_AT TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_learning_courses_updated
  BEFORE UPDATE ON public.learning_courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_learning_lessons_updated
  BEFORE UPDATE ON public.learning_lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_learning_catalog_updated
  BEFORE UPDATE ON public.learning_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_learning_course_enrollments_updated
  BEFORE UPDATE ON public.learning_course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_learning_lesson_progress_updated
  BEFORE UPDATE ON public.learning_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_learning_recommendation_rules_updated
  BEFORE UPDATE ON public.learning_recommendation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- 6. RLS
-- =============================================================================

ALTER TABLE public.learning_courses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_lessons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_course_lessons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_catalog              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_course_enrollments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_lesson_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_lesson_attempts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_recommendation_rules ENABLE ROW LEVEL SECURITY;

-- Content read: published platform content is visible to authenticated users.
-- Org-scoped content is visible to members of that org and admins.
CREATE POLICY lc_select_published_or_org ON public.learning_courses
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (status = 'published' AND org_id IS NULL)
    OR (org_id IS NOT NULL AND org_id = public.get_user_org_id(auth.uid()))
  );

CREATE POLICY ll_select_published_or_org ON public.learning_lessons
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (status = 'published' AND org_id IS NULL)
    OR (org_id IS NOT NULL AND org_id = public.get_user_org_id(auth.uid()))
  );

CREATE POLICY lcl_select_if_course_visible ON public.learning_course_lessons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.learning_courses c
       WHERE c.id = course_id
         AND (
           public.is_super_admin(auth.uid())
           OR (c.status = 'published' AND c.org_id IS NULL)
           OR (c.org_id IS NOT NULL AND c.org_id = public.get_user_org_id(auth.uid()))
         )
    )
  );

-- Content management.
CREATE POLICY lc_manage_learning_admin ON public.learning_courses
  FOR ALL TO authenticated
  USING (public.is_learning_admin_for(org_id))
  WITH CHECK (public.is_learning_admin_for(org_id));

CREATE POLICY ll_manage_learning_admin ON public.learning_lessons
  FOR ALL TO authenticated
  USING (public.is_learning_admin_for(org_id))
  WITH CHECK (public.is_learning_admin_for(org_id));

CREATE POLICY lcl_manage_learning_admin ON public.learning_course_lessons
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_courses c
       WHERE c.id = course_id AND public.is_learning_admin_for(c.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_courses c
       WHERE c.id = course_id AND public.is_learning_admin_for(c.org_id)
    )
  );

-- Catalog availability.
CREATE POLICY learning_catalog_select_org ON public.learning_catalog
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR org_id = public.get_user_org_id(auth.uid())
  );

CREATE POLICY learning_catalog_manage_admin ON public.learning_catalog
  FOR ALL TO authenticated
  USING (public.is_learning_admin_for(org_id))
  WITH CHECK (public.is_learning_admin_for(org_id));

-- Learner state: users manage their own state, admins/DPOs can read org state.
CREATE POLICY lce_select_self_or_admin ON public.learning_course_enrollments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(org_id)
  );

CREATE POLICY lce_insert_self_or_admin ON public.learning_course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND org_id = public.get_user_org_id(auth.uid()))
    OR public.is_learning_admin_for(org_id)
  );

CREATE POLICY lce_update_self_or_admin ON public.learning_course_enrollments
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_learning_admin_for(org_id)
  )
  WITH CHECK (
    (user_id = auth.uid() AND org_id = public.get_user_org_id(auth.uid()))
    OR public.is_learning_admin_for(org_id)
  );

CREATE POLICY llp_select_self_or_admin ON public.learning_lesson_progress
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(org_id)
  );

CREATE POLICY llp_insert_self_or_admin ON public.learning_lesson_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND org_id = public.get_user_org_id(auth.uid()))
    OR public.is_learning_admin_for(org_id)
  );

CREATE POLICY llp_update_self_or_admin ON public.learning_lesson_progress
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_learning_admin_for(org_id)
  )
  WITH CHECK (
    (user_id = auth.uid() AND org_id = public.get_user_org_id(auth.uid()))
    OR public.is_learning_admin_for(org_id)
  );

CREATE POLICY lla_select_self_or_admin ON public.learning_lesson_attempts
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(org_id)
  );

CREATE POLICY lla_insert_self ON public.learning_lesson_attempts
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

CREATE POLICY lla_update_self_or_reviewer ON public.learning_lesson_attempts
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_learning_admin_for(org_id)
  )
  WITH CHECK (
    (user_id = auth.uid() AND org_id = public.get_user_org_id(auth.uid()))
    OR public.is_learning_admin_for(org_id)
  );

-- Recommendation rules are readable for org members and manageable by learning
-- admins. Platform rules are readable to authenticated users.
CREATE POLICY lrr_select_platform_or_org ON public.learning_recommendation_rules
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR org_id IS NULL
    OR org_id = public.get_user_org_id(auth.uid())
  );

CREATE POLICY lrr_manage_learning_admin ON public.learning_recommendation_rules
  FOR ALL TO authenticated
  USING (public.is_learning_admin_for(org_id))
  WITH CHECK (public.is_learning_admin_for(org_id));
