# Domain Decisions

## 2026-05-22 - SAI Pilot Hardening And Live Supabase Validation

The SAI Supabase pilot now treats respondent RPCs as the only anonymous write
surface. `start_survey_run`, `complete_survey_run`, the `save_*` RPCs,
`set_ambassador_optin`, and `register_tool_discovery` intentionally remain
callable by `anon` because they validate a server-generated submission token and
derive organization context from `survey_run`.

Non-respondent helper functions are no longer callable by `anon`, and
`user_roles` now has explicit RLS policies for self-read, same-organization
DPO/admin read, and super-admin writes. The remaining Supabase advisor warnings
for `SECURITY DEFINER` functions are accepted only as a short-term pilot shape;
a later hardening sprint should move internal helpers and DPO/admin wrappers out
of the exposed `public` API surface where feasible.

Live validation against the Supabase project confirmed that anonymous direct
table inserts remain blocked, direct scoring is not executable by `anon`, and a
completed respondent run writes `risk_result` and `risk_result_tool` records via
`complete_survey_run`.

## 2026-05-22 - DPO Risk Profile Dashboard KPIs

The first SAI DPO risk profile dashboard uses persisted V8.1 scoring results as
its source of truth. The page reports aggregate scan and tool risk signals:
scored runs, DPO-review runs, critical tools, average highest priority score,
priority matrix counts, review trigger counts, and a tool-level review queue.

These KPIs are operational triage indicators. They are not employee performance
metrics and must not expose individual respondent profiles. Legal or formal
governance conclusions remain a later DPO review workflow decision.

## 2026-05-22 - Scan Completion Calculates V8.1 Risk Results

`public.complete_survey_run(...)` remains the respondent-facing closing RPC and
now relies on `public.calculate_v8_score(...)` to persist run-level and
tool-level risk output immediately after token burn. The scoring function writes
`risk_result`, `risk_result_tool`, `dpo_review_items`, and a `score.calculated`
audit event using only codes, scores, thresholds, and aggregate metadata.

Custom or newly discovered tools may not have an immutable policy snapshot
because `org_tool_policy_snapshot.tool_code` must reference the curated
`tools_library`. For those cases, `risk_result_tool.policy_snapshot_id` may be
null while the policy status code snapshot remains persisted in
`survey_tool.org_policy_status_code_snapshot` and repeated in the score
breakdown. This keeps unknown tools scoreable without inventing catalog rows.

## 2026-05-12 - Survey Profile RPC Supports Partial Updates

The respondent flow now follows the canonical HTML prototype screens more
closely, which means profile-like fields are collected across several screens
instead of in one technical form. `public.save_profile(...)` preserves existing
`survey_profile` values when a later payload omits a field, so screens such as
datatype, skill level, and future needs can safely append their own answers
without erasing earlier work context or frequency answers.

Rationale: this keeps the respondent experience aligned with the high-fidelity
SAI survey design while retaining a single profile row per survey run.

This document records durable decisions for the Digidactics AI Platform. Codex and ChatGPT conversations are not durable project memory; decisions that affect product behavior, compliance logic, architecture, schema, RLS, scoring, or dashboard language must be captured here.

## Decision: GitHub Is The Source Of Truth

GitHub is the source of truth for:

- code
- schema
- migrations
- product decisions
- domain decisions
- risk-engine specifications
- architecture notes
- deployment workflow

Codex local sessions and ChatGPT mobile conversations are temporary working context.

Any decision that affects risk scoring, EU AI Act interpretation, Supabase schema/RLS, dashboard KPIs, user-facing governance language, auditability, or evidence storage must be documented in this repository.

## Decision: Use A Monorepo For SAI And RAI

SAI will be developed as the first product/module of the broader RAI / RouteAI platform, not as a separate throwaway application.

The codebase will use a monorepo structure with separate Next.js apps under `apps/` and shared packages under `packages/`.

In phase 1, only `apps/sai` will be built as a real Next.js application.

RAI and marketing will not be scaffolded as full applications yet. They are future platform surfaces and will be added when the SAI foundation is stable.

SAI and RAI will share:

- Supabase database schema
- organization and user model
- auth and role model
- tool catalog
- risk engine
- EU AI Act domain logic
- UI primitives
- audit/event model

SAI exposes a simpler product surface focused on Shadow AI Scan and AI Literacy intake.

RAI later exposes the broader governance platform, including policy management, evidence, dashboards, risk register, model library, training, and compliance workflows.

Rationale:

- reduces early complexity
- prevents rebuilding SAI when moving toward RAI
- keeps scoring and governance logic consistent
- supports commercial separation while preserving technical coherence
- avoids premature maintenance of multiple apps
- enables shared auditability and future compliance reporting

