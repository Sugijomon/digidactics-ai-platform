# Domain Decisions

## 2026-05-27 - DPO Dashboard HTML Parity Uses Live Data Equivalents

The SAI DPO dashboard pages should follow the high-fidelity HTML references as
closely as possible, but production components must continue to use server-side
Supabase data instead of embedded mock values.

The 2026-05-27 parity pass restores the main HTML page structure across:

- Activatie: organization context, employee/session overview, invitations, and
  timeline.
- Tool Inventaris: five KPI strip, AI-toolregister, DPO matrix, and
  gebruiksstromen.
- Risicoprofiel: priority matrix, radar, risk amplifiers, top clusters,
  cluster explanation, and review queue.
- Governance: literacy, policy awareness, awareness gaps, combination signals,
  hard review triggers, innovation drivers, and stakeholder insights.
- Rapportage: metadata strip, report template cards, period/scope/format
  builder sections, report history, and export data references.
- Voortgang: current-round state, evidence blocks, exposure drivers,
  behavior/capacity indicators, intervention effects, departments, and open
  risks. The t=2 HTML design should render as a current-wave/nulmeting state
  until at least two scan waves have persisted survey and score output.

Where the HTML assumes functionality that does not yet exist as durable data or
server actions, the Next.js dashboard shows the live-data equivalent and keeps
the remaining feature documented rather than inventing production mock data.
Known examples are t=1/t=2 longitudinal comparison, real report generation jobs,
review/action drawers, case exports, and employee roster/invitation management.

This preserves the product principle that DPO dashboards are interpretation and
governance tools over persisted V8 outputs, not static mock dashboards.

## 2026-05-27 - Authenticated Role Resolution Requires User Roles SELECT Grant

The SAI dashboard resolves access by reading the signed-in user's
`public.user_roles` row through the Next.js Supabase server client. RLS policies
already restrict readable rows to the user themself, same-organization
DPO/admins, or super admins, but the table also needs an explicit table-level
`SELECT` grant for the `authenticated` Postgres role.

Migration `20260527090000_grant_user_roles_select_to_authenticated.sql` grants
that read capability. It does not grant anonymous access and does not broaden
write access. This keeps RLS as the security boundary while allowing DPO and
org-admin dashboard sessions to resolve their organization membership.

## 2026-05-27 - Dashboard Read Grants And Role Helper Use `user_roles`

The dashboard server components read persisted V8 tables through the signed-in
Supabase session. Table-level `SELECT` grants are therefore required for
`authenticated` on the dashboard read model (`survey_run`, survey child tables,
`risk_result`, `risk_result_tool`, `dpo_review_items`, `audit_events`,
`report_exports`, wave/config/organization tables). These grants do not expose
cross-organization data because RLS remains the security boundary.

The org-scoped RLS helper `get_user_org_id(uuid)` now resolves organization
membership from `public.user_roles` first and falls back to `public.profiles`.
This is necessary because DPO dashboard users may be invited and assigned via
`user_roles` before a profile row exists. RouteAI can later keep this helper as
the shared organization-membership primitive or replace it with a fuller
permission service, but SAI should not depend on profile bootstrapping just to
read dashboard data.

## 2026-05-27 - SAI DPO Role Bridges To RouteAI Organization Administration

SAI remains the standalone Shadow AI Scan product surface, but it shares the
same organization, auth, role, survey, scoring, and dashboard database
foundation as the broader RouteAI platform.

For SAI MVP, `dpo` is the active customer-side dashboard role. It can inspect
scan results, tool inventory, risk profile output, DPO review items, reporting
readiness, and adoption/learning signals for its own organization.

In the later RouteAI shell, the same organizational scan owner will usually map
to a broader `org_admin` or permission bundle. This is an expansion of
capability, not a separate identity model. RouteAI should therefore build on the
same `user_roles` table and add permissions around it where needed, such as:

- `scan:read`
- `scan:manage`
- `dashboard:read`
- `dpo_review:write`
- `learning:assign`
- `learning:read_progress`
- `policy:manage`

The learning system should attach progress, assignments, and recommendations to
the same `user_id` and `org_id` primitives used by SAI. SAI may contribute
aggregate learning needs through survey answers and dashboard patterns, but it
must not become the full learning-management product surface during phase 1.

The deterministic smoke-test organization remains the first shared validation
surface for SAI and dashboard work:

```txt
Organization: SAI Smoke Test Organisatie
org_id:       00000000-0000-0000-0000-000000000101
```

DPO/dashboard test users should be created in Supabase Auth and then linked to
this organization through `public.user_roles`. The dashboard should be inspected
against persisted Supabase rows, not hard-coded production component mock data.

## 2026-05-22 - V8.1 SQL/TypeScript Scoring Parity

The TypeScript risk engine in `packages/domain` and the Supabase
`public.calculate_v8_score(...)` function must remain behaviorally aligned.
During the pilot-hardening audit, the SQL function was aligned with the
TypeScript/reference rule that agentic behavior is an additive exposure boost,
not only a review trigger. The SQL score breakdown now persists
`agentic_boost` alongside data, frequency, automation, extension, and toxic
boosts.

The persisted Supabase scoring output remains the source read by the DPO
dashboard. `packages/domain` remains the regression-testable implementation
reference for scoring edge cases.

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

