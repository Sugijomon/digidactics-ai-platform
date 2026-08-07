-- =============================================================================
-- RouteAI AI Literacy Context Pack smoke test
-- =============================================================================
-- Run as postgres after all migrations. The transaction always rolls back.
-- Validates schema, immutability, release pinning, RLS isolation,
-- acknowledgement evidence, attempt evidence and certification evidence.
-- =============================================================================

BEGIN;
SET LOCAL statement_timeout = '60s';

DO $$
DECLARE
  missing_object text;
BEGIN
  SELECT expected
  INTO missing_object
  FROM unnest(ARRAY[
    'public.learning_context_pack_releases',
    'public.learning_context_acknowledgements'
  ]) expected
  WHERE to_regclass(expected) IS NULL
  LIMIT 1;

  IF missing_object IS NOT NULL THEN
    RAISE EXCEPTION 'Missing Context Pack table: %', missing_object;
  END IF;

  IF to_regprocedure('public.learning_context_pack_is_valid(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Missing Context Pack validator';
  END IF;

  IF NOT public.learning_context_pack_is_valid(
    '{
      "organization":{"name":"Org A","sector":"Test"},
      "approved_tools":[{"name":"Enterprise Copilot","guidance":"Managed account only"}],
      "data_rules":["No customer data in public tools"],
      "policy_link":{"label":"AI policy","url":"https://example.test/policy"},
      "escalation_route":{"summary":"Stop and ask","steps":["Record the case"],"contact_role":"DPO","contact_email":"dpo@example.test"},
      "oversight_roles":["Employee checks output"],
      "sector_case":{"title":"Test case","description":"Fictitious case"},
      "role_cases":[{"role":"Advisor","title":"Draft advice","description":"Check all sources"}]
    }'::jsonb
  ) THEN
    RAISE EXCEPTION 'Valid full Context Pack JSON was rejected';
  END IF;

  IF public.learning_context_pack_is_valid('{"arbitrary_html":"<script>bad()</script>"}'::jsonb) THEN
    RAISE EXCEPTION 'Unknown Context Pack keys must be rejected';
  END IF;

  IF public.learning_context_pack_is_valid('{"policy_link":{"label":"Bad","url":"javascript:alert(1)"}}'::jsonb) THEN
    RAISE EXCEPTION 'Non-HTTP policy links must be rejected';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.learning_courses
    WHERE course_code = 'ai-literacy-foundation'
      AND org_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Missing Git-canonical AI Literacy core course';
  END IF;
END;
$$;

INSERT INTO public.organizations (id, name)
VALUES
  ('00000000-0000-0000-0000-000000000801', 'Context Pack Smoke Org A'),
  ('00000000-0000-0000-0000-000000000802', 'Context Pack Smoke Org B');

INSERT INTO public.profiles (id, org_id, email)
VALUES
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000801', 'learner-a1@example.test'),
  ('00000000-0000-0000-0000-000000000903', '00000000-0000-0000-0000-000000000801', 'learner-a2@example.test'),
  ('00000000-0000-0000-0000-000000000911', '00000000-0000-0000-0000-000000000801', 'admin-a@example.test'),
  ('00000000-0000-0000-0000-000000000902', '00000000-0000-0000-0000-000000000802', 'learner-b@example.test'),
  ('00000000-0000-0000-0000-000000000912', '00000000-0000-0000-0000-000000000802', 'admin-b@example.test');

INSERT INTO public.user_roles (user_id, org_id, role)
VALUES
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000801', 'user'),
  ('00000000-0000-0000-0000-000000000903', '00000000-0000-0000-0000-000000000801', 'user'),
  ('00000000-0000-0000-0000-000000000911', '00000000-0000-0000-0000-000000000801', 'org_admin'),
  ('00000000-0000-0000-0000-000000000902', '00000000-0000-0000-0000-000000000802', 'user'),
  ('00000000-0000-0000-0000-000000000912', '00000000-0000-0000-0000-000000000802', 'org_admin');

