import { createHash } from "node:crypto";
import { loadAiFotoExport, recordAiFotoPdfExport } from "@digidactics/database/ai-foto";
import { getDashboardAccess } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { createAiFotoPdf } from "@/lib/ai-foto/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  // Next can expose an internal request URL (localhost) behind the listener.
  // Compare the browser's Origin to the incoming Host, never an arbitrary
  // forwarded host. Browsers cannot override Host on a cross-origin form.
  const origin = request.headers.get("origin");
  const expectedOrigin = `${new URL(request.url).protocol}//${request.headers.get("host")}`;
  if (!origin || origin !== expectedOrigin) {
    return new Response("Ongeldige herkomst.", { status: 403, headers });
  }
  const access = await getDashboardAccess();
  if (access.kind !== "authorized") {
    return new Response("Geen toegang tot deze export.", { status: access.kind === "unauthenticated" ? 401 : 403, headers });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 10000) return new Response("Verzoek te groot.", { status: 413, headers });
  try {
    const form = await request.formData();
    const selection = String(form.get("selected_item_ids") ?? "");
    if (selection.length > 2300) return new Response("Te veel kaartitems.", { status: 400, headers });
    const db = await createClient();
    const snapshot = await loadAiFotoExport(db, access.roleState.orgId, selection.split(",").filter(Boolean));
    const bytes = await createAiFotoPdf(snapshot);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const exportId = await recordAiFotoPdfExport(db, snapshot, sha256, bytes.length);
    return new Response(Buffer.from(bytes), {
      headers: {
        ...headers, "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ai-foto-${snapshot.waveId}-${exportId}.pdf"`,
        "X-Export-Id": exportId, "X-Content-SHA256": sha256,
      },
    });
  } catch (error) {
    // These errors contain validation messages, never database payloads or credentials.
    return new Response(error instanceof Error ? error.message : "Export mislukt.", { status: 422, headers });
  }
}
