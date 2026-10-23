import type { SupabaseClient } from "@supabase/supabase-js";

export type AiFotoExportItem = {
  id: string; org_id: string; scan_wave_id: string; card_type: "waarde" | "aandacht" | "vaardigheid";
  status: string; analysis_version: string; title: string; observation: string;
  interpretation: string; respondent_count: number; evidence_level: string;
  open_questions: string[]; precaution: string | null; follow_up_direction: string | null;
  proposed_owner_role: string | null; review_date: string | null; approved_at: string;
};
export type AiFotoExportSnapshot = {
  organizationName: string; orgId: string; waveId: string; waveName: string;
  methodVersion: string; analysisVersion: string; minCellSize: number;
  generatedAt: string; items: AiFotoExportItem[];
};

/** Use the caller's authenticated client: RLS remains the access boundary. */
export async function loadAiFotoExport(db: SupabaseClient, orgId: string, itemIds: string[]): Promise<AiFotoExportSnapshot> {
  if (itemIds.length < 3 || itemIds.length > 60 || new Set(itemIds).size !== itemIds.length ||
    itemIds.some((id) => !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id))) {
    throw new Error("Selecteer unieke kaartitems voor de drie kaarten (maximaal 60).");
  }
  const [cards, config, organization] = await Promise.all([
    db.from("card_item").select("id,org_id,scan_wave_id,card_type,status,analysis_version,title,observation,interpretation,respondent_count,evidence_level,open_questions,precaution,follow_up_direction,proposed_owner_role,review_date,approved_at")
      .eq("org_id", orgId).in("id", itemIds).order("card_type").order("id").returns<AiFotoExportItem[]>(),
    db.from("scan_scoring_config").select("dashboard_min_cell_size").eq("org_id", orgId).eq("is_active", true).order("effective_from", { ascending: false }).limit(1).maybeSingle(),
    db.from("organizations").select("name").eq("id", orgId).single(),
  ]);
  if (cards.error || config.error || organization.error) throw new Error("Exportgegevens konden niet veilig worden opgehaald.");
  const items = cards.data ?? [];
  const minCellSize = Math.max(5, config.data?.dashboard_min_cell_size ?? 5);
  const waveId = items[0]?.scan_wave_id;
  if (items.length !== itemIds.length || !waveId || new Set(items.map((item) => item.card_type)).size !== 3 ||
    items.some((item) => item.status !== "approved" || !item.approved_at || !item.interpretation?.trim() || item.scan_wave_id !== waveId ||
      item.respondent_count < minCellSize || item.analysis_version !== "ai-foto-analysis-v1" || !["gesteld","aannemelijk"].includes(item.evidence_level))) {
    throw new Error("De drie kaarten vereisen goedgekeurde, voldoende onderbouwde items uit dezelfde scanronde.");
  }
  const wave = await db.from("scan_wave").select("name,method_version").eq("id", waveId).eq("org_id", orgId).eq("product_code", "ai_foto").single();
  if (wave.error || !wave.data.method_version) throw new Error("De scanronde of methode ontbreekt.");
  return {
    items, orgId, waveId, minCellSize, organizationName: organization.data.name,
    waveName: wave.data.name, methodVersion: wave.data.method_version,
    analysisVersion: "ai-foto-analysis-v1", generatedAt: new Date().toISOString(),
  };
}

export async function recordAiFotoPdfExport(db: SupabaseClient, snapshot: AiFotoExportSnapshot, sha256: string, size: number) {
  const { data, error } = await db.rpc("record_ai_foto_pdf_export", {
    p_org_id: snapshot.orgId, p_item_ids: snapshot.items.map((item) => item.id),
    p_sha256: sha256, p_file_size: size, p_generated_at: snapshot.generatedAt,
    p_method_version: snapshot.methodVersion, p_min_cell_size: snapshot.minCellSize,
  });
  if (error || typeof data !== "string") throw new Error("Exportregistratie mislukt; er is geen PDF vrijgegeven. Probeer opnieuw.");
  return data;
}
