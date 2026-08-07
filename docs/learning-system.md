# RouteAI Learning System

Status: foundation v0.1.

This document describes the first production-grade Learning System foundation for RouteAI, built on the shared SAI & RAI Supabase database.

Product behavior is specified in `docs/learning-system-product-spec.md`.

## Positioning

The Learning System is a RouteAI module that can run independently while SAI is being completed.

It shares the platform foundation:

- `organizations`
- `profiles`
- `user_roles`
- `audit_events`

It does not depend on SAI survey tables for its core operation.

## Current Source Of Truth

The current authored course model is:

```txt
Course -> Topic -> Page -> JSONB blocks
```

For full courses, the authoritative runtime tables are:

- `learning_courses`
- `learning_topics`
- `learning_pages`
- `learning_page_progress`
- `learning_page_attempts`

`learning_lessons`, `learning_course_lessons`, `learning_lesson_progress`,
and `learning_lesson_attempts` remain for legacy compatibility and the
microlearning library. They are not the preferred structure for the AI Literacy
foundation course.

The Git-canonical AI Literacy design is
`apps/rai/lib/ai-literacy-foundation-content.ts`. Migration
`20260805092242_align_ai_literacy_core_content.sql` promotes its 6-topic,
15-page structure to the database runtime. The local preview uses the same
source when Supabase is unavailable.

For review, `scripts/generate-ai-literacy-foundation-sql.mjs` can generate a
draft SQL sync from that TypeScript source into `supabase/drafts/`. Drafts are
not active migrations until explicitly promoted.

## Why JSONB Content Is Intentional

Page and lesson content is stored as versioned JSONB. This is a deliberate product choice, not a temporary shortcut.

Reasons:

- AI Act interpretation, internal policy, sector examples, and training cases will evolve.
- Pages need to support different block types without schema churn.
- Sector-specific cases can be added without rebuilding the page renderer.
- Content can be reviewed, superseded, and versioned while preserving learner history.

Key fields on `learning_pages`:

- `page_code`
- `topic_id`
- `page_type`
- `content_schema_version`
- `content`
- `version`

The database validates that content is a JSON object with either `blocks[]` or `topics[]`.

## Content Model

The authored RouteAI Learning shape is:

```txt
Course -> Topic -> Page -> JSONB blocks
```

This mirrors the intended learner and authoring experience:

- a left-side topic menu for overview
- multiple pages per topic
- page-level content blocks
- free navigation through available pages
- progress tracking at page level

The preferred page content shape for v1 is:

```json
{
  "version": 1,
  "blocks": [
    {
      "id": "hero",
      "type": "hero",
      "title": "Wat is AI?",
      "subtitle": "Begrijp het systeem voordat je de output vertrouwt."
    }
  ]
}
```

Supported block types are defined in `packages/domain/learning.ts`. Current
runtime blocks include text, callouts, checklists, case labs, multiple-choice
questions, multiple-select questions, true/false questions, open questions,
video placeholders, iframe embeds, and downloads.

The model intentionally allows additional fields per block. Runtime rendering must validate by block `type` and ignore unknown fields safely.

## Tables

Authoritative content:

- `learning_courses`
- `learning_topics`
- `learning_pages`

Legacy and microlearning compatibility:

- `learning_lessons`
- `learning_course_lessons`
- `learning_catalog`

Learner state:

- `learning_course_enrollments`
- `learning_page_progress`
- `learning_page_attempts`
- `learning_lesson_progress`
- `learning_lesson_attempts`
- `learning_certifications`

Access and rule bridge:

- `learning_access_requirements`
- `learning_recommendation_rules`

## Platform Vs Organization Content

Platform content has `org_id = NULL`.

Organization-specific content or overrides use `org_id`.

This supports:

- reusable Digidactics content
- sector modules
- customer-specific policy training
- future partner-created modules

AI Literacy customer context does not use organization-owned page copies.
Instead, published `learning_context_pack_releases` fill a limited set of
`organization_context` slots in the platform pages. Supported slots are:

- `approved_tools`
- `data_rules`
- `policy_link`
- `escalation_route`
- `oversight_roles`
- `sector_case`
- `role_cases`

`learning_catalog.active_context_pack_id` is the release offered to new
learners. `learning_course_enrollments.context_pack_release_id` pins it for the
duration of an enrollment. Published releases are immutable, remain readable
to learners pinned to an archived release, and are protected by org-scoped RLS.
Organizations without a Context Pack see explicit generic fallbacks.

The core assessment remains unchanged. A separate organization acknowledgement
records that the learner read the applicable local policy and escalation route;
it does not change core scoring or the meaning of the certificate.

## Context Pack Pilot Operations

Context Packs are managed as release records, not by editing course pages. The
first pilot deliberately uses SQL instead of a general-purpose admin screen.
`supabase/seed/20260805094000_learning_context_pack_pilot.sql` is the reference
fixture. It is clearly fictitious, fills every supported slot, uses deterministic
ids, and may only be loaded into local or staging environments.

