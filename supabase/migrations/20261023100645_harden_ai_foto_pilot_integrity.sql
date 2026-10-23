BEGIN;

-- Approval and provenance are database invariants, including direct Data API
-- requests and concurrent regeneration. No changes to SAI V8.1 scoring.
CREATE OR REPLACE FUNCTION public.enforce_ai_foto_card_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_min integer;
  v_sources integer;
  v_respondents integer;
  v_wave_org uuid;
  v_product text;
  v_text text;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.status = 'approved' THEN
    RAISE EXCEPTION 'approved_card_item_is_immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.org_id IS DISTINCT FROM OLD.org_id
    OR NEW.scan_wave_id IS DISTINCT FROM OLD.scan_wave_id
    OR NEW.created_by IS DISTINCT FROM OLD.created_by) THEN
    RAISE EXCEPTION 'card_item_scope_is_immutable';
  END IF;
  SELECT org_id, product_code INTO v_wave_org, v_product
    FROM public.scan_wave WHERE id = NEW.scan_wave_id;
  IF v_wave_org IS DISTINCT FROM NEW.org_id OR v_product IS DISTINCT FROM 'ai_foto' THEN
    RAISE EXCEPTION 'card_item_wave_org_mismatch';
  END IF;
  IF NEW.respondent_count < 0 OR jsonb_typeof(NEW.evidence_refs) <> 'array' THEN
    RAISE EXCEPTION 'invalid_card_item_evidence';
  END IF;
  -- Survey evidence alone cannot prove a claim. Independent triangulation
  -- storage/review is outside the controlled pilot.
  IF NEW.evidence_level = 'aangetoond' THEN
    RAISE EXCEPTION 'independent_evidence_required';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft', 'ai_suggested') THEN
      RAISE EXCEPTION 'card_item_must_start_as_draft';
    END IF;
    NEW.created_by := auth.uid();
  END IF;
  IF NEW.status <> 'approved' THEN
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;
  IF NEW.status = 'approved' THEN
    IF TG_OP <> 'UPDATE' OR OLD.status <> 'consultant_reviewed' THEN
      RAISE EXCEPTION 'card_item_review_required';
    END IF;
    IF auth.uid() IS NULL OR NOT (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(NEW.org_id)) THEN
      RAISE EXCEPTION 'unauthorized_card_item_approval';
    END IF;
    -- Approval must attest the stored reviewed version, not change content.
    IF (to_jsonb(NEW) - ARRAY['status','approved_by','approved_at','updated_at'])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','approved_by','approved_at','updated_at']) THEN
      RAISE EXCEPTION 'save_and_review_before_approval';
    END IF;
    IF btrim(NEW.title) = '' OR btrim(NEW.observation) = ''
      OR COALESCE(btrim(NEW.interpretation),'') = ''
      OR NEW.analysis_version <> 'ai-foto-analysis-v1'
      OR jsonb_array_length(NEW.evidence_refs) = 0 THEN
      RAISE EXCEPTION 'card_item_approval_incomplete';
    END IF;
    v_text := lower(concat_ws(' ', NEW.title, NEW.observation, NEW.interpretation,
      array_to_string(NEW.open_questions, ' '), NEW.precaution, NEW.follow_up_direction));
    IF v_text ~ '(avg-proof|compliancegarantie|compliant|dpia verplicht|gegarandeerd veilig|hoog-risico systeem|hoog risico systeem|juridisch toegestaan|verboden volgens eu ai act)' THEN
      RAISE EXCEPTION 'card_item_legal_conclusion_blocked';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.evidence_refs) e
      WHERE jsonb_typeof(e) <> 'object' OR COALESCE(e->>'field','') = ''
        OR COALESCE(e->>'value','') = ''
        OR COALESCE(e->>'sourceId','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') THEN
      RAISE EXCEPTION 'invalid_card_item_source_reference';
    END IF;
    SELECT count(DISTINCT e->>'sourceId') INTO v_sources
      FROM jsonb_array_elements(NEW.evidence_refs) e;
    IF v_sources <> (SELECT count(DISTINCT a.id)
      FROM jsonb_array_elements(NEW.evidence_refs) e
      JOIN public.survey_application a ON a.id = (e->>'sourceId')::uuid
      JOIN public.survey_run r ON r.id = a.survey_run_id
      WHERE r.org_id = NEW.org_id AND r.wave_id = NEW.scan_wave_id
        AND r.product_code_snapshot = 'ai_foto' AND r.completed_at IS NOT NULL) THEN
      RAISE EXCEPTION 'card_item_source_scope_mismatch';
    END IF;
    SELECT count(DISTINCT a.survey_run_id) INTO v_respondents
      FROM jsonb_array_elements(NEW.evidence_refs) e
      JOIN public.survey_application a ON a.id = (e->>'sourceId')::uuid;
    SELECT greatest(5, dashboard_min_cell_size) INTO v_min
      FROM public.scan_scoring_config WHERE org_id = NEW.org_id AND is_active
      ORDER BY effective_from DESC LIMIT 1;
    IF NEW.respondent_count <> v_respondents OR v_respondents < COALESCE(v_min,5) THEN
      RAISE EXCEPTION 'card_item_minimum_respondents_required';
    END IF;
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'consultant_reviewed' AND NEW.status = 'consultant_reviewed'
    AND (to_jsonb(NEW) - ARRAY['updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['updated_at']) THEN
    NEW.status := 'draft';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_ai_foto_card_integrity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enforce_ai_foto_card_integrity
  BEFORE INSERT OR UPDATE OR DELETE ON public.card_item
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ai_foto_card_integrity();

CREATE OR REPLACE FUNCTION public.audit_ai_foto_card_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_events(org_id,event_type,actor_id,actor_kind,subject_table,subject_id,payload)
  VALUES(NEW.org_id,
    CASE WHEN NEW.status = 'approved' THEN 'card_item.approved'
      WHEN TG_OP = 'INSERT' THEN 'card_item.generated' ELSE 'card_item.updated' END,
    auth.uid(), 'user', 'card_item', NEW.id::text,
    jsonb_build_object('status',NEW.status,'analysis_version',NEW.analysis_version,
      'scan_wave_id',NEW.scan_wave_id,'respondent_count',NEW.respondent_count));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_ai_foto_card_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER audit_ai_foto_card_change AFTER INSERT OR UPDATE ON public.card_item
  FOR EACH ROW EXECUTE FUNCTION public.audit_ai_foto_card_change();

COMMIT;
