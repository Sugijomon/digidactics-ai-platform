-- =============================================================================
-- RouteAI Learning organization Context Pack releases
-- =============================================================================

CREATE OR REPLACE FUNCTION public.learning_context_pack_is_valid(_context jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  item jsonb;
BEGIN
  IF jsonb_typeof(_context) <> 'object' THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(_context) AS key_name
    WHERE key_name NOT IN (
      'organization', 'approved_tools', 'data_rules', 'policy_link',
      'escalation_route', 'oversight_roles', 'sector_case', 'role_cases'
    )
  ) THEN
    RETURN false;
  END IF;

  IF _context ? 'organization' AND (
    jsonb_typeof(_context->'organization') <> 'object'
    OR EXISTS (
      SELECT 1 FROM jsonb_object_keys(_context->'organization') AS key_name
      WHERE key_name NOT IN ('name', 'sector')
    )
    OR EXISTS (
      SELECT 1 FROM jsonb_each(_context->'organization') item
      WHERE jsonb_typeof(item.value) <> 'string'
    )
  ) THEN
    RETURN false;
  END IF;

  IF _context ? 'approved_tools' THEN
    IF jsonb_typeof(_context->'approved_tools') <> 'array' THEN RETURN false; END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(_context->'approved_tools') LOOP
      IF jsonb_typeof(item) <> 'object'
         OR COALESCE(item->>'name', '') = ''
         OR (item ? 'guidance' AND jsonb_typeof(item->'guidance') <> 'string')
         OR EXISTS (
           SELECT 1 FROM jsonb_object_keys(item) AS key_name
           WHERE key_name NOT IN ('name', 'guidance')
         ) THEN
        RETURN false;
      END IF;
    END LOOP;
  END IF;

  IF _context ? 'data_rules' AND (
    jsonb_typeof(_context->'data_rules') <> 'array'
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(_context->'data_rules') value WHERE jsonb_typeof(value) <> 'string')
  ) THEN RETURN false; END IF;

  IF _context ? 'oversight_roles' AND (
    jsonb_typeof(_context->'oversight_roles') <> 'array'
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(_context->'oversight_roles') value WHERE jsonb_typeof(value) <> 'string')
  ) THEN RETURN false; END IF;

  IF _context ? 'policy_link' AND (
    jsonb_typeof(_context->'policy_link') <> 'object'
    OR COALESCE(_context#>>'{policy_link,label}', '') = ''
    OR COALESCE(_context#>>'{policy_link,url}', '') !~ '^https?://'
    OR EXISTS (
      SELECT 1 FROM jsonb_object_keys(_context->'policy_link') AS key_name
      WHERE key_name NOT IN ('label', 'url')
    )
  ) THEN RETURN false; END IF;

  IF _context ? 'escalation_route' AND (
    jsonb_typeof(_context->'escalation_route') <> 'object'
    OR EXISTS (
      SELECT 1 FROM jsonb_object_keys(_context->'escalation_route') AS key_name
      WHERE key_name NOT IN ('summary', 'steps', 'contact_role', 'contact_email')
    )
    OR EXISTS (
      SELECT 1 FROM jsonb_each(_context->'escalation_route') item
      WHERE item.key <> 'steps' AND jsonb_typeof(item.value) <> 'string'
    )
    OR (
      (_context->'escalation_route') ? 'steps'
      AND (
        jsonb_typeof(_context#>'{escalation_route,steps}') <> 'array'
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(_context#>'{escalation_route,steps}') value
          WHERE jsonb_typeof(value) <> 'string'
        )
      )
    )
  ) THEN RETURN false; END IF;

  IF _context ? 'sector_case' AND (
    jsonb_typeof(_context->'sector_case') <> 'object'
    OR COALESCE(_context#>>'{sector_case,title}', '') = ''
    OR COALESCE(_context#>>'{sector_case,description}', '') = ''
    OR EXISTS (
      SELECT 1 FROM jsonb_object_keys(_context->'sector_case') AS key_name
      WHERE key_name NOT IN ('title', 'description')
    )
  ) THEN RETURN false; END IF;

  IF _context ? 'role_cases' THEN
    IF jsonb_typeof(_context->'role_cases') <> 'array' THEN RETURN false; END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(_context->'role_cases') LOOP
      IF jsonb_typeof(item) <> 'object'
         OR COALESCE(item->>'role', '') = ''
         OR COALESCE(item->>'title', '') = ''
         OR COALESCE(item->>'description', '') = ''
         OR EXISTS (
           SELECT 1 FROM jsonb_object_keys(item) AS key_name
           WHERE key_name NOT IN ('role', 'title', 'description')
         ) THEN
        RETURN false;
      END IF;
    END LOOP;
  END IF;

  RETURN true;
END;
$$;

CREATE TABLE public.learning_context_pack_releases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  version         int NOT NULL,
  status          text NOT NULL DEFAULT 'draft',
  context_json    jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash    text NOT NULL DEFAULT '',
  created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  published_at    timestamptz,
  CONSTRAINT learning_context_pack_version_chk CHECK (version > 0),
  CONSTRAINT learning_context_pack_status_chk CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT learning_context_pack_json_chk CHECK (public.learning_context_pack_is_valid(context_json)),
  CONSTRAINT learning_context_pack_hash_chk CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT learning_context_pack_scope_version_unique UNIQUE (org_id, course_id, version),
  CONSTRAINT learning_context_pack_id_scope_unique UNIQUE (id, org_id, course_id)
);

CREATE INDEX learning_context_pack_org_course_status_idx
  ON public.learning_context_pack_releases(org_id, course_id, status, version DESC);

CREATE OR REPLACE FUNCTION public.prepare_learning_context_pack_release()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('published', 'archived') THEN
      RAISE EXCEPTION 'Released Context Packs are immutable and cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IN ('published', 'archived') AND (
    NEW.org_id IS DISTINCT FROM OLD.org_id
    OR NEW.course_id IS DISTINCT FROM OLD.course_id
    OR NEW.version IS DISTINCT FROM OLD.version
    OR NEW.context_json IS DISTINCT FROM OLD.context_json
    OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.published_at IS DISTINCT FROM OLD.published_at
  ) THEN
    RAISE EXCEPTION 'Released Context Pack % is immutable', OLD.id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'published' AND NEW.status NOT IN ('published', 'archived') THEN
    RAISE EXCEPTION 'A published Context Pack can only remain published or be archived';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'archived' AND NEW.status <> 'archived' THEN
    RAISE EXCEPTION 'An archived Context Pack cannot be reactivated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.learning_courses course
    WHERE course.id = NEW.course_id AND course.org_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Context Packs can only target a platform core course';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = 'published'
     AND NEW.status = 'archived'
     AND EXISTS (
       SELECT 1 FROM public.learning_catalog catalog
       WHERE catalog.active_context_pack_id = OLD.id
     ) THEN
    RAISE EXCEPTION 'Activate a replacement Context Pack before archiving release %', OLD.id;
  END IF;

  NEW.content_hash := encode(public.digest(NEW.context_json::text, 'sha256'), 'hex');
  NEW.updated_at := now();

  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_learning_context_pack_prepare
  BEFORE INSERT OR UPDATE OR DELETE ON public.learning_context_pack_releases
  FOR EACH ROW EXECUTE FUNCTION public.prepare_learning_context_pack_release();

ALTER TABLE public.learning_catalog
  ADD COLUMN active_context_pack_id uuid;

ALTER TABLE public.learning_catalog
  ADD CONSTRAINT learning_catalog_active_context_pack_fk
  FOREIGN KEY (active_context_pack_id, org_id, course_id)
  REFERENCES public.learning_context_pack_releases(id, org_id, course_id)
  ON DELETE RESTRICT;

ALTER TABLE public.learning_course_enrollments
  ADD COLUMN context_pack_release_id uuid;

ALTER TABLE public.learning_course_enrollments
  ADD CONSTRAINT learning_enrollment_context_pack_fk
  FOREIGN KEY (context_pack_release_id, org_id, course_id)
  REFERENCES public.learning_context_pack_releases(id, org_id, course_id)
  ON DELETE RESTRICT;

CREATE INDEX learning_enrollment_context_pack_idx
  ON public.learning_course_enrollments(context_pack_release_id);

CREATE OR REPLACE FUNCTION public.validate_learning_catalog_context_pack()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.active_context_pack_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.course_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.learning_context_pack_releases context_pack
    WHERE context_pack.id = NEW.active_context_pack_id
      AND context_pack.org_id = NEW.org_id
      AND context_pack.course_id = NEW.course_id
      AND context_pack.status = 'published'
  ) THEN
    RAISE EXCEPTION 'Active Context Pack must be a published release for the same organization and course';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_learning_catalog_context_pack_validate
  BEFORE INSERT OR UPDATE OF active_context_pack_id, org_id, course_id ON public.learning_catalog
  FOR EACH ROW EXECUTE FUNCTION public.validate_learning_catalog_context_pack();

CREATE OR REPLACE FUNCTION public.pin_learning_enrollment_context_pack()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  active_context_pack_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.context_pack_release_id IS DISTINCT FROM OLD.context_pack_release_id THEN
    RAISE EXCEPTION 'An enrollment Context Pack release cannot be changed after it is pinned';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  SELECT catalog.active_context_pack_id
    INTO active_context_pack_id
    FROM public.learning_catalog catalog
    WHERE catalog.org_id = NEW.org_id
      AND catalog.course_id = NEW.course_id
      AND catalog.is_enabled = true
    LIMIT 1;

  IF NEW.context_pack_release_id IS NOT NULL
     AND NEW.context_pack_release_id IS DISTINCT FROM active_context_pack_id THEN
    RAISE EXCEPTION 'A new enrollment must use the active Context Pack for its organization and course';
  END IF;

  NEW.context_pack_release_id := active_context_pack_id;

  IF NEW.context_pack_release_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.learning_context_pack_releases context_pack
    WHERE context_pack.id = NEW.context_pack_release_id
      AND context_pack.org_id = NEW.org_id
      AND context_pack.course_id = NEW.course_id
      AND context_pack.status = 'published'
  ) THEN
    RAISE EXCEPTION 'Enrollment Context Pack must belong to the same organization and course';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_learning_enrollment_context_pack_pin
  BEFORE INSERT OR UPDATE ON public.learning_course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.pin_learning_enrollment_context_pack();

CREATE TABLE public.learning_context_acknowledgements (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id                 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrollment_id           uuid NOT NULL REFERENCES public.learning_course_enrollments(id) ON DELETE CASCADE,
  context_pack_release_id uuid NOT NULL REFERENCES public.learning_context_pack_releases(id) ON DELETE RESTRICT,
  acknowledged_at         timestamptz NOT NULL DEFAULT now(),
  evidence_snapshot       jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT learning_context_ack_snapshot_chk CHECK (jsonb_typeof(evidence_snapshot) = 'object'),
  CONSTRAINT learning_context_ack_unique UNIQUE (enrollment_id, context_pack_release_id)
);

CREATE INDEX learning_context_ack_org_user_idx
  ON public.learning_context_acknowledgements(org_id, user_id, acknowledged_at DESC);

CREATE OR REPLACE FUNCTION public.validate_learning_context_acknowledgement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  context_pack public.learning_context_pack_releases%ROWTYPE;
BEGIN
  SELECT * INTO context_pack
  FROM public.learning_context_pack_releases
  WHERE id = NEW.context_pack_release_id;

  IF NOT FOUND OR NOT EXISTS (
    SELECT 1
    FROM public.learning_course_enrollments enrollment
    WHERE enrollment.id = NEW.enrollment_id
      AND enrollment.org_id = NEW.org_id
      AND enrollment.user_id = NEW.user_id
      AND enrollment.context_pack_release_id = NEW.context_pack_release_id
  ) THEN
    RAISE EXCEPTION 'Acknowledgement must match the learner enrollment and pinned Context Pack';
  END IF;

  NEW.evidence_snapshot := jsonb_strip_nulls(
    COALESCE(NEW.evidence_snapshot, '{}'::jsonb)
    || jsonb_build_object(
      'context_pack_release_id', context_pack.id,
      'context_pack_version', context_pack.version,
      'context_pack_hash', context_pack.content_hash,
      'acknowledged_at', NEW.acknowledged_at
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_learning_context_ack_validate
  BEFORE INSERT ON public.learning_context_acknowledgements
  FOR EACH ROW EXECUTE FUNCTION public.validate_learning_context_acknowledgement();

ALTER TABLE public.learning_page_attempts
  ADD COLUMN context_pack_release_id uuid REFERENCES public.learning_context_pack_releases(id) ON DELETE RESTRICT,
  ADD COLUMN composition_manifest_hash text;

ALTER TABLE public.learning_certifications
  ADD COLUMN context_pack_release_id uuid REFERENCES public.learning_context_pack_releases(id) ON DELETE RESTRICT,
  ADD COLUMN composition_manifest_hash text;

CREATE INDEX learning_page_attempts_context_pack_idx
  ON public.learning_page_attempts(context_pack_release_id);

CREATE INDEX learning_certifications_context_pack_idx
  ON public.learning_certifications(context_pack_release_id);

-- Attempts pin the core/context release at submission. Later manual review must
-- not silently repin an old attempt to newer content.
DROP TRIGGER IF EXISTS trg_learning_page_attempts_evidence_pin ON public.learning_page_attempts;
CREATE TRIGGER trg_learning_page_attempts_evidence_pin
  BEFORE INSERT ON public.learning_page_attempts
  FOR EACH ROW EXECUTE FUNCTION public.pin_learning_page_attempt_evidence();

CREATE OR REPLACE FUNCTION public.pin_learning_page_attempt_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  enrollment public.learning_course_enrollments%ROWTYPE;
  context_pack public.learning_context_pack_releases%ROWTYPE;
  context_slots jsonb := '[]'::jsonb;
  manifest jsonb;
BEGIN
  SELECT * INTO enrollment
  FROM public.learning_course_enrollments
  WHERE user_id = NEW.user_id AND course_id = NEW.course_id;

  IF FOUND AND enrollment.context_pack_release_id IS NOT NULL THEN
    SELECT * INTO context_pack
    FROM public.learning_context_pack_releases
    WHERE id = enrollment.context_pack_release_id;
  END IF;

  SELECT COALESCE(jsonb_agg(slot ORDER BY slot), '[]'::jsonb)
  INTO context_slots
  FROM (
    SELECT DISTINCT block->>'slot' AS slot
    FROM public.learning_pages page,
         jsonb_array_elements(COALESCE(page.content->'blocks', '[]'::jsonb)) block
    WHERE page.id = NEW.page_id
      AND block->>'type' = 'organization_context'
      AND block ? 'slot'
  ) slots;

  manifest := jsonb_strip_nulls(jsonb_build_object(
    'core_page_hash', NEW.content_version_hash,
    'context_pack_release_id', context_pack.id,
    'context_pack_version', context_pack.version,
    'context_pack_hash', context_pack.content_hash,
    'context_slots_used', context_slots
  ));

  NEW.context_pack_release_id := context_pack.id;
  NEW.composition_manifest_hash := encode(public.digest(manifest::text, 'sha256'), 'hex');
  NEW.evidence_snapshot := jsonb_strip_nulls(
    COALESCE(NEW.evidence_snapshot, '{}'::jsonb)
    || jsonb_build_object(
      'organization_context', jsonb_strip_nulls(jsonb_build_object(
        'context_pack_release_id', context_pack.id,
        'context_pack_version', context_pack.version,
        'context_pack_hash', context_pack.content_hash,
        'context_slots_used', context_slots
      )),
      'composition_manifest_hash', NEW.composition_manifest_hash
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_learning_page_attempts_evidence_pin_context
  BEFORE INSERT ON public.learning_page_attempts
  FOR EACH ROW EXECUTE FUNCTION public.pin_learning_page_attempt_context();

CREATE OR REPLACE FUNCTION public.pin_learning_certification_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  enrollment public.learning_course_enrollments%ROWTYPE;
  context_pack public.learning_context_pack_releases%ROWTYPE;
  acknowledgement jsonb;
  manifest jsonb;
BEGIN
  SELECT * INTO enrollment
  FROM public.learning_course_enrollments
  WHERE id = NEW.enrollment_id AND user_id = NEW.user_id AND course_id = NEW.course_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certification enrollment does not match learner and course';
  END IF;

  IF enrollment.context_pack_release_id IS NOT NULL THEN
    SELECT * INTO context_pack
    FROM public.learning_context_pack_releases
    WHERE id = enrollment.context_pack_release_id;

    SELECT ack.evidence_snapshot INTO acknowledgement
    FROM public.learning_context_acknowledgements ack
    WHERE ack.enrollment_id = enrollment.id
      AND ack.context_pack_release_id = context_pack.id;
  END IF;

  manifest := jsonb_strip_nulls(jsonb_build_object(
    'core_course_hash', NEW.course_version_hash,
    'context_pack_release_id', context_pack.id,
    'context_pack_version', context_pack.version,
    'context_pack_hash', context_pack.content_hash
  ));

  NEW.context_pack_release_id := context_pack.id;
  NEW.composition_manifest_hash := encode(public.digest(manifest::text, 'sha256'), 'hex');
  NEW.evidence_snapshot := jsonb_strip_nulls(
    COALESCE(NEW.evidence_snapshot, '{}'::jsonb)
    || jsonb_build_object(
      'organization_context', jsonb_strip_nulls(jsonb_build_object(
        'context_pack_release_id', context_pack.id,
        'context_pack_version', context_pack.version,
        'context_pack_hash', context_pack.content_hash,
        'acknowledgement', acknowledgement
      )),
      'composition_manifest_hash', NEW.composition_manifest_hash
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_learning_certifications_evidence_pin_context
  BEFORE INSERT OR UPDATE ON public.learning_certifications
  FOR EACH ROW EXECUTE FUNCTION public.pin_learning_certification_context();

CREATE OR REPLACE FUNCTION public.validate_learning_certification_attempt_versions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  enrollment public.learning_course_enrollments%ROWTYPE;
  invalid_page_code text;
BEGIN
  SELECT * INTO enrollment
  FROM public.learning_course_enrollments
  WHERE id = NEW.enrollment_id AND user_id = NEW.user_id AND course_id = NEW.course_id;

  SELECT page.page_code INTO invalid_page_code
  FROM public.learning_pages page
  WHERE page.course_id = NEW.course_id
    AND page.status = 'published'
    AND page.is_required = true
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(page.content->'blocks', '[]'::jsonb)) block
      WHERE COALESCE((block->>'required_for_certificate')::boolean, false)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.learning_page_attempts attempt
      WHERE attempt.user_id = NEW.user_id
        AND attempt.course_id = NEW.course_id
        AND attempt.page_id = page.id
        AND attempt.content_version_hash = encode(public.digest(page.content::text, 'sha256'), 'hex')
        AND attempt.context_pack_release_id IS NOT DISTINCT FROM enrollment.context_pack_release_id
        AND attempt.attempt_number = (
          SELECT max(latest.attempt_number)
          FROM public.learning_page_attempts latest
          WHERE latest.user_id = NEW.user_id
            AND latest.course_id = NEW.course_id
            AND latest.page_id = page.id
        )
    )
  LIMIT 1;

  IF invalid_page_code IS NOT NULL THEN
    RAISE EXCEPTION 'Certification rejected: page % has no latest attempt for the pinned core/context release', invalid_page_code;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_learning_certifications_evidence_pin_consistency
  BEFORE INSERT OR UPDATE ON public.learning_certifications
  FOR EACH ROW EXECUTE FUNCTION public.validate_learning_certification_attempt_versions();

ALTER TABLE public.learning_context_pack_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_context_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY learning_context_pack_select_org
  ON public.learning_context_pack_releases
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (
      org_id = public.get_user_org_id(auth.uid())
      AND (
        status = 'published'
        OR public.is_learning_admin_for(org_id)
        OR public.is_org_admin_or_dpo_for(org_id)
        OR EXISTS (
          SELECT 1
          FROM public.learning_course_enrollments enrollment
          WHERE enrollment.user_id = auth.uid()
            AND enrollment.context_pack_release_id = learning_context_pack_releases.id
        )
      )
    )
  );

CREATE POLICY learning_context_pack_manage_admin
  ON public.learning_context_pack_releases
  FOR ALL TO authenticated
  USING (public.is_learning_admin_for(org_id) OR public.is_org_admin_or_dpo_for(org_id))
  WITH CHECK (public.is_learning_admin_for(org_id) OR public.is_org_admin_or_dpo_for(org_id));

CREATE POLICY learning_context_ack_select_self_or_admin
  ON public.learning_context_acknowledgements
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(org_id)
  );

CREATE POLICY learning_context_ack_insert_self
  ON public.learning_context_acknowledgements
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND org_id = public.get_user_org_id(auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_context_pack_releases TO authenticated;
GRANT SELECT, INSERT ON public.learning_context_acknowledgements TO authenticated;

REVOKE ALL ON FUNCTION public.learning_context_pack_is_valid(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.learning_context_pack_is_valid(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.prepare_learning_context_pack_release() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_learning_catalog_context_pack() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pin_learning_enrollment_context_pack() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_learning_context_acknowledgement() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pin_learning_page_attempt_context() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pin_learning_certification_context() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_learning_certification_attempt_versions() FROM PUBLIC, anon, authenticated;
