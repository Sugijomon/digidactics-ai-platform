# AI Literacy Learning System Audit

Status: concept audit, created from the current worktree on 2026-05-28.

## Executive Reading

The current RouteAI Learning System should be read as:

```txt
Course -> Topic -> Page -> JSONB blocks
```

The earlier reading "Course -> Lesson only" is outdated for the current app.
That legacy shape still exists in the database and app code, but it is now a
compatibility path and a microlearning path, not the preferred authored course
model for AI Literacy.

## Evidence In The Repo

- `supabase/migrations/20260510120000_learning_topics_pages.sql` creates
  `learning_topics`, `learning_pages`, and `learning_page_progress`.
- `apps/rai/lib/learning-data.ts` loads `learning_topics` first and then
  `learning_pages`; it only falls back to `learning_course_lessons` and
  `learning_lessons` when no topics are available.
- `apps/rai/app/learning/[courseCode]/[lessonCode]/page.tsx` resolves the
  dynamic segment as a page code and builds navigation from
  `course.topics.flatMap(topic => topic.pages)`.
- `apps/rai/components/learning/LearningAdminEditor.tsx` edits pages inside
  topics and writes to `learning_pages.content`.
- `packages/domain/learning.ts` already defines the GPT-design block types,
  including `scenario`, `case_lab`, `reflection`, `comparison`, `checklist`,
  `knowledge_cards`, `progress_check`, `short_answer`, `timeline`,
  `slide_deck`, `accordion`, `image`, and `heading`.
- `apps/rai/components/learning/LessonBlockRenderer.tsx` renders those same
  block types or routes them to dedicated player components.

## Current Source-Of-Truth Drift

There are two active AI Literacy content definitions:

1. SQL migrations:
   - `20260510120000_learning_topics_pages.sql` seeds an early 3-topic,
     6-page version.
   - `20260510143000_aisa_ai_literacy_foundations_content.sql` replaces that
     with an older AISA-oriented 4-topic, 14-page structure.
2. TypeScript preview content:
   - `apps/rai/lib/ai-literacy-foundation-content.ts` contains the newer
     6-topic, 15-page GPT-aligned AI Literacy design.

That means local preview mode can show a richer course than Supabase-backed
mode. This is the most important current consistency gap.

Concept sync artifact:

- `scripts/generate-ai-literacy-foundation-sql.mjs` generates a reviewable SQL
  sync from the TypeScript source.
- `supabase/drafts/20260528_ai_literacy_foundation_15_page_content.sql`
  currently contains the generated 6-topic, 15-page draft for
  `learning_topics` and `learning_pages`.
- The draft archives old non-target topics for the course before inserting the
  15-page structure, so it avoids the existing `(course_id, sequence_order)`
  uniqueness conflict.
- Keep it under `supabase/drafts` until the content direction is approved; move
  it to `supabase/migrations` only when we are ready to make this the live seed.

## What Claude's Audit Got Right

- The legacy export alone is too thin for the target AI Literacy experience.
- The high-value didactic pieces are the scenario, case lab, reflection,
  protocol, safe prompting, and assessment/evidence path.
- The rijbewijs should not be issued from simple course completion alone.
- Competency mapping is not yet a first-class data model.
- Evidence capture for open answers, scenarios, and case labs needs to become
  explicit if the rijbewijs is meant to be auditable.

## What Needs Correction

- The current repo does have a topic layer.
- The current repo does have page-level content blocks.
- Most required block types are already modeled, rendered, and editable.
- The main gap is not "build 13 block types"; it is "make the content,
  evidence, competency, and certification layers agree."

## AI Literacy Design Coverage

The newer TypeScript preview content includes the 15-page GPT shape:

| GPT page | Current TS page code | Status |
| --- | --- | --- |
| P1 Welkom en wat is AI? | `genai` | Present in TS preview |
| P2 Wat telt als AI? | `wat-telt-als-ai` | Present in TS preview |
| P3 Jouw startpunt | `jouw-startpunt` | Present in TS preview |
| P4 EU AI Act | `transparantie` | Present in TS preview |
| P5 Verboden/hoog-risico/transparantie | `verboden-vs-toegestaan` | Present in TS preview |
| P6 Privacy en klantdata | `privacy-klantdata` | Present in TS preview |
| P7 Veilig prompten | `veilig-prompten` | Present in TS preview |
| P8 Scenario promptdata | `scenario-mag-dit-in-de-prompt` | Present in TS preview |
| P9 Hallucinaties/bias | `hallucinaties-bias` | Present in TS preview |
| P10 Outputcontrole | `output-controleren` | Present in TS preview |
| P11 Controleprotocol | `mijn-controleprotocol` | Present in TS preview |
| P12 Human oversight | `human-in-the-loop` | Present in TS preview |
| P13 GroeiKompas/praktijkcase | `praktijkvoorbeelden` | Present in TS preview |
| P14 Rolgerichte mini-cases | `rolgerichte-mini-cases` | Present in TS preview |
| P15 Assessment en rijbewijs | `assessment-en-ai-rijbewijs` | Present in TS preview |