Safe release flow:

1. Insert a new `draft` release for the platform AI Literacy course with a new
   integer version. Never reuse a released version.
2. Have privacy, security, HR/L&D and a representative user review the JSON and
   policy link.
3. Change the approved draft to `published`. Publication pins its content hash
   and timestamp; released content is immutable.
4. Set `learning_catalog.active_context_pack_id` to the published release. Only
   new enrollments receive this active release.
5. Verify that an existing enrollment still points to its old release and that
   a new enrollment points to the replacement.
6. Archive the old release only after the catalog points to its replacement.
   Learners pinned to the archived release retain read access.

Rollback is therefore a forward release, not a mutation: publish a corrected
new version and make that version active for future enrollments. Existing
enrollments remain auditable against their original release. Changing an
existing enrollment pin or editing/deleting a published release is rejected by
database triggers.

Enrollments that already existed before Context Packs were introduced keep a
null pin and continue to receive neutral fallbacks. A routine progress update
must never attach the current catalog release retroactively. If an organization
later wants those learners to receive local context, handle that as an explicit
reviewed migration or start a new enrollment; do not silently rewrite evidence.

Run the transaction-based validation after migrations and before an app pilot:

```powershell
psql "<local-or-staging-database-url>" -v ON_ERROR_STOP=1 `
  -f supabase/smoke-tests/20260805093000_learning_context_packs_smoke.sql