WITH core_course AS (
  SELECT id
  FROM public.learning_courses
  WHERE course_code = 'ai-literacy-foundation'
    AND org_id IS NULL
  LIMIT 1
)
INSERT INTO public.learning_context_pack_releases (
  id, org_id, course_id, version, status, context_json
)
SELECT pack.id, pack.org_id, core_course.id, pack.version, pack.status, pack.context_json
FROM core_course
CROSS JOIN (
  VALUES
    (
      '00000000-0000-0000-0000-000000000811'::uuid,
      '00000000-0000-0000-0000-000000000801'::uuid,
      1,
      'published',
      '{"policy_link":{"label":"AI policy A v1","url":"https://example.test/a/v1"},"data_rules":["Rule A v1"]}'::jsonb
    ),
    (
      '00000000-0000-0000-0000-000000000813'::uuid,
      '00000000-0000-0000-0000-000000000801'::uuid,
      2,
      'draft',
      '{"policy_link":{"label":"AI policy A v2","url":"https://example.test/a/v2"},"data_rules":["Rule A v2"]}'::jsonb
    ),
    (
      '00000000-0000-0000-0000-000000000814'::uuid,
      '00000000-0000-0000-0000-000000000801'::uuid,
      3,
      'draft',
      '{"policy_link":{"label":"AI policy A draft","url":"https://example.test/a/draft"}}'::jsonb
    ),
    (
      '00000000-0000-0000-0000-000000000812'::uuid,
      '00000000-0000-0000-0000-000000000802'::uuid,
      1,
      'published',
      '{"policy_link":{"label":"AI policy B v1","url":"https://example.test/b/v1"}}'::jsonb
    )
) AS pack(id, org_id, version, status, context_json);

-- Simulate an enrollment that predates an active Context Pack. Later updates
-- must not attach a release retroactively.
INSERT INTO public.learning_course_enrollments (id, org_id, user_id, course_id, status)
SELECT
  '00000000-0000-0000-0000-000000000822',
  '00000000-0000-0000-0000-000000000802',
  '00000000-0000-0000-0000-000000000902',
  course.id,
  'not_started'
FROM public.learning_courses course
WHERE course.course_code = 'ai-literacy-foundation'
  AND course.org_id IS NULL;

INSERT INTO public.learning_catalog (org_id, course_id, is_enabled, active_context_pack_id)
SELECT catalog.org_id, course.id, true, catalog.pack_id
FROM public.learning_courses course
CROSS JOIN (
  VALUES
    ('00000000-0000-0000-0000-000000000801'::uuid, '00000000-0000-0000-0000-000000000811'::uuid),
    ('00000000-0000-0000-0000-000000000802'::uuid, '00000000-0000-0000-0000-000000000812'::uuid)
) catalog(org_id, pack_id)
WHERE course.course_code = 'ai-literacy-foundation'
  AND course.org_id IS NULL;

UPDATE public.learning_course_enrollments
SET status = 'in_progress', started_at = now()
WHERE id = '00000000-0000-0000-0000-000000000822';

DO $$
BEGIN
  IF (SELECT context_pack_release_id FROM public.learning_course_enrollments WHERE id = '00000000-0000-0000-0000-000000000822')
     IS NOT NULL THEN
    RAISE EXCEPTION 'A legacy enrollment was retroactively pinned during a routine update';
  END IF;
END;
$$;

INSERT INTO public.learning_course_enrollments (id, org_id, user_id, course_id, status)
SELECT
  '00000000-0000-0000-0000-000000000821',
  '00000000-0000-0000-0000-000000000801',
  '00000000-0000-0000-0000-000000000901',
  course.id,
  'in_progress'
FROM public.learning_courses course
WHERE course.course_code = 'ai-literacy-foundation'
  AND course.org_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.learning_course_enrollments
    WHERE id = '00000000-0000-0000-0000-000000000821'
      AND context_pack_release_id = '00000000-0000-0000-0000-000000000811'
  ) THEN
    RAISE EXCEPTION 'First enrollment did not pin Context Pack A v1';
  END IF;

  BEGIN
    UPDATE public.learning_context_pack_releases
    SET context_json = '{"data_rules":["mutated"]}'::jsonb
    WHERE id = '00000000-0000-0000-0000-000000000811';
    RAISE EXCEPTION 'Published Context Pack mutation unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Published Context Pack mutation unexpectedly succeeded' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    UPDATE public.learning_course_enrollments
    SET context_pack_release_id = '00000000-0000-0000-0000-000000000813'
    WHERE id = '00000000-0000-0000-0000-000000000821';
    RAISE EXCEPTION 'Pinned enrollment Context Pack replacement unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Pinned enrollment Context Pack replacement unexpectedly succeeded' THEN
      RAISE;
    END IF;
  END;
END;
$$;

