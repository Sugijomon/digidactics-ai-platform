import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260707190000_evidence_foundation.sql",
);
const docsPath = join(root, "docs", "evidence-foundation.md");
const adminActionsPath = join(root, "apps", "rai", "app", "learning", "admin", "actions.ts");
const learningContentSyncPath = join(root, "apps", "rai", "lib", "learning-content-sync.ts");
const smokeTestPath = join(
  root,
  "supabase",
  "smoke-tests",
  "20260707191000_evidence_foundation_smoke.sql",
);

const migration = readFileSync(migrationPath, "utf8");
const docs = readFileSync(docsPath, "utf8");
const adminActions = readFileSync(adminActionsPath, "utf8");
const learningContentSync = readFileSync(learningContentSyncPath, "utf8");
const smokeTest = readFileSync(smokeTestPath, "utf8");

for (const expected of [
  "CREATE TABLE IF NOT EXISTS public.platform_event_ledger",
  "ALTER TABLE public.platform_event_ledger ENABLE ROW LEVEL SECURITY",
  "CREATE TRIGGER trg_platform_event_ledger_no_mutation",
  "CREATE TRIGGER trg_learning_page_attempts_evidence_pin",
  "CREATE TRIGGER trg_learning_page_attempts_event",
  "CREATE TRIGGER trg_learning_lesson_attempts_evidence_pin",
  "CREATE TRIGGER trg_learning_lesson_attempts_event",
  "CREATE TRIGGER trg_learning_certifications_evidence_pin",
  "CREATE TRIGGER trg_learning_certifications_event",
  "CREATE TRIGGER trg_dpo_review_items_decision_event",
  "CREATE OR REPLACE FUNCTION public.record_learning_content_sync_event",
  "learning.content.synced",
  "ADD COLUMN IF NOT EXISTS content_version_hash text",
  "ADD COLUMN IF NOT EXISTS evidence_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb",
  "ADD COLUMN IF NOT EXISTS decision_rationale text",
  "classification        text NOT NULL DEFAULT 'internal'",
  "actor_kind IN ('system', 'service', 'user', 'admin', 'agent')",
  "REVOKE ALL ON TABLE public.platform_event_ledger FROM PUBLIC, anon, authenticated",
]) {
  assert.ok(migration.includes(expected), `Missing migration marker: ${expected}`);
}

assert.ok(
  /platform_event_ledger_select_self_or_org_guardian[\s\S]+FOR SELECT TO authenticated/.test(
    migration,
  ),
  "Expected org-scoped authenticated select policy for platform_event_ledger",
);

assert.ok(
  /event_hash[\s\S]+public\.digest[\s\S]+'sha256'/.test(migration),
  "Expected sha256 event hash generation",
);

for (const functionName of [
  "pin_learning_page_attempt_evidence",
  "pin_learning_lesson_attempt_evidence",
  "pin_learning_certification_evidence",
]) {
  assert.ok(
    new RegExp(
      `CREATE OR REPLACE FUNCTION public\\.${functionName}\\([\\s\\S]+?SECURITY DEFINER`,
    ).test(migration),
    `${functionName} must run as SECURITY DEFINER`,
  );
}

for (const triggerName of [
  "trg_learning_page_attempts_evidence_pin",
  "trg_learning_lesson_attempts_evidence_pin",
  "trg_learning_certifications_evidence_pin",
]) {
  assert.ok(
    new RegExp(`CREATE TRIGGER ${triggerName}\\s+BEFORE INSERT ON`).test(migration),
    `${triggerName} must pin on INSERT only`,
  );
}

assert.ok(
  !migration.includes("BEFORE INSERT OR UPDATE ON public.learning_page_attempts") &&
    !migration.includes("BEFORE INSERT OR UPDATE ON public.learning_lesson_attempts") &&
    !migration.includes("BEFORE INSERT OR UPDATE ON public.learning_certifications"),
  "Evidence pinning must never overwrite issuance-time snapshots on UPDATE",
);

assert.ok(
  migration.includes("GRANT EXECUTE ON FUNCTION public.record_learning_content_sync_event(uuid, text, jsonb, jsonb)") &&
    migration.includes("TO authenticated, service_role"),
  "Content sync event RPC must be executable by authenticated admins and service_role",
);

assert.ok(
  migration.includes("v_actor_id := COALESCE(NEW.reviewer_id, auth.uid());") &&
    migration.includes("v_actor_kind := CASE WHEN v_actor_id IS NULL THEN 'system' ELSE 'admin' END;"),
  "Reviewed attempt events must attribute service-role auto-grading to system, not the learner",
);

assert.ok(
  adminActions.includes("decision_rationale: reviewerNotes"),
  "Learning review action must persist decision_rationale",
);

assert.ok(
  learningContentSync.includes("recordLearningContentSyncEvent") &&
    learningContentSync.includes('supabase.rpc("record_learning_content_sync_event"') &&
    learningContentSync.includes("content_version_hash: hashJson(canonicalPayload)"),
  "Learning content sync must emit a ledgered content-sync event with a canonical hash",
);

assert.ok(
  migration.includes("hashtextextended(NEW.subject_table || ':' || NEW.subject_id, 0)"),
  "Ledger hash trigger must serialize per-subject hash chains",
);

assert.ok(
  migration.includes("current_setting('request.jwt.claim.role', true)") &&
    migration.includes("public.is_learning_admin_for(v_course.org_id)"),
  "Content sync event RPC must explicitly authorize service_role or learning admins",
);

assert.ok(
  docs.includes("no blockchain") &&
    docs.includes("platform_event_ledger") &&
    docs.includes("production Supabase main") &&
    docs.includes("AI-rijbewijs voor agents") &&
    docs.includes("SAI `audit_events` remains authoritative"),
  "Evidence Foundation docs must state scope and production boundary",
);

assert.ok(
  smokeTest.includes("platform_event_ledger must have RLS enabled") &&
    smokeTest.includes("trg_learning_certifications_event") &&
    smokeTest.includes("record_learning_content_sync_event") &&
    smokeTest.includes("platform_event_ledger', 'classification'"),
  "Smoke test must verify ledger RLS and evidence triggers",
);

console.log("Evidence Foundation metadata verification passed.");
