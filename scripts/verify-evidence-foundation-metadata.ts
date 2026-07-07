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
const smokeTestPath = join(
  root,
  "supabase",
  "smoke-tests",
  "20260707191000_evidence_foundation_smoke.sql",
);

const migration = readFileSync(migrationPath, "utf8");
const docs = readFileSync(docsPath, "utf8");
const adminActions = readFileSync(adminActionsPath, "utf8");
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
  "ADD COLUMN IF NOT EXISTS content_version_hash text",
  "ADD COLUMN IF NOT EXISTS evidence_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb",
  "ADD COLUMN IF NOT EXISTS decision_rationale text",
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

assert.ok(
  adminActions.includes("decision_rationale: reviewerNotes"),
  "Learning review action must persist decision_rationale",
);

assert.ok(
  docs.includes("no blockchain") &&
    docs.includes("platform_event_ledger") &&
    docs.includes("production Supabase main"),
  "Evidence Foundation docs must state scope and production boundary",
);

assert.ok(
  smokeTest.includes("platform_event_ledger must have RLS enabled") &&
    smokeTest.includes("trg_learning_certifications_event"),
  "Smoke test must verify ledger RLS and evidence triggers",
);

console.log("Evidence Foundation metadata verification passed.");
