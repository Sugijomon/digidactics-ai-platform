-- =============================================================================
-- RouteAI Learning Smoke Tests
-- =============================================================================
-- Run after:
--   20260507160000_learning_system_foundation.sql
--   20260508100000_learning_certification_access_gate.sql
--   20260507161000_learning_seed.sql
-- =============================================================================

DO $$
DECLARE
  v_course_count int;
  v_lesson_count int;
  v_rule_count int;
  v_access_requirement_count int;
  v_invalid_lesson_id uuid;
BEGIN
  SELECT count(*) INTO v_course_count
    FROM public.learning_courses
   WHERE course_code = 'ai-literacy-foundation'
     AND status = 'published';

  IF v_course_count <> 1 THEN
    RAISE EXCEPTION 'Expected one published ai-literacy-foundation course, got %', v_course_count;
  END IF;

  SELECT count(*) INTO v_lesson_count
    FROM public.learning_lessons
   WHERE lesson_code IN (
     'ai-literacy-what-is-ai',
     'ai-literacy-data-and-confidentiality',
     'ai-literacy-human-oversight'
   )
   AND status = 'published';

  IF v_lesson_count <> 3 THEN
    RAISE EXCEPTION 'Expected three published foundation lessons, got %', v_lesson_count;
  END IF;

  SELECT count(*) INTO v_rule_count
    FROM public.learning_recommendation_rules
   WHERE source_scope = 'routeai';

  IF v_rule_count < 3 THEN
    RAISE EXCEPTION 'Expected at least three RouteAI learning rules, got %', v_rule_count;
  END IF;

  SELECT count(*) INTO v_access_requirement_count
    FROM public.learning_access_requirements lar
    JOIN public.learning_courses lc ON lc.id = lar.required_course_id
   WHERE lar.capability_code = 'routeai_usecase_check'
     AND lar.required_certification_code = 'ai_literacy_foundation'
     AND lc.course_code = 'ai-literacy-foundation'
     AND lar.is_active = true;

  IF v_access_requirement_count <> 1 THEN
    RAISE EXCEPTION 'Expected one active RouteAI access requirement, got %', v_access_requirement_count;
  END IF;

  IF to_regprocedure('public.learning_check_capability_access(text)') IS NULL THEN
    RAISE EXCEPTION 'Expected learning_check_capability_access(text) to exist';
  END IF;

  IF to_regprocedure('public.learning_issue_certification_for_enrollment(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Expected learning_issue_certification_for_enrollment(uuid) to exist';
  END IF;

  BEGIN
    INSERT INTO public.learning_lessons (
      lesson_code,
      title,
      status,
      content
    )
    VALUES (
      'invalid-content-shape-smoke',
      'Invalid content shape smoke test',
      'draft',
      '{"not_blocks":[]}'::jsonb
    )
    RETURNING id INTO v_invalid_lesson_id;

    RAISE EXCEPTION 'Invalid learning content was accepted unexpectedly';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Invalid learning content was accepted unexpectedly' THEN
        RAISE;
      END IF;
  END;

  RAISE NOTICE 'Learning smoke tests passed';
END$$;
