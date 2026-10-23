import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const org = "20261023-0000-4000-8000-000000000001";
const wave = "20261023-0000-4000-8000-000000000022";
const otherWave = "20261023-0000-4000-8000-000000000023";
function client() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
async function login(role = "dpo") {
  const db = client();
  const result = await db.auth.signInWithPassword({ email: `${role}@sai-pilot.staging.invalid`, password: process.env.SAI_PILOT_PASSWORD! });
  if (result.error) throw result.error;
  return db;
}

test("database rejects low-cell and forged approval, duplicate generation, wrong scope and draft export", async () => {
  const db = await login();
  const approved = await db.from("card_item").select("*").eq("org_id", org).eq("scan_wave_id", wave).eq("status", "approved");
  expect(approved.error).toBeNull(); expect(approved.data).toHaveLength(3);
  const source = approved.data![0].evidence_refs[0];
  const id = randomUUID();
  const draft = {
    id, org_id: org, scan_wave_id: wave, card_type: "waarde", source_kind: "application_cluster",
    cluster_key: `controlled-pilot-negative-${id}`, analysis_version: "ai-foto-analysis-v1", status: "draft",
    title: "TEST negative validation", observation: "Structured fixture", interpretation: "Reviewer fixture",
    evidence_level: "gesteld", respondent_count: 5, evidence_refs: Array(5).fill(source),
  };
  try {
    const competing = await Promise.all([
      db.from("card_item").insert(draft), db.from("card_item").insert({ ...draft, id: randomUUID() }),
    ]);
    expect(competing.filter((r) => !r.error)).toHaveLength(1);
    expect(competing.find((r) => r.error)?.error?.code).toBe("23505");
    // Find whichever concurrent request won.
    const created = await db.from("card_item").select("id").eq("cluster_key", draft.cluster_key).single();
    expect(created.error).toBeNull();
    const cardId = created.data!.id;
    const update = (patch: Record<string, unknown>) => db.from("card_item").update(patch).eq("id", cardId).select("status").single();
    expect((await update({ status: "approved" })).error?.message).toContain("card_item_review_required");
    expect((await update({ evidence_level: "aangetoond" })).error?.message).toContain("independent_evidence_required");
    expect((await update({ status: "consultant_reviewed" })).error).toBeNull();
    // Five references to one respondent do not satisfy n >= 5.
    expect((await update({ status: "approved" })).error?.message).toContain("card_item_minimum_respondents_required");
    expect((await update({ interpretation: "Changed after review" })).data?.status).toBe("draft");
    expect((await update({ evidence_refs: [{ field: "invalid", value: "x", sourceId: randomUUID() }] })).error).toBeNull();
    await update({ status: "consultant_reviewed" });
    expect((await update({ status: "approved" })).error?.message).toContain("card_item_source_scope_mismatch");
    await update({ evidence_refs: approved.data![0].evidence_refs, respondent_count: approved.data![0].respondent_count, precaution: "gegarandeerd veilig" });
    await update({ status: "consultant_reviewed" });
    expect((await update({ status: "approved" })).error?.message).toContain("card_item_legal_conclusion_blocked");
    expect((await update({ scan_wave_id: otherWave })).error?.message).toContain("card_item_scope_is_immutable");
    const exportAttempt = await db.rpc("record_ai_foto_pdf_export", {
      p_org_id: org, p_item_ids: [cardId, ...approved.data!.slice(1).map((r) => r.id)],
      p_sha256: "0".repeat(64), p_file_size: 1000, p_generated_at: new Date().toISOString(),
      p_method_version: "ai-foto-scan-v1", p_min_cell_size: 5,
    });
    expect(exportAttempt.error?.message).toContain("approved_same_wave_three_cards_required");
    const mismatch = await db.from("card_item").insert({ ...draft, id: randomUUID(), scan_wave_id: otherWave });
    expect(mismatch.error?.message).toContain("card_item_wave_org_mismatch");
    for (const role of ["admin", "super"]) {
      const allowed = await login(role);
      const rows = await allowed.from("card_item").select("id").eq("org_id", org).eq("status", "approved");
      expect(rows.error).toBeNull(); expect(rows.data).toHaveLength(3);
    }
  } finally {
    const cleanup = await db.from("card_item").delete().eq("org_id", org).eq("cluster_key", draft.cluster_key).neq("status", "approved");
    expect(cleanup.error).toBeNull();
  }
});

test("anonymous data access and invalid/cross-run respondent tokens are denied", async () => {
  const db = client();
  expect((await db.from("survey_application").select("id")).error).not.toBeNull();
  expect((await db.rpc("start_survey_run", { p_wave_token: "invalid-pilot-test-code" })).error).not.toBeNull();
  const first = await db.rpc("start_survey_run", { p_wave_token: "ai-foto-pilot-20261023" });
  const second = await db.rpc("start_survey_run", { p_wave_token: "ai-foto-pilot-20261023" });
  expect(first.error).toBeNull(); expect(second.error).toBeNull();
  const a = Array.isArray(first.data) ? first.data[0] : first.data;
  const b = Array.isArray(second.data) ? second.data[0] : second.data;
  const wrong = await db.rpc("save_profile", { p_run_id: a.run_id, p_token: b.submission_token, p_payload: { department_code: "marketing_communicatie" } });
  expect(wrong.error?.message).toContain("invalid_token_or_run_closed");
});