UPDATE public.learning_context_pack_releases
SET status = 'published'
WHERE id = '00000000-0000-0000-0000-000000000813';

DO $$
BEGIN
  BEGIN
    INSERT INTO public.learning_course_enrollments (
      id, org_id, user_id, course_id, status, context_pack_release_id
    )
    SELECT
      '00000000-0000-0000-0000-000000000824',
      '00000000-0000-0000-0000-000000000801',
      '00000000-0000-0000-0000-000000000903',
      course.id,
      'in_progress',
      '00000000-0000-0000-0000-000000000813'
    FROM public.learning_courses course
    WHERE course.course_code = 'ai-literacy-foundation'
      AND course.org_id IS NULL;

    RAISE EXCEPTION 'Non-active Context Pack override unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Non-active Context Pack override unexpectedly succeeded' THEN
      RAISE;
    END IF;
    IF SQLERRM NOT LIKE 'A new enrollment must use the active Context Pack%' THEN
      RAISE;
    END IF;
  END;
END;
$$;

UPDATE public.learning_catalog
SET active_context_pack_id = '00000000-0000-0000-0000-000000000813'
WHERE org_id = '00000000-0000-0000-0000-000000000801'
  AND course_id IS NOT NULL;

UPDATE public.learning_context_pack_releases
SET status = 'archived'
WHERE id = '00000000-0000-0000-0000-000000000811';

INSERT INTO public.learning_course_enrollments (id, org_id, user_id, course_id, status)
SELECT
  '00000000-0000-0000-0000-000000000823',
  '00000000-0000-0000-0000-000000000801',
  '00000000-0000-0000-0000-000000000903',
  course.id,
  'in_progress'
FROM public.learning_courses course
WHERE course.course_code = 'ai-literacy-foundation'
  AND course.org_id IS NULL;

DO $$
BEGIN
  IF (SELECT context_pack_release_id FROM public.learning_course_enrollments WHERE id = '00000000-0000-0000-0000-000000000821')
     IS DISTINCT FROM '00000000-0000-0000-0000-000000000811'::uuid THEN
    RAISE EXCEPTION 'Existing enrollment changed after Context Pack rollout';
  END IF;

  IF (SELECT context_pack_release_id FROM public.learning_course_enrollments WHERE id = '00000000-0000-0000-0000-000000000823')
     IS DISTINCT FROM '00000000-0000-0000-0000-000000000813'::uuid THEN
    RAISE EXCEPTION 'New enrollment did not pin Context Pack A v2';
  END IF;
END;
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000911', true);

DO $$
DECLARE
  visible_count int;
  affected_count int;
BEGIN
  SELECT count(*) INTO visible_count
  FROM public.learning_context_pack_releases;

  IF visible_count <> 3 THEN
    RAISE EXCEPTION 'Org A admin should see all three Org A releases, got %', visible_count;
  END IF;

  UPDATE public.learning_context_pack_releases
  SET context_json = '{"data_rules":["cross-org mutation"]}'::jsonb
  WHERE id = '00000000-0000-0000-0000-000000000812';
  GET DIAGNOSTICS affected_count = ROW_COUNT;

  IF affected_count <> 0 THEN
    RAISE EXCEPTION 'Org A admin updated an Org B Context Pack';
  END IF;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000912', true);

DO $$
BEGIN
  IF (SELECT count(*) FROM public.learning_context_pack_releases) <> 1 THEN
    RAISE EXCEPTION 'Org B admin must only see Org B releases';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.learning_context_pack_releases
    WHERE org_id = '00000000-0000-0000-0000-000000000801'
  ) THEN
    RAISE EXCEPTION 'Org B admin can see Org A Context Packs';
  END IF;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000901', true);

DO $$
BEGIN
  IF (SELECT count(*) FROM public.learning_context_pack_releases) <> 2 THEN
    RAISE EXCEPTION 'Org A learner should see published v2 plus archived pinned v1';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.learning_context_pack_releases
    WHERE id = '00000000-0000-0000-0000-000000000811'
      AND status = 'archived'
  ) THEN
    RAISE EXCEPTION 'Learner cannot read the archived release pinned to the enrollment';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.learning_context_pack_releases
    WHERE id = '00000000-0000-0000-0000-000000000814'
  ) THEN
    RAISE EXCEPTION 'Learner can read a draft Context Pack';
  END IF;
END;
$$;

