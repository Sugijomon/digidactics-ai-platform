import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

const ORG = "20261023-0000-4000-8000-000000000001";
const WAVE = "20261023-0000-4000-8000-000000000022";
const rawTask = "TEST PRIVACY SENTINEL: opzet voor een interne werkinstructie";
function client() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
async function signedIn(role = "dpo") {
  const db = client();
  const { error } = await db.auth.signInWithPassword({
    email: `${role}@sai-pilot.staging.invalid`, password: process.env.SAI_PILOT_PASSWORD!,
  });
  if (error) throw new Error(`Fixture login failed: ${error.message}`);
  return db;
}
async function choose(page: Page, value: string, name?: string) {
  const input = page.locator(`input${name ? `[name="${name}"]` : ""}[value="${value}"]`);
  await expect(input).toBeEnabled({ timeout: 15000 });
  if (!(await input.isChecked())) await input.locator("xpath=ancestor::label[1]").click();
  await expect(input).toBeChecked();
}
async function next(page: Page, label = "Volgende stap") {
  await page.getByRole("button", { name: label, exact: true }).click();
}
async function login(page: Page, role = "dpo") {
  await page.goto("/login?next=/dashboard/ai-foto");
  await page.getByLabel("E-mailadres").fill(`${role}@sai-pilot.staging.invalid`);
  await page.locator('input[type="password"]').fill(process.env.SAI_PILOT_PASSWORD!);
  await page.getByRole("button", { name: "Inloggen", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname.startsWith("/dashboard"));
  await page.goto("/dashboard/ai-foto");
  await expect(page.getByRole("heading", { name: "Waarde, aandachtspunten en vaardigheden" })).toBeVisible();
}

async function completeBrowserScan(page: Page, aiFoto: boolean, waveToken?: string, readerRole = "dpo") {
  await page.goto("/survey");
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.getByLabel("Toegangscode").fill(waveToken ?? (aiFoto ? "ai-foto-pilot-20261023" : "sai-pilot-20261023"));
  await page.getByRole("button", { name: "Start de scan" }).click();
  await expect(page).toHaveURL(/\/survey\/profile$/);
  await choose(page, "marketing_communicatie"); await next(page);
  await expect(page).toHaveURL(/\/survey\/motivations$/);
  await choose(page, "weekly"); await choose(page, "tijdswinst"); await next(page);
  await expect(page).toHaveURL(/\/survey\/tools$/);
  await page.getByRole("button", { name: /ChatGPT/ }).click();
  await page.getByRole("button", { name: "Teksten schrijven of bewerken" }).click();
  await page.getByRole("button", { name: "Opslaan", exact: true }).click();
  await expect(page.getByText("1. ChatGPT")).toBeVisible();
  await next(page, "Volgende");
  if (aiFoto) {
    await expect(page).toHaveURL(/\/survey\/application$/);
    await page.locator("textarea").fill(rawTask);
    await choose(page, "weekly", "application_frequency"); await next(page);
    await choose(page, "internal_emails");
    await choose(page, "business_license", "application_account_environment");
    await choose(page, "internal_document", "output_destination");
    await choose(page, "full_manual_check", "output_control"); await next(page);
    await choose(page, "none_visible", "people_impact");
    await choose(page, "visible_to_recipient", "ai_visibility");
    await choose(page, "yes", "ai_transparency");
    await choose(page, "clear", "escalation_route_awareness"); await next(page);
    await choose(page, "time_saving");
    await choose(page, "team", "value_beneficiary");
    await choose(page, "clearly_positive", "net_effect");
    await choose(page, "normal", "control_rework");
    await choose(page, "concrete_example", "value_evidence"); await next(page);
    await choose(page, "yes_same_task", "shareability");
    await next(page, "Verder naar data");
  }
  await expect(page).toHaveURL(/\/survey\/data$/);
  const session = await page.evaluate(() => JSON.parse(sessionStorage.getItem("sai.respondent.session")!));
  expect(session.productCode).toBe(aiFoto ? "ai_foto" : "sai");
  await page.goto("/survey");
  await page.getByRole("link", { name: /Hervat/i }).click();
  await expect(page).toHaveURL(/\/survey\/data$/);
  await choose(page, "interne_email"); await choose(page, "ja_controle"); await choose(page, "soms");
  await next(page, "Volgende");
  await expect(page).toHaveURL(/\/survey\/accounts$/);
  await choose(page, "business_license"); await choose(page, "ja_bewust"); await choose(page, "agents_reeks_taken");
  await next(page);
  await expect(page).toHaveURL(/\/survey\/literacy$/);
  await choose(page, "ja_goed"); await choose(page, "ease_of_use"); await choose(page, "gevorderd"); await choose(page, "controle_handmatig");
  if (aiFoto) await choose(page, "check_sources", "ai_foto_doubt_scenario");
  await next(page);
  await expect(page).toHaveURL(/\/survey\/future$/);
  await choose(page, "privacy"); await choose(page, "clear_policy"); await next(page, "Naar afronding");
  await expect(page).toHaveURL(/\/survey\/complete$/);
  await page.getByRole("button", { name: "Nee, liever niet" }).click();
  await next(page, "Scan afronden");
  await expect(page.getByRole("heading", { name: "Bedankt voor je input" })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("sai.respondent.session"))).toBeNull();
  const anon = client();
  const burned = await anon.rpc("save_profile", { p_run_id: session.runId, p_token: session.submissionToken, p_payload: {} });
  expect(burned.error?.message).toContain("invalid_token_or_run_closed");
  const db = await signedIn(readerRole);
  const score = await db.from("risk_result").select("survey_run_id").eq("survey_run_id", session.runId).single();
  expect(score.error).toBeNull();
  if (aiFoto) {
    const application = await db.from("survey_application").select("id, value_evidence_code").eq("survey_run_id", session.runId).single();
    expect(application.error).toBeNull();
    expect(application.data?.value_evidence_code).toBe("concrete_example");
  }
}

