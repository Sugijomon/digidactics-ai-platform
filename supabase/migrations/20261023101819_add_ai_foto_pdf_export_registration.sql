BEGIN;

-- Registers a generated direct-download PDF and its audit event atomically.
-- No public bucket, service-role browser credential, or persistent file is used.
CREATE OR REPLACE FUNCTION public.record_ai_foto_pdf_export(
  p_org_id uuid, p_item_ids uuid[], p_sha256 text, p_file_size bigint,
  p_generated_at timestamptz, p_method_version text, p_min_cell_size integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer; v_wave uuid; v_method text; v_min integer; v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_super_admin(auth.uid()) OR public.is_org_admin_or_dpo_for(p_org_id)) THEN
    RAISE EXCEPTION 'unauthorized_ai_foto_export';
  END IF;
  IF COALESCE(cardinality(p_item_ids),0) NOT BETWEEN 3 AND 60
    OR cardinality(p_item_ids) <> (SELECT count(DISTINCT id) FROM unnest(p_item_ids) id)
    OR p_sha256 IS NULL OR p_sha256 !~ '^[0-9a-f]{64}$'
    OR p_file_size IS NULL OR p_file_size NOT BETWEEN 100 AND 20000000
    OR p_generated_at IS NULL OR abs(extract(epoch from now()-p_generated_at)) > 300 THEN
    RAISE EXCEPTION 'invalid_ai_foto_export_request';
  END IF;
  SELECT greatest(5,dashboard_min_cell_size) INTO v_min FROM public.scan_scoring_config
    WHERE org_id=p_org_id AND is_active ORDER BY effective_from DESC LIMIT 1;
  v_min := COALESCE(v_min,5);
  IF p_min_cell_size IS DISTINCT FROM v_min THEN RAISE EXCEPTION 'export_configuration_changed'; END IF;
  SELECT count(*), min(scan_wave_id::text)::uuid INTO v_count,v_wave FROM public.card_item
    WHERE id=ANY(p_item_ids) AND org_id=p_org_id AND status='approved'
      AND approved_at IS NOT NULL AND approved_by IS NOT NULL
      AND respondent_count>=v_min AND analysis_version='ai-foto-analysis-v1'
      AND evidence_level IN ('gesteld','aannemelijk');
  IF v_count <> cardinality(p_item_ids) OR v_wave IS NULL
    OR (SELECT count(DISTINCT scan_wave_id) FROM public.card_item WHERE id=ANY(p_item_ids)) <> 1
    OR (SELECT count(DISTINCT card_type) FROM public.card_item WHERE id=ANY(p_item_ids)) <> 3 THEN
    RAISE EXCEPTION 'approved_same_wave_three_cards_required';
  END IF;
  SELECT method_version INTO v_method FROM public.scan_wave
    WHERE id=v_wave AND org_id=p_org_id AND product_code='ai_foto';
  IF v_method IS NULL OR v_method IS DISTINCT FROM p_method_version THEN
    RAISE EXCEPTION 'export_method_changed';
  END IF;
  INSERT INTO public.report_exports(org_id,wave_id,export_type,export_status,filters,
    file_size_bytes,row_count,view_or_query_version,min_cell_size,k_anonymity_applied,
    suppressed_cell_count,created_by)
  VALUES(p_org_id,v_wave,'ai_foto_pdf','generated',jsonb_build_object(
    'card_item_ids',p_item_ids,'sha256',p_sha256,'generated_at',p_generated_at,
    'method_version',v_method,'analysis_version','ai-foto-analysis-v1',
    'template_version','ai-foto-a3-v1','delivery_mode','direct_download',
    'source_limitations','Survey self-report; no independent triangulation; selected approved items only',
    'suppression_scope','No suppressed items inside selection; smaller source groups excluded upstream'),
    p_file_size,v_count,'ai-foto-a3-v1',v_min,v_min,0,auth.uid()) RETURNING id INTO v_id;
  INSERT INTO public.audit_events(org_id,event_type,actor_id,actor_kind,subject_table,subject_id,payload)
  VALUES(p_org_id,'ai_foto.pdf_generated',auth.uid(),'user','report_exports',v_id::text,
    jsonb_build_object('sha256',p_sha256,'file_size_bytes',p_file_size,'card_item_ids',p_item_ids,
      'scan_wave_id',v_wave,'method_version',v_method,'template_version','ai-foto-a3-v1'));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_ai_foto_pdf_export(uuid,uuid[],text,bigint,timestamptz,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_foto_pdf_export(uuid,uuid[],text,bigint,timestamptz,text,integer) TO authenticated;

COMMIT;