## 2026-05-22 - Dashboard Privacy And Scoring Regression Tests

SAI dashboards now apply the configured `dashboard_min_cell_size` to operational
clusters. Tool inventory rows below the minimum are merged into a small-cluster
bucket, risk matrix cells below the minimum show only a qualitative small-cluster
signal, and review queue rows for below-minimum tool clusters are suppressed.

Completed runs that predate the live V8.1 scoring function are backfilled with
`calculate_v8_score(...)` so dashboard aggregates use persisted scoring results
consistently.

The shared domain package now has focused regression tests for V8.1 scoring edge
cases: approved tools with sensitive data, prohibited high-exposure use, unknown
tool policy status, no-tool exit path aggregation, and hybrid multi-tool run
aggregation.

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

In phase 1, `apps/sai` remains the first scan product surface. `apps/rai` may be built for the Learning System because AI Literacy is a RouteAI access gate.

Marketing will not be scaffolded as a full application yet. RouteAI should not be built out as the full governance suite prematurely, but the Learning System is a real RouteAI module and belongs in `apps/rai`.

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

The detailed implementation note for shared auth, role lookup, and entry routing lives in `docs/auth-role-routing.md`.

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

## Decision: Respondent Copy Follows The Approved HTML Survey References

The SAI respondent flow should stay close to the approved HTML survey examples for titles, supporting text, and interaction tone.

The respondent UI must avoid control-oriented framing such as saying the scan is "geen controle op individuen". It should instead use the neutral, facilitative language from the reference screens.

Validation should not use prominent red per-question warnings or repeated "Verplicht" labels. The flow may still block navigation until required inputs are present, but visual feedback should stay calm and consistent with the HTML references.

Technical support details, such as local run IDs or session keys, should not be shown in the normal respondent flow unless a future support workflow explicitly requires them.

For code-oriented tools, such as GitHub Copilot and Cursor, the tool editor should ask for the application context instead of generic writing or productivity use cases. The stored base use case remains `code_schrijven`, while the selected context codes describe what the generated software is ultimately used for.

The Code context options must be present as reference data before respondent sessions run: `intern_gebruik`, `klantgerichte_toepassing`, `beslisondersteuning`, `besluiten_over_personen`, `financieel_juridisch`, `kritieke_systemen`, and `nog_niet_duidelijk`. These are stored in `survey_tool_use_case_context` against the canonical `code_schrijven` use case.

## 2026-05-28 - V8.1 Scoring Parity Repair

Audit date: 2026-05-28.

The repository documents V8.1 exposure as:

```txt
(use_case_base * context_multiplier * account_multiplier)
+ data_boost
+ frequency_boost
+ automation_boost
+ extension_boost
+ agentic_boost
```

The 2026-05-28 repair pass realigned the live Supabase
`calculate_v8_score(uuid)` function, the local migration set, and
`packages/domain`:

- `agentic_boost` is included as an additive exposure boost and persisted in
  `score_breakdown`.
- Context selections contribute through the documented `context_multiplier`.
- Persisted exposure, priority, and person scores use the same whole-score
  convention as the TypeScript reference tests.
- The deterministic test organisation was rescored so its completed runs no
  longer depend on `dashboard_mock_seed` score rows.

Operational decision: the trusted production write boundary remains the SQL
scorer because it runs server-side at survey completion and writes audit rows.
`packages/domain` remains the regression-testable reference that must stay in
behavioural parity with SQL. Any future scoring change must update both layers
and include a SQL smoke test.

## Decision: Build The Learning System As A RouteAI Module On The Shared Database

The RouteAI Learning System may be built in parallel with the SAI migration.

It shares the same Supabase database, organization model, profile model, role model, and audit principles as SAI. It does not depend on SAI survey tables for its core operation.

Learning content is stored as versioned JSONB. For authored courses, the current shape is `learning_courses -> learning_topics -> learning_pages -> content.blocks[]`. `learning_lessons.content` remains for legacy compatibility and microlearnings. This is intentional because regulations, sector cases, policy examples, and training scenarios will change over time. The database validates the outer content shape, while detailed block rendering and validation live in shared TypeScript domain code.

Learning rules are kept separate from risk scoring. The first product role of the Learning System is AI Literacy as a hard access criterion for RouteAI usecase checks. RouteAI may later map its own medium and high risk classifications to additional microlearnings. SAI scan outputs are not part of the current Learning System runtime; any SAI-derived intervention intelligence is parked as a separate analysis flow.

The first implementation uses platform-level content (`org_id = NULL`) plus organization-level enablement/customization through `learning_catalog`. Organization-specific lessons or courses are possible, but should be used deliberately.

The detailed product contract for AI Literacy certification, RouteAI access gating, and RouteAI-driven microlearnings lives in `docs/learning-system-product-spec.md`.

The visible Learning System surface belongs in `apps/rai`, not `apps/sai`. SAI remains focused on the Shadow AI Scan. AI Literacy is the RouteAI access gate, so its course viewer, lesson player, progress flow, certificate issuance, and capability guard should be wired into the RouteAI app surface.

Rationale:

- supports parallel development without blocking SAI
- preserves a single platform identity and role model
- keeps JSON content flexible but governed
- enables future sector-specific and regulatory updates
- avoids importing Lovable's historical table drift directly into the new production schema