Open question: whether these pages are seeded into the active Supabase database.
The current migrations suggest they are not yet aligned.

## Concept-Phase Removal Candidates

Do not delete these yet. Review them together first.

### Likely Remove Or Replace

- The early seed content in `20260510120000_learning_topics_pages.sql` once a
  final AI Literacy content migration exists. Keep the table creation section,
  but avoid treating its 3-topic/6-page seed as product truth.
- The AISA 4-topic/14-page content in
  `20260510143000_aisa_ai_literacy_foundations_content.sql` if the 6-topic,
  15-page GPT-aligned design is accepted as the product direction.
- Old page-code aliases in `apps/rai/lib/learning-preview-data.ts` after the
  active database no longer contains the AISA page codes and existing links are
  migrated.
- UI copy that still says "lesson" for full-course page flows, unless it is
  deliberately learner-facing Dutch copy. Internally use page terminology for
  `learning_pages`.

### Keep For Now

- `learning_lessons` and `learning_course_lessons`, because microlearning and
  compatibility flows still use them.
- `learning_lesson_progress` and `learning_lesson_attempts`, until all
  microlearning progress flows have a clear page-compatible replacement.
- `getAiLiteracyLesson` and `completeAiLiteracyLesson` wrappers, while old
  routes and compatibility links still exist.
- Legacy export references under `references/`, because they are source
  material rather than active product truth.

### Needs Decision

- Whether the product name should remain AISA in content and credentials, or
  be normalized to RouteAI/AI Literacy wording.
- Whether the active AI Literacy page codes should be Dutch/descriptive
  (`veilig-prompten`) or AISA-coded (`aisa-l3-safe-prompting`).
- Whether old seed migrations should be amended in-place during concept work or
  superseded by a new migration before production reset.

## Next Thin Slice

The highest-value implementation slice is not another renderer. It is an
auditable completion contract.

Partly implemented in this concept pass:

- `packages/domain/learning.ts` now has optional block metadata for
  `competency_codes`, `evidence_kind`, and `required_for_certificate`.
- `apps/rai/lib/ai-literacy-foundation-content.ts` now marks the main
  certificate evidence gates with C1-C8 competency codes and evidence metadata.
- `packages/domain/learning.ts` exposes `isManualReviewEvidenceBlock(...)` so
  manual-review evidence is classified centrally instead of repeated ad hoc in
  server actions.
- `apps/rai/app/learning/actions.ts`,
  `apps/rai/app/learning/admin/actions.ts`, and
  `apps/rai/lib/learning-admin-data.ts` now use that central classifier for
  page attempt, course-completion readiness, and admin review context.
- `apps/rai/components/learning/LearningPageInteraction.tsx` now treats
  `scenario` and `reflection` as answer-producing interactions, so evidence
  gates cannot be marked on content without the learner having a way to submit
  the required answer.
- `packages/domain/learning.ts` now exposes
  `evaluateLearningCertificationEligibility(...)`, which checks required page
  completion, pending manual review, failed attempts, insufficient quiz score,
  and critical competency coverage for C4 data/privacy, C6 human oversight, and
  C8 escalation/evidence.
- `apps/rai/app/learning/actions.ts` and
  `apps/rai/app/learning/admin/actions.ts` use that shared eligibility helper
  before marking `learning_course_enrollments.status = completed`.

Remaining work:

1. Review and extend `competency_codes`, `required_for_certificate`, and
   `evidence_kind` across the full content set if the current first pass is
   accepted.
2. Treat these block types as evidence-producing:
   - `scenario`
   - `case_lab`
   - `reflection`
   - `short_answer`
   - `quiz_essay`
3. Persist attempts through `learning_page_attempts.answers` for evidence
   blocks, not just objective quiz blocks.
4. Add a small competency mapping layer for C1-C8:
   - either JSON metadata on pages/blocks for the concept phase
   - or normalized tables once the model is stable
5. Change certification issue rules from "completed enrollment" toward:
   - calling a trusted certificate issue flow only after the shared eligibility
     contract has marked the enrollment complete
   - optionally mirroring the same eligibility contract in SQL before direct
     `learning_issue_certification_for_enrollment(...)` use is widened beyond
     learning admins

## Proposed Implementation Order

1. Decide that `ai-literacy-foundation-content.ts` is the accepted product
   source for the next migration, or edit it first.
2. Review `supabase/drafts/20260528_ai_literacy_foundation_15_page_content.sql`
   and promote it to a real migration when accepted.
3. Add competency and evidence metadata to the TS design.
4. Extend the attempt persistence path for evidence-producing blocks.
5. Add a server-side certification eligibility function that checks the new
   contract before calling `learning_issue_certification_for_enrollment`.
