# Fable Full-System Document Index

Use this index while reviewing the complete tree of
`codex/evidence-foundation` in the public repository
`Sugijomon/digidactics-ai-platform`.

## Conflict rule

When implementation and documentation disagree:

1. treat the current review branch as implementation truth;
2. treat architecture and product documents as intent;
3. report the mismatch explicitly;
4. do not silently expand current migrations to satisfy future-state prose.

No external local document is part of this review. The relevant architecture
findings are represented by the committed gap note and ADR below.

## Start here

- `docs/fable-context/FABLE_CONTEXT_BRIEF.md` — current scope, safety context,
  verification state, and requested decisions.
- `docs/learning-system.md` — implemented Learning model, workflows, roles,
  routes, and operational notes.
- `docs/rai-learning-system-urls.md` — canonical learner, authentication, and
  admin routes for manual review.
- `docs/learning-system-product-spec.md` — product intent.

## Course content and learner rendering

- `apps/rai/lib/ai-literacy-foundation-content.ts`
- `apps/rai/lib/ai-proficiency-content.ts`
- `apps/rai/lib/ai-mastery-content.ts`
- `apps/rai/lib/learning-content-sync.ts`
- `apps/rai/lib/learning-data.ts`
- `apps/rai/app/learning/actions.ts`
- `apps/rai/app/learning/[courseCode]/page.tsx`
- `apps/rai/app/learning/[courseCode]/[lessonCode]/page.tsx`
- `apps/rai/components/learning/LessonBlockRenderer.tsx`
- `apps/rai/components/learning/LearningPageInteraction.tsx`
- `apps/rai/components/learning/CourseStatusPanel.tsx`
- `apps/rai/components/learning/CourseCertificateSuccess.tsx`
- `apps/rai/public/learning/artefacts/`
- `apps/rai/public/downloads/learning/`

Supporting quality evidence:

- `docs/learning-system-ai-literacy-audit.md`
- `docs/rai-learning-design-style-guide.md`
- `scripts/verify-learning-governance-metadata.ts`
- `scripts/learning-parity-tests.ts`

Check all three courses, not only AI Literacy. Assess keyboard and screen-reader
semantics, heading structure, focus/error behavior, contrast assumptions,
alternative representations, Dutch copy, answer logic, and whether referenced
assets exist in Git.

## Organization context and domain logic

- `packages/domain/learning.ts`
- `packages/domain/test/learning-context.test.ts`
- `apps/rai/lib/learning-governance-config.ts`
- `apps/rai/lib/learning-local-content-overrides.ts`
- `apps/rai/app/learning/actions.ts`
- `apps/rai/app/learning/admin/actions.ts`
- `apps/rai/lib/learning-admin-data.ts`

Trace organization membership, context selection/release, acknowledgement,
attempt pinning, manual-review state, reviewer authorization, completion, and
certificate gates end to end.

## Database and staging chain

Read the migrations in timestamp order, with particular attention to:

- `supabase/migrations/20260707190000_evidence_foundation.sql`
- `supabase/migrations/20260805092242_align_ai_literacy_core_content.sql`
- `supabase/migrations/20260805092255_add_learning_context_pack_releases.sql`
- `supabase/migrations/20260805110413_grant_learning_context_policy_helpers.sql`
- `supabase/migrations/20260805110534_grant_learning_certification_issue_to_authenticated.sql`
- `supabase/migrations/20260805110717_fix_learning_certification_issue_ambiguity.sql`
- `supabase/migrations/20260805111011_optimize_learning_context_pack_rls_and_indexes.sql`
- `supabase/migrations/20260805114500_secure_context_hash_triggers.sql`

Also review the earlier Learning foundation/hardening migrations on which these
depend, plus:

- `supabase/seed/20260805094000_learning_context_pack_pilot.sql`
- `supabase/smoke-tests/20260707191000_evidence_foundation_smoke.sql`
- `supabase/smoke-tests/20260805093000_learning_context_packs_smoke.sql`
- `docs/supabase-staging-rehearsal.md`
- `supabase/README.md`
- `outputs/supabase/staging-rehearsal-2026-07-07.md`
- `outputs/supabase/live-migration-preparation-2026-07-07.md`

Review this chain statically. Do not rerun it on staging or production. The
untracked local schema export is deliberately not part of the review source.

## Evidence and certification

- `docs/evidence-foundation.md`
- `docs/learning-evidence-dossier-spec.md`
- `docs/platform-information-architecture-gap.md`
- `docs/adr/ADR-EF-2-agent-ready-envelope.md`
- `scripts/verify-evidence-foundation-metadata.ts`
- `apps/rai/app/learning/admin/reviews/page.tsx`
- `apps/rai/app/learning/admin/actions.ts`

Verify append-only behavior, authorization, context/content/evidence hashes,
review rationale, event completeness, replay/reconstruction expectations, and
certificate issuance gates. Keep agentic governance and wider future-state
modeling outside current scope unless a present design choice causes
irreversible evidence loss.

## Branch and diff interpretation

- Inspect the full `codex/evidence-foundation` tree for the system review.
- Use PR #3 to understand how the Learning System differs from `main`.
- Use PR #4 to isolate the later evidence, context, staging, content, and route
  changes.
- Do not treat PR #4's base tree as absent or already approved.
- Do not merge, deploy, or mutate either Supabase environment.

## Required review result

Return separate go/no-go recommendations for staging completion, PR #4 into
its integration base, PR #3 into `main`, and eventual production rollout.
Every blocker should cite concrete repository evidence and the smallest safe
remedy.