test.describe.serial("controlled pilot against real staging", () => {
  test("SAI browser completion, resume, persisted score and burned token", async ({ page }) => {
    await completeBrowserScan(page, false);
  });
  test("SAI risk dashboard renders actual persisted versioned scores", async ({ page }) => {
    const db = await signedIn();
    const scores = await db.from("risk_result").select("survey_run_id,person_score,highest_priority_score,engine_version,scoring_config_id").eq("org_id", ORG);
    expect(scores.error).toBeNull(); expect(scores.data!.length).toBeGreaterThan(0);
    for (const score of scores.data!) {
      expect(Number.isFinite(Number(score.person_score))).toBe(true);
      expect(Number(score.highest_priority_score)).toBeGreaterThanOrEqual(0);
      expect(score.engine_version).toBe("sai-v8.1-sql-2026-05-22");
      expect(score.scoring_config_id).toBeTruthy();
    }
    await login(page);
    await page.goto("/dashboard/risicoprofiel");
    await expect(page.getByRole("heading", { name: "Risicoprofiel", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: /ChatGPT/ }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Max exposure", exact: true })).toBeVisible();
    await expect(page.getByText("+8pp", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: "../../output/pilot/sai-risk-dashboard.png", fullPage: true });
  });
  for (let i = 1; i <= 5; i++) {
    test(`AI-Foto browser respondent ${i}: completed source and persisted score`, async ({ page }) => {
      await completeBrowserScan(page, true);
    });
  }
  test("card workflow, idempotency, approval integrity and tenant isolation", async ({ page }) => {
    await login(page);
    await expect(page.getByText(rawTask, { exact: false })).toHaveCount(0);
    await page.getByRole("button", { name: "Genereer conceptkaartitems" }).click();
    const db = await signedIn();
    const getCards = () => db.from("card_item").select("*").eq("org_id", ORG).eq("scan_wave_id", WAVE);
    await expect.poll(async () => (await getCards()).data?.length).toBe(3);
    await page.getByRole("button", { name: "Genereer conceptkaartitems" }).click();
    expect((await getCards()).data?.length).toBe(3);
    const cards = (await getCards()).data!;
    for (const card of cards) {
      if (card.status === "approved") continue; // A rerun never rewrites an immutable artifact.
      const article = page.locator("article").filter({ has: page.locator(`input[name="card_item_id"][value="${card.id}"]`) });
      await article.getByLabel("Interpretatie", { exact: true }).fill("Bespreek dit geaggregeerde patroon met het team en controleer de voorwaarden.");
      await article.getByRole("button", { name: "Opslaan", exact: true }).click();
      await expect.poll(async () => (await getCards()).data?.find((x) => x.id === card.id)?.interpretation).toContain("Bespreek dit");
      await article.getByRole("button", { name: "Review klaar", exact: true }).click();
      await expect.poll(async () => (await getCards()).data?.find((x) => x.id === card.id)?.status).toBe("consultant_reviewed");
      await page.getByRole("button", { name: "Genereer conceptkaartitems" }).click();
      expect((await getCards()).data?.find((x) => x.id === card.id)?.status).toBe("consultant_reviewed");
      await article.getByRole("button", { name: "Accorderen", exact: true }).click();
      await expect.poll(async () => (await getCards()).data?.find((x) => x.id === card.id)?.status).toBe("approved");
      const overwrite = await db.from("card_item").update({ title: "must fail" }).eq("id", card.id);
      expect(overwrite.error?.message).toContain("approved_card_item_is_immutable");
    }
    await page.getByRole("button", { name: "Genereer conceptkaartitems" }).click();
    expect((await getCards()).data?.filter((x) => x.status === "approved")).toHaveLength(3);
    for (const role of ["other", "user"]) {
      const other = await signedIn(role);
      const result = await other.from("card_item").select("id").eq("org_id", ORG);
      expect(result.error).toBeNull(); expect(result.data).toEqual([]);
    }
    const anonymous = await client().from("card_item").select("id");
    expect(anonymous.error).not.toBeNull();
    await page.screenshot({ path: "../../output/pilot/ai-foto-workbench.png", fullPage: true });
  });
  test("a real single-respondent cohort stays suppressed in the dashboard and card generation", async ({ page }) => {
    const other = await signedIn("other");
    const id = randomUUID();
    const token = `pilot-small-${id}`;
    const wave = await other.from("scan_wave").insert({
      id, org_id: "20261023-0000-4000-8000-000000000002", name: `TEST privacy ${id}`, status: "active",
      starts_at: new Date(Date.now() - 60000).toISOString(), ends_at: new Date(Date.now() + 3600000).toISOString(),
      wave_token_hash: `\\x${createHash("sha256").update(token).digest("hex")}`, product_code: "ai_foto", method_version: "ai-foto-scan-v1",
    });
    expect(wave.error).toBeNull();
    await completeBrowserScan(page, true, token, "other");
    await login(page, "other");
    await expect(page.getByText(rawTask, { exact: false })).toHaveCount(0);
    await expect(page.getByText("ChatGPT", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Download A3/PDF", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Genereer conceptkaartitems" }).click();
    const cards = await other.from("card_item").select("id").eq("scan_wave_id", id);
    expect(cards.error).toBeNull(); expect(cards.data).toEqual([]);
    await page.screenshot({ path: "../../output/pilot/small-cell-suppression.png", fullPage: true });
    // Preserve the TEST response as evidence; close this short-lived wave.
    expect((await other.from("scan_wave").update({ ends_at: new Date().toISOString() }).eq("id", id)).error).toBeNull();
  });
  test("real approved-only A3 PDF download, provenance, audit and access denial", async ({ page, browser }) => {
    await login(page);
    const db = await signedIn();
    const cards = await db.from("card_item").select("id").eq("org_id", ORG).eq("scan_wave_id", WAVE).eq("status", "approved");
    expect(cards.error).toBeNull(); expect(cards.data).toHaveLength(3);
    const selection = cards.data!.map((x) => x.id).join(",");
    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    const responsePromise = page.waitForResponse((response) => response.url().endsWith("/dashboard/ai-foto/export"));
    await page.getByRole("button", { name: "Download A3/PDF", exact: true }).click();
    const exportResponse = await responsePromise;
    expect(exportResponse.status(), exportResponse.status() === 200 ? "PDF generated" : await exportResponse.text()).toBe(200);
    const download = await downloadPromise;
    await mkdir("../../output/pdf", { recursive: true });
    await download.saveAs("../../output/pdf/ai-foto-pilot.pdf");
    const bytes = await readFile("../../output/pdf/ai-foto-pilot.pdf");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(3);
    for (const sheet of pdf.getPages()) {
      expect(sheet.getWidth()).toBeCloseTo(1190.551, 2);
      expect(sheet.getHeight()).toBeCloseTo(841.89, 2);
    }
    const sha = createHash("sha256").update(bytes).digest("hex");
    const registered = await db.from("report_exports").select("id,filters,file_size_bytes,wave_id").eq("org_id", ORG).eq("export_type", "ai_foto_pdf").order("created_at", { ascending: false }).limit(1).single();
    expect(registered.error).toBeNull();
    expect(registered.data?.filters.sha256).toBe(sha);
    expect(registered.data?.filters.card_item_ids.sort()).toEqual(cards.data!.map((x) => x.id).sort());
    expect(registered.data?.file_size_bytes).toBe(bytes.length);
    expect(registered.data?.wave_id).toBe(WAVE);
    const audit = await db.from("audit_events").select("id").eq("subject_id", registered.data!.id).eq("event_type", "ai_foto.pdf_generated");
    expect(audit.error).toBeNull(); expect(audit.data).toHaveLength(1);
    for (const itemIds of ["", `${selection},${cards.data![0].id}`, "20261023-0000-4000-8000-000000000099"]) {
      const response = await page.request.post("/dashboard/ai-foto/export", { headers: { origin: "http://127.0.0.1:3105" }, form: { selected_item_ids: itemIds } });
      expect(response.status()).toBe(422); expect(response.headers()["content-type"] ?? "").not.toContain("application/pdf");
    }
    const crossOrigin = await page.request.post("/dashboard/ai-foto/export", { headers: { origin: "https://untrusted.invalid" }, form: { selected_item_ids: selection } });
    expect(crossOrigin.status()).toBe(403);
    const anonymous = await browser.newContext();
    const unauthorized = await anonymous.request.post("http://127.0.0.1:3105/dashboard/ai-foto/export", { headers: { origin: "http://127.0.0.1:3105" }, form: { selected_item_ids: selection } });
    expect(unauthorized.status()).toBe(401); await anonymous.close();
    for (const role of ["other", "user"]) {
      const denied = await signedIn(role);
      expect((await denied.from("report_exports").select("id").eq("org_id", ORG)).data).toEqual([]);
      const attempt = await denied.rpc("record_ai_foto_pdf_export", { p_org_id: ORG, p_item_ids: cards.data!.map((x) => x.id), p_sha256: sha, p_file_size: bytes.length, p_generated_at: new Date().toISOString(), p_method_version: "ai-foto-scan-v1", p_min_cell_size: 5 });
      expect(attempt.error?.message).toContain("unauthorized_ai_foto_export");
    }
  });
});