INSERT INTO public.learning_context_acknowledgements (
  org_id, user_id, enrollment_id, context_pack_release_id
)
VALUES (
  '00000000-0000-0000-0000-000000000801',
  '00000000-0000-0000-0000-000000000901',
  '00000000-0000-0000-0000-000000000821',
  '00000000-0000-0000-0000-000000000811'
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.learning_context_acknowledgements
    WHERE enrollment_id = '00000000-0000-0000-0000-000000000821'
      AND evidence_snapshot->>'context_pack_hash' ~ '^[0-9a-f]{64}$'
      AND (evidence_snapshot->>'context_pack_version')::int = 1
  ) THEN
    RAISE EXCEPTION 'Acknowledgement did not snapshot the pinned Context Pack evidence';
  END IF;
END;
$$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000911', true);

DO $$
DECLARE
  page_record record;
  answers_for_page jsonb;
BEGIN
  FOR page_record IN
    SELECT id, course_id, content
    FROM public.learning_pages
    WHERE course_id = (
      SELECT id FROM public.learning_courses
      WHERE course_code = 'ai-literacy-foundation' AND org_id IS NULL
      LIMIT 1
    )
      AND is_required = true
      AND status = 'published'
  LOOP
    INSERT INTO public.learning_page_progress (
      org_id, user_id, page_id, course_id, status, progress_percentage, completed_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000801',
      '00000000-0000-0000-0000-000000000901',
      page_record.id,
      page_record.course_id,
      'completed',
      100,
      now()
    );

    SELECT COALESCE(
      jsonb_object_agg(
        block->>'id',
        CASE block->>'type'
          WHEN 'scenario' THEN jsonb_build_object(
            'value',
            (
              SELECT choice->>'id'
              FROM jsonb_array_elements(COALESCE(block->'choices', '[]'::jsonb)) choice
              WHERE COALESCE((choice->>'is_recommended')::boolean, false)
              LIMIT 1
            )
          )
          WHEN 'quiz_multiple_choice' THEN jsonb_build_object('value', block->>'correct_option_id')
          WHEN 'quiz_multiple_select' THEN jsonb_build_object('value', block->'correct_option_ids')
          WHEN 'quiz_true_false' THEN jsonb_build_object('value', (block->>'correct_answer')::boolean)
          ELSE jsonb_build_object('value', 'Approved smoke-test response')
        END
      ),
      '{}'::jsonb
    )
    INTO answers_for_page
    FROM jsonb_array_elements(COALESCE(page_record.content->'blocks', '[]'::jsonb)) block
    WHERE COALESCE((block->>'required_for_certificate')::boolean, false);

    INSERT INTO public.learning_page_attempts (
      org_id,
      user_id,
      page_id,
      course_id,
      attempt_number,
      status,
      answers,
      passed,
      manual_review_required,
      graded_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000801',
      '00000000-0000-0000-0000-000000000901',
      page_record.id,
      page_record.course_id,
      1,
      'graded',
      answers_for_page,
      true,
      false,
      now()
    );
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.learning_page_attempts
    WHERE user_id = '00000000-0000-0000-0000-000000000901'
      AND context_pack_release_id = '00000000-0000-0000-0000-000000000811'
      AND content_version_hash ~ '^[0-9a-f]{64}$'
      AND composition_manifest_hash ~ '^[0-9a-f]{64}$'
      AND evidence_snapshot#>>'{organization_context,context_pack_hash}' IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Page attempts did not pin core and Context Pack evidence';
  END IF;
END;
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000901', true);
SELECT *
FROM public.learning_issue_certification_for_enrollment(
  '00000000-0000-0000-0000-000000000821'
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.learning_certifications
    WHERE enrollment_id = '00000000-0000-0000-0000-000000000821'
      AND context_pack_release_id = '00000000-0000-0000-0000-000000000811'
      AND course_version_hash ~ '^[0-9a-f]{64}$'
      AND composition_manifest_hash ~ '^[0-9a-f]{64}$'
      AND evidence_snapshot#>>'{organization_context,acknowledgement,context_pack_hash}' IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Certification did not snapshot core, Context Pack and acknowledgement evidence';
  END IF;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000902', true);

DO $$
BEGIN
  IF (SELECT count(*) FROM public.learning_context_pack_releases) <> 1 THEN
    RAISE EXCEPTION 'Org B learner must only see the published Org B release';
  END IF;
END;
$$;

RESET ROLE;
ROLLBACK;