All apps should use the same major versions of Next.js, React, TypeScript, Tailwind, shadcn/ui, and related tooling unless there is a documented reason to diverge.

## Decision: SAI Is Sold Separately But Not Built Separately

SAI can be marketed and sold as a focused scan product.

Technically, SAI must remain on the same foundation as RAI:

- same database
- same auth model
- same risk primitives
- same audit principles
- same reusable UI language

This avoids a future migration from a scan prototype into a governance platform.

## Decision: Keep Phase 1 Lean

The phase 1 goal is a working SAI product foundation:

- auth and organization basis
- Shadow AI Scan survey flow
- tool inventory capture
- account type, data type, use case, and context registration
- server-side or server-trusted risk scoring
- Supabase persistence
- basic DPO dashboard
- audit-friendly result storage

The phase 1 goal is not the full RAI governance suite.

Avoid creating empty or half-maintained apps and packages before they are needed. `apps/rai` and `apps/marketing` should be introduced only when there is real implementation work for those surfaces.

## Decision: `design-html` And `references` Are Not Product Specs

`design-html/sai` stores high-fidelity HTML prototypes. These are visual references for production React components, not production implementation.

`references` stores source material, Lovable exports, architecture inputs, and historical context. It is read-only context.

Active product decisions and specifications belong in `docs/`, especially:

- `docs/domain-decisions.md`
- `docs/architecture.md`
- `docs/risk-engine-spec.md`
- `docs/database-model.md`

## Decision: Next.js App Router And Server/Client Boundary

The platform uses Next.js App Router.

Server Components, server actions, and route handlers are used for:

- authentication checks
- Supabase reads/writes
- scan submission
- risk scoring
- audit/event logging
- API routes and external integrations

Client Components are used for:

- interactive scan flow
- form state
- filters
- charts
- drawers/modals
- dropdowns
- temporary UI state

Risk scoring must not rely solely on client-side execution.

## Decision: Use `@supabase/ssr` For Next.js Auth

The platform uses `@supabase/ssr` for Supabase auth in Next.js.

Required structure:

```txt
packages/auth/
packages/database/
apps/sai/middleware.ts or root middleware.ts
```

Each app needs correct handling for:

- browser client for Client Components
- server client for Server Components and Route Handlers
- middleware/session refresh on requests
- server-side role lookup

This prevents auth bugs where the user appears logged out even though the Supabase session is still valid.

## Decision: Roles Are Prepared But Not Prematurely Expanded

Existing roles from the current Supabase/Lovable model may be reused:

- `super_admin`
- `content_editor`
- `org_admin`
- `dpo`
- `manager`
- `user`

For the Shadow AI Scan MVP, only these are actively required:

- `super_admin`
- `dpo`
- `user`

`org_admin`, `manager`, and `content_editor` are RouteAI platform roles and should be supported without forcing them into the first SAI workflows.

A future legal role should not be added until its permissions and product responsibilities are clear.

Unknown or future roles should fall back safely, for example to `/dashboard`, without crashing routing logic.

## Decision: Keep Legal And Governance Concepts Separate

Unknown tools are not automatically prohibited.

`org_policy_status` must remain separate from EU AI Act prohibited/high-risk signals.

GPAI status is descriptive metadata and does not by itself determine the user route or risk tier.

SAI does not use a separate `catalog_beheerstatus` field. Tool governance in SAI is based on organization-specific policy status. Future RouteAI Model Library statuses, such as curator review status, adapter source status, typekaart update status, or model/typekaart linkage, are separate metadata layers and must not be used as SAI scoring inputs.

Risk emerges from combinations of:

- tool status
- use case
- data type
- account type
- context
- frequency
- automation
- browser extension use
- governance maturity

UI copy must not present legal conclusions without documented rationale.

## Decision: Separate Runtime Configuration From Maintenance Content

SAI should keep runtime scan configuration separate from maintenance and governance content.

Runtime configuration is content the respondent flow directly needs, such as:

- survey answer codes
- toolpicker options
- use case codes
- data type codes
- account type codes
- context options used in the scan

Maintenance content is content used to update, govern, enrich, or interpret the system, such as:

- risk definitions
- mapping rules
- tool catalog enrichment
- Model Library/typekaart metadata
- prompt templates
- legal or DPO review notes

Rationale:

- keeps the respondent flow stable and simple
- allows tool and risk mappings to evolve without rewriting the scan UX
- prevents future RouteAI Model Library metadata from becoming accidental SAI scoring input
- supports auditability because runtime scoring inputs remain explicit

The exact technical shape can be decided later. The principle is fixed: production scoring and survey runtime must not depend on informal maintenance notes or unreviewed catalog metadata.
