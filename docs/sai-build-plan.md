# SAI Build Plan

This document tracks the practical build sequence for the Shadow AI Scan / SAI.

It is the operational checklist. Durable product and architecture decisions still belong in the relevant leading documents.

## Phase 0 - Project Archive And Source Of Truth

Goal: make the repo useful as project memory before implementation starts.

- [x] Create repo documentation structure.
- [x] Add `AGENTS.md` for Codex project instructions.
- [x] Add core docs under `docs/`.
- [x] Add survey HTML references under `design-html/sai/survey/`.
- [x] Add survey source reference under `references/source-docs/`.
- [x] Document that GitHub is the source of truth.
- [x] Document that Lovable exports and older docs are reference material, not active specs.
- [x] Add toolpicker/update-process documentation.

## Phase 1 - Monorepo And Next.js Foundation

Goal: create a lean platform foundation with SAI as the first real app.

- [ ] Initialize workspace package manager and root scripts.
- [ ] Create `apps/sai` as the first Next.js App Router app.
- [ ] Keep `apps/rai` and `apps/marketing` out until there is real implementation work.
- [ ] Add shared package placeholders only where immediately useful:
  - `packages/domain`
  - `packages/database`
  - `packages/auth`
  - `packages/ui`
  - `packages/config`
- [ ] Add `.env.example`.
- [ ] Verify local dev server and basic build.

## Phase 2 - Supabase And Auth Foundation

Goal: connect SAI to Supabase with privacy-safe auth and roles.

- [ ] Use `@supabase/ssr` for Next.js auth.
- [ ] Add server and browser Supabase clients.
- [ ] Add middleware/session refresh.
- [ ] Add server-side role lookup.
- [ ] Reuse/import existing users, organizations, profiles, and roles where possible.
- [ ] Do not migrate old Lovable test scan data.
- [ ] Draft RLS policy spec for:
  - `scan_campaign`
  - `survey_invite`
  - `survey_participation`
  - `survey_run`
- [ ] Ensure DPO/admin views cannot join email addresses directly to content answers.

## Phase 3 - Database Model And Migrations

Goal: turn the product-level database model into executable migrations.

- [ ] Review `docs/database-model.md`.
- [ ] Create initial Supabase migrations.
- [ ] Add reference tables and stable answer codes.
- [ ] Add survey run and child tables.
- [ ] Add risk result tables.
- [ ] Add campaign/invite/participation tables.
- [ ] Add seed strategy for survey reference data.
- [ ] Keep runtime survey data separate from maintenance/research content.

## Phase 4 - Toolpicker Runtime And Update Process

Goal: build a stable runtime toolpicker while preserving the richer update process for later.

- [ ] Review local `Tools & usecases/JSON` files as reference material.
- [ ] Review local `Tools & usecases/Context` files as reference material.
- [ ] Do not import old JSON blindly into production.
- [ ] Define the reviewed runtime subset:
  - categories
  - tools
  - use cases
  - context options used in the respondent flow
  - toolpicker mappings
- [ ] Decide which parts become database seeds versus app configuration.
- [ ] Keep maintenance model content outside runtime until reviewed:
  - risk definitions
  - prompt templates
  - combinations
  - governance flags
  - Model Library enrichment
- [ ] Use `docs/toolpicker-update-process.md` for future updates.

## Phase 5 - Survey Flow

Goal: implement the respondent scan based on the approved HTML and survey spec.

- [ ] Build the intro/start page.
- [ ] Build frequency/AI-use and exit path.
- [ ] Build vakgebied question:
  - "Binnen welk vakgebied ben je voornamelijk actief?"
- [ ] Build tool selection and tool details.
- [ ] Build application/use-case selection.
- [ ] Ask context only where diagnostically useful, especially code/automation/system-control cases.
- [ ] Build datatype and awareness questions.
- [ ] Build account matrix.
- [ ] Build ambassador/contact opt-in.
- [ ] Persist responses server-side.
- [ ] Ensure exit path completes without tool/data/account rows.

## Phase 6 - Risk Engine

Goal: implement V8.1 scoring server-side or server-trusted in shared domain logic.

- [ ] Implement scoring in `packages/domain`.
- [ ] Keep scoring independent from UI components.
- [ ] Use approved V8.1 logic.
- [ ] Preserve approved-tool exposure behavior:
  - approved tool can have `shadow_score = 0`
  - exposure still counts
  - sensitive data can trigger review
- [ ] Handle exit path with `person_score = 0` and no tool result rows.
- [ ] Store audit-friendly results.
- [ ] Add focused tests for scoring edge cases.

## Phase 7 - DPO Dashboard Light

Goal: build the first dashboard set after the survey and scoring layers are stable.

- [ ] Use approved dashboard HTML as visual reference.
- [ ] Build Activatie.
- [ ] Build Tool Inventaris.
- [ ] Build Risicoprofiel.
- [ ] Keep Governance and Rapportage as later modules unless explicitly pulled forward.
- [ ] Do not show individual respondent identities in risk dashboards.
- [ ] Keep public/organization-wide scoreboard out of scope until Rapportage module.

## Phase 8 - Validation And Deployment

Goal: validate the full flow before production.

- [ ] Run local typecheck/build.
- [ ] Run smoke tests for normal path and exit path.
- [ ] Validate RLS behavior.
- [ ] Validate scoring against V8.1 scenarios.
- [ ] Validate dashboard aggregates.
- [ ] Deploy SAI preview to Vercel.
- [ ] Configure Supabase redirect URLs.
- [ ] Only then decide final production route/domain.

## Current Focus

The current focus is completing Phase 0 and then starting Phase 1.

Do not start full RAI, Governance, or Rapportage implementation before the SAI foundation is working.