```

The smoke test rolls back its fixtures and validates release immutability,
organization A/B isolation, learner/admin visibility, draft protection,
version pinning, archived-release access, acknowledgement evidence, page
attempt evidence and certification evidence. Run it as the database owner so it
can switch to the `authenticated` role for RLS assertions.

Current limitations:

- there is no Context Pack management UI yet;
- the pilot supports one active pack per organization/course and one pinned
  pack per enrollment;
- changing context for an in-progress enrollment is intentionally unsupported;
- the database migrations, pilot seed and transaction-based Context Pack smoke
  test passed on Supabase preview branch `learning-system-staging-rehearsal` on
  2026-08-05;
- the signed-in staging learner walkthrough passed for all 15 AI Literacy pages;
  manual review and certification issuance remain separate follow-up checks.

## RouteAI Learning Gate

The Learning System exists first as an AI Literacy training and access gate for RouteAI.

The current AI Literacy course is positioned as:

- Product name: `AISA AI Literacy Foundations`
- Alignment: EU AI Act aligned
- Regulatory anchor: EU AI Act Article 4
- Applicability date: February 2, 2025
- Literacy model: risk-based and role-appropriate
- Credential wording: `AISA AI Governance Foundations - v2026.1`
- Credential validity: 12-18 months, followed by a light refresher version

The intended flow:

- A user completes the AI Literacy foundation training.
- Completion acts as a hard access criterion for RouteAI usecase checks.
- RouteAI classifies submitted use cases through its own risk engine.
- Medium and high risk RouteAI outcomes can require additional microlearnings from the learning library.

The first access RPC is `learning_check_capability_access('routeai_usecase_check')`.

SAI scan outputs must not drive learner-facing LS recommendations in the current product. SAI-derived intervention intelligence is parked separately in `docs/sai-intervention-intelligence-parking.md`.

## RLS Model

All learning tables have RLS enabled.

High-level access:

- Platform published content: readable by authenticated users.
- Org content: readable by members of that org.
- Content management: `super_admin`, `content_editor`, or `org_admin` for own org.
- Learner progress: user can read/update own progress.
- Certifications: user can read own certifications; admins/DPOs can read org certifications.
- Access requirements: readable for authenticated users; managed by learning admins.
- Org admin/DPO: can read org progress for governance dashboards.
- Recommendation rules: platform or own-org readable; managed by learning admins.

## Resolved AI Literacy Seed Drift

The repository previously contained two AI Literacy content layers:

1. The SQL migrations seed an older AISA-oriented structure.
2. The TypeScript preview content contains the newer 6-topic, 15-page AI
   Literacy product design.

Migration `20260805092242_align_ai_literacy_core_content.sql` resolves this by
making the TypeScript-authored 6-topic, 15-page design the database seed. The
generator now accepts a migration target and keeps JSON content versions aligned
with page versions. Runtime sync increments page and course versions only when
authored block content changes.

The older SQL seed adds:

- Course: `ai-literacy-foundation`
- Topics:
  - `l1-ai-fundamentals`
  - `l2-risk-responsibility`
  - `l3-responsible-use`
  - `l4-assessment-evidence`
- Pages:
  - `aisa-regulatory-anchor`
  - `aisa-l1-what-counts-as-ai`
  - `aisa-l1-genai-gpai`
  - `aisa-l2-risk-levels`
  - `aisa-l2-workplace-examples`
  - `aisa-l2-prohibited-allowed`
  - `aisa-l3-transparency`
  - `aisa-l3-human-in-the-loop`
  - `aisa-l3-bias-data`
  - `aisa-l3-safe-prompting`
  - `aisa-assessment`
  - `aisa-outputs-evidence`
  - `aisa-versioned-credential`
  - `aisa-positioning`
- Legacy lessons remain available:
  - `ai-literacy-what-is-ai`
  - `ai-literacy-data-and-confidentiality`
  - `ai-literacy-human-oversight`
- Foundation recommendation rules and high-risk microlearning examples.

The newer TypeScript design adds:

- 6 topics matching the GPT AI Literacy design:
  - `basis-en-werkcontext`
  - `wetgeving-en-risicodenken`
  - `data-privacy-prompten`
  - `betrouwbaarheid-outputcontrole`
  - `menselijk-toezicht-toepassen`
  - `assessment-rijbewijs`
- 15 pages, including the previously identified high-value activities:
  - `jouw-startpunt`
  - `scenario-mag-dit-in-de-prompt`
  - `mijn-controleprotocol`
  - `praktijkvoorbeelden`
  - `assessment-en-ai-rijbewijs`

## Next Implementation Steps

1. Add a Next.js learning surface for the AI Literacy foundation course in `apps/rai`. Done.
2. Build a renderer for v1 lesson blocks. Done.
3. Track reliable course completion. First server-action layer is in place for enrollments and lesson progress; it requires an authenticated Supabase session.
4. Wire `learning_check_capability_access` into a server action.
5. Add a trusted certification issue flow after verified AI Literacy completion.
6. Model medium/high RouteAI risk classes to required microlearnings once RouteAI usecase results exist.

## Current App Integration

The first RAI app surface lives in `apps/rai`.

Routes:

- `/learning`
- `/learning/ai-literacy-foundation`
- `/learning/ai-literacy-foundation/[pageCode]`

The dynamic segment is still physically named `[lessonCode]` in the current
Next.js folder for compatibility, but the application now resolves it as a page
code.

The UI reads the AI Literacy course and lessons from Supabase when a valid
session/configuration is available. In local development, it falls back to the
seed-equivalent preview content so the course viewer remains inspectable before
auth is wired.

Server actions:

- `startAiLiteracyCourse`
- `completeAiLiteracyPage`
- `completeAiLiteracyLesson`
- `createLearningPage`
- `updateLearningPageContent`

These actions use the authenticated Supabase session and write to:

- `learning_course_enrollments`
- `learning_page_progress`
- `learning_lesson_progress`

Certificate issuance is deliberately not triggered from the lesson UI yet. The
next step is to add the access-check and certificate issue flow after the RAI
auth/session surface is in place.

## RAI Auth Session

The RAI app has a minimal Supabase magic-link login surface:

- `/auth/login`
- `/auth/check-email`
- `/auth/callback`
- `/auth/sign-out`

Middleware refreshes Supabase cookies so Server Components and Server Actions can
read the authenticated user. Local development currently uses the Supabase dev
branch in `.env.local`.

Supabase Auth must allow the local callback URL during development:

```txt
http://localhost:3010/auth/callback
```

### Canonical local URL and learning routes

The RAI app uses `http://localhost:3010` as the canonical local base URL in
documentation, bookmarks, test instructions, and Supabase Auth configuration.
Start the app on that port with:

```powershell
npm --workspace @digidactics/rai run dev -- -p 3010
```

The learner routes distinguish the course landing page from the lesson player:

- `/learning` is the course and microlearning catalog.
- `/learning/[courseCode]` is a course landing page with course structure and
  learner progress.
- `/learning/[courseCode]/[lessonCode]` is the lesson player for one course
  page.

The brackets indicate route parameters and are not part of a real URL. For
example, the Human in the Loop lesson is available locally at
`http://localhost:3010/learning/ai-literacy-foundation/human-in-the-loop`.

The maintained route overview, including admin and content-editor routes, is in
[`docs/rai-learning-system-urls.md`](./rai-learning-system-urls.md).

Once login succeeds, the Learning System can write enrollments and lesson
progress through the existing server actions.

## Authoring Foundation

`/learning/admin` now contains the first visual authoring foundation for content
editors:

- left-side course structure with topics and pages
- central page canvas with page metadata and editable block forms
- right-side block picker and new-page form
- supported visual block forms: hero, paragraph, callout, key takeaways,
  checklist, case lab, multiple choice, multiple select, true/false,
  essay/reflection, short answer, video, and iframe
- page metadata editing for title, summary, type, duration, and required status
- fallback raw JSON inspector for advanced or not-yet-modeled block types

The editor still writes to the same `learning_pages.content` JSONB structure.
This keeps the backend stable while the authoring UX grows toward the fuller
Lovable-style editor.
