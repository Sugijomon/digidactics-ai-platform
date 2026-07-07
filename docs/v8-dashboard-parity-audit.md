# V8.1 Scoring And Dashboard Parity Audit

Status: pilot-hardening audit, 2026-05-22.

## Result

The DPO `Risicoprofiel` dashboard is connected to persisted V8.1 scoring output.
It reads `risk_result`, `risk_result_tool`, and `scan_scoring_config`, so it does
not recalculate scores in UI code and does not depend on mock data.

The respondent completion flow closes through `complete_survey_run(...)`, which
calls `calculate_v8_score(...)`. That function writes the run-level result,
tool-level result rows, DPO review items, and a `score.calculated` audit event.

## Parity Finding

The audit found one scoring parity issue: `packages/domain` treated agentic
behavior as both a review trigger and an additive exposure boost, while the SQL
function only used it as a trigger. The SQL migration has been aligned so
agentic behavior adds `agentic_boost = 15` to exposure and persists that boost
in the score breakdown.

The SQL function now also rounds persisted `exposure_score`, `priority_score`,
and `person_score` to the same whole-score convention used by
`packages/domain/src/risk-engine.ts`. Raw numeric values remain available in
`raw_exposure_score`, tool-level `priority_score_raw`, and run-level
`priority_score_raw`.

## Dashboard Coupling

- `/dashboard/risicoprofiel` is coupled to V8.1 score output through
  `risk_result` and `risk_result_tool`.
- `/dashboard/tools` is coupled to survey and policy snapshots through
  `survey_tool`, `survey_tool_account`, and `survey_tool_use_case`; it is a tool
  inventory view rather than a score-result view.
- `/dashboard/activatie` reads live activation KPIs from `survey_run`,
  `scan_wave`, and organization-wide profile aggregates.
- `/dashboard/governance` reads the DPO workqueue from `dpo_review_items` and
  audit signal volume from `audit_events`.
- `/dashboard/rapportage` reads export metadata from `report_exports` and
  cross-checks report readiness against `survey_run`, `risk_result`, and
  `dpo_review_items`.
- `/dashboard/voortgang` reads adoption, literacy, data-type, and support
  patterns from `survey_profile`, `survey_data_type`, and
  `survey_support_need`.

## Remaining Work

- Production hardening still needs environment separation, rollback notes, and
  final RLS/security review before public rollout.
- Longitudinal t=1/t=2 comparison still needs a second scan wave with durable
  test data.
- Actual report-generation jobs remain outside this dashboard parity pass.

## HTML Dashboard Parity Audit, 2026-05-27

Scope: compare the source HTML pages in `design-html/sai/dashboard/pages/` with
the current Next.js dashboard pages in `apps/sai/app/dashboard/`.

Overall status: the Next.js dashboard is connected to server-side Supabase data
and covers the main route set. On 2026-05-27 a parity pass brought the shared
shell, Tool Inventaris, Activatie, Risicoprofiel, Governance, Rapportage, and
Voortgang substantially closer to the HTML prototypes. Remaining differences
are mostly tied to interactive client behavior or data that is not yet present
as a durable model, such as longitudinal t=1/t=2 comparison data and actual
report generation jobs.

### Shared Shell

Matches:

- Route set exists for Activatie, Tool Inventaris, Risicoprofiel, Governance,
  Rapportage, and Voortgang.
- Left navigation, top header, `DPO Governance` label, live dashboard pill, and
  respondent-scan link are present.
- Typography is broadly aligned with Inter for body text and Manrope for
  headings.

Differences:

- HTML uses Material Symbols throughout the dashboard shell and page content.
  Next now uses Material Symbols in the shared shell and newly aligned dashboard
  blocks. Some older page-internal components may still use prior icon choices
  where they were not blocking parity.
- HTML profile menu has a dropdown with profile/logout actions. Next now uses a
  profile dropdown with profile and logout actions, backed by the existing
  Supabase sign-out server action.
- HTML active navigation order differs on `06__Voortgang_v4.html`, where
  Voortgang appears before Rapportage. Next uses
  Activatie -> Tool Inventaris -> Risicoprofiel -> Governance -> Rapportage ->
  Voortgang.
- HTML pages use page-specific CSS systems and spacing. Next normalizes most
  sections through `DashboardSection`, `MetricCard`, `StatusPill`, and
  `ProgressBar`, so the visual rhythm is consistent but less exact.

### 01 Activatie

HTML source: `01__Activatie.html`.
Next route: `/dashboard/activatie`.

Matches:

- Page title `Activatie`.
- KPI strip now follows the HTML labels: `Uitgenodigd`, `Afgerond`,
  `Responsgraad`, `Niet gereageerd`, and `Herinneringen`.
- Organization block now mirrors the HTML structure with editable
  `Organisatiecontext`, `AI-verantwoordelijke`, and `Activatieperiode` cards.
- `Medewerkers` now includes the HTML-style invitation roster, filter row,
  selectable rows, add/bulk-upload controls, and status pills.
- `Uitnodigingen maken & versturen` now includes subject, message body,
  placeholders, signature, preview, template-save button, invite mode buttons,
  and send button.
- Timeline and `Respons per vakgebied` are now visually and structurally close
  to the HTML reference.

Differences:

- Primary activation metrics and response distribution still use server-side
  Supabase data from `survey_run`, `scan_wave`, and `survey_profile`.
- The employee invitation roster is currently an explicitly marked test roster
  in the component because the current V8 schema tracks survey sessions, but not
  HR invitation rows with names, e-mail addresses, invited dates, and reminder
  status. A durable `survey_invite`/roster table is still needed for production
  parity.
- Organization sector, employee count, DPO phone, and invitation template values
  are local UI state only in this pass. Persisting those fields requires a
  RouteAI organization/profile table or settings table.

### 02 Tool Inventaris

HTML source: `02__Tool_Inventaris.html`.
Next route: `/dashboard/tools`.

Matches:

- Page title `Tool Inventaris`.
- KPI strip now follows the HTML labels and styling: `Totaal tools`,
  `Shadow AI Ratio` for tools, `Shadow AI Ratio` for users, `Nieuw ontdekt`,
  and `Reviews open`.
- `AI-toolregister` now mirrors the HTML filter row, search input, usage sort,
  policy filter, field filter, account-type sort, status selects, account bars,
  and scrollable register layout.
- `DPO-matrix` now mirrors the HTML matrix controls: tool/use-case sorting,
  auditmode toggle, link-to-register-filters toggle, legend, cell-size scaling,
  legal flags, and detail modal.
- `Gebruiksstromen` now follows the HTML section structure with view tabs,
  status filter chips, SVG Sankey ribbons, hover tooltip, and KPI cards.
- Next reads live `survey_tool`, `survey_tool_account`, and
  `survey_tool_use_case` data.

Differences:

- The register and matrix are backed by server-side Supabase inventory. The
  client no longer injects missing `reference-demo` tool rows into the
  production display; HTML reference rows are only used as a local metadata
  lookup for known tool categories/vendor labels where a matching Supabase tool
  already exists.
- The HTML Sankey uses imperative DOM/SVG code. Next now uses a React/TSX SVG
  implementation with the same curved ribbon layout and derives its graph from
  the server-fed tool inventory rows.
- Register status changes are local dashboard UI state in this pass. Persisting
  DPO policy edits requires a dedicated policy-update action/table decision.
- Tool logos use the shared `ToolLogo` mapping, keeping the dashboard aligned
  with the survey toolpicker; any remaining mismatch should be fixed in that
  shared mapping rather than page-local code.

### 03 Risicoprofiel

HTML source: `03__Risicoprofiel.html`.
Next route: `/dashboard/risicoprofiel`.

Matches:

- Page title `Risicoprofiel`.
- Priority matrix concept exists.
- DPO review/triage queue exists and is connected to V8.1 score output.
- Next uses `risk_result`, `risk_result_tool`, and score bands server-side.

Differences:

- HTML includes `Priority matrix`, `Risicoprofiel radar`,
  `Risicoversterkers`, `Risicoprofiel top-5 clusters`, `Clusterduiding`, and a
  drawer-based `DPO Triage Review`.
- Next now has `Priority matrix`, `Scoreverdeling en triggers`,
  `Risicoprofiel radar`, `Risicoversterkers`, `Risicoprofiel top-5 clusters`,
  `Clusterduiding`, and `Review queue`.
- HTML uses richer review-case fields such as department, use case, context,
  account, data, triggers, and actions. Next review rows show tool name,
  triggers, and score bars only.
- HTML has more action affordances such as open details, review openen, case
  export, and cluster export. Next page remains read-only in this pass because
  those actions require a dedicated client drawer/action model and export route.

### 04 Governance

HTML source: `04__Governance.html`.
Next route: `/dashboard/governance`.

Matches:

- Page title `Governance`.
- HTML-style page header with the `Best-of variant` note and
  `Geen scorecomponent; puur interventielaag` pill.
- KPI band follows the HTML governance KPI structure: hard triggers, awareness
  gaps, low policy awareness, beginner literacy, and ambassador candidates.
- `AI Literacy & vaardigheid` and `Policy Awareness` use the HTML breakdown
  rows with fixed categories, colored dots, mono counts, percentages, and bars.
- `Awareness-gaps` uses the six-bubble HTML structure with bubble size driven
  by counts and color driven by severity.
- `Combinatiesignalen` uses the three HTML lanes: `Urgent`, `Verhoogd`, and
  `Monitor`, including pattern cards and action pills.
- `Hard review-triggers` includes the HTML-style summary, hard-floor pill,
  spotlight callout, trigger type tags, prevalence bars, counts, and notes.
- `Innovatiedrijvers vs barrières` now uses a central-axis SVG visual matching
  the HTML approach.
- `Inzichten per stakeholder` uses the four-card HTML stakeholder grid.
- Next reads production data from `survey_profile`, `survey_motivation`,
  `survey_support_need`, `survey_run`, `risk_result`, `risk_result_tool`,
  `dpo_review_items`, and `audit_events`.

Differences:

- The HTML file defines a drawer shell, but the visible governance sections do
  not currently expose a production action that requires it. Next remains
  server-rendered and read-only for this pass.
- Some HTML prototype values are mock constants. Next maps them to derived
  Supabase/V8 metrics, so exact counts can differ by organisation and wave.
- Small browser-rendering differences remain because the HTML uses Material
  Symbols directly and Next uses the shared dashboard shell and font stack.

### 05 Rapportage

HTML source: `05__Rapportage.html`.
Next route: `/dashboard/rapportage`.

Matches:

- Page title `Rapportage`.
- Top metadata strip follows the HTML structure: `Rapportageronde`, `Status`,
  `Peildatum`, `Snapshot`, `Scoringversie`, and `Verantwoordelijke`.
- Report builder follows the HTML structure with six template cards,
  `Periode`, `Scope`, `Exportformaat`, and generate action.
- `Periode` and `Scope` now include the same option set as the HTML reference.
- Right-side management column is present: `Audit package`, `Geplande exports`,
  and `Juridische begrenzing`.
- Export metadata/configuration section is present with threshold controls and
  export audit metadata.
- `Innovatiekansen` and `Rapportgeschiedenis` sections follow the HTML layout;
  report history now uses the real `report_exports` count for the pagination
  summary.
- Next reads `report_exports` and cross-checks readiness against
  `survey_run`, `risk_result`, and `dpo_review_items`.

Differences:

- HTML appears as an interactive report builder. Next is still read-only:
  creating report export jobs remains a missing server action/job feature.
- HTML has client-side template selection, format toggles, history search,
  config slider updates, and simulated generate states. Next renders these
  controls visually but does not yet persist export jobs or client-side filter
  history.
- Exact row counts and history labels depend on production `report_exports`
  instead of the HTML fixture rows.

### 06 Voortgang

HTML source: `06__Voortgang_t2.html`.
Next route: `/dashboard/voortgang`.

Matches:

- Page title `Voortgang`.
- HTML-style current-wave / comparison readiness banner is present.
- Wave selector row is present and now reflects whether t=2 data exists.
- KPI strip follows the t=2 HTML concepts: Shadow AI-ratio, datablootstelling,
  toxic combo-index, and DPO-reviewdruk.
- Adoptie/frequentie cards, compliance/behavior table, open risks,
  afdelingsranglijst, department table, tool table, awareness-shift cards, and
  intervention-impact cards are present.
- Next combines live Supabase progress, tool inventory, and V8 risk output via
  `survey_run`, `survey_profile`, `survey_data_type`, `survey_support_need`,
  `survey_tool`, `risk_result`, and `risk_result_tool`.

Differences:

- Current Supabase test data has only one `survey_run.wave_id` group with runs,
  so Next intentionally renders the t=1/nulmeting state. It does not invent
  t=2 deltas.
- HTML fixture values such as previous-wave percentages, historic tool deltas,
  and intervention correlations remain unavailable until a second completed
  wave or durable snapshot table exists.
- Department policy/review signals are currently derived from current aggregate
  progress and V8 review clusters. True per-department longitudinal deltas need
  wave-scoped profile, tool, and risk comparisons.

### Priority Gaps

1. Add client-side drawer/action behavior for Risicoprofiel and Governance if
   review-opening, case export, or cluster export are pilot scope.
2. Add a real report export server action/job model before making the Rapportage
   builder controls submit anything.
3. Add second-wave comparison queries for Voortgang before showing real t=1/t=2
   deltas.
4. Add invitation/roster data if Activatie must distinguish invited employees
   from started survey sessions.

### Current Parity Estimate

- Activatie: 80% content parity, 78% UI parity.
- Tool Inventaris: 90% content parity, 86% UI parity.
- Risicoprofiel: 72% content parity, 68% UI parity.
- Governance: 95% content parity, 93% UI parity.
- Rapportage: 90% content parity, 86% UI parity.
- Voortgang: 82% content parity, 78% UI parity for the current-wave state; true
  t=2 parity still depends on second-wave data.

Dashboard set overall after the 2026-05-27 parity pass: approximately 83-85%
parity with the HTML prototypes. Governance is now close to the HTML reference;
remaining distance across the set is mostly interactive behavior and missing
durable data models rather than the main page structure.

## Final Design Consistency Pass, 2026-05-28

Scope: visual consistency only. No surveyflow, V8 scoring, Supabase schema, RLS,
or dashboard KPI semantics were changed.

Adjusted:

- Shared dashboard cards and metric cards now use the same rounded `14px/16px`
  rhythm, subtle `#dbe3ec` borders, white surfaces, and soft HTML-style shadow.
- Dashboard page titles now use the same `#2a3439` heading color on Tool
  Inventaris, Risicoprofiel, Governance, Rapportage, Voortgang, and Activatie.
- KPI card label hierarchy remains compact: small uppercase labels with medium
  weight, large tabular values, and subdued helper text.
- Page-local cards on Activatie, Tool Inventaris, Risicoprofiel, and Governance
  were aligned with the same section surface so the pages feel like one
  dashboard system.
- Report and activation section headings/subtexts were tightened to the same
  title/subtitle color pairing used in the HTML references.

Remaining by design:

- Production components still prefer live Supabase data over HTML fixture values.
- True t=2 Voortgang parity still requires a second completed scan wave.
- Interactive report generation, persisted policy edits, invitation roster
  persistence, and review/export actions remain explicit product/data needs.

## Data And Scoring Coupling Audit, 2026-05-28

Scope: end-to-end consistency check across Supabase test data, survey output,
V8 scoring output, and the six DPO dashboard routes. This pass did not change
survey UI or scoring semantics.

### Supabase Test Organisation

Checked organisation: `00000000-0000-0000-0000-000000000101`
(`SAI Smoke Test Organisatie`).

Live data status:

- `scan_wave`: 1 wave, active, linked to runs.
- `survey_run`: 77 started, 45 completed, 32 open.
- Activation/response KPIs: 58% response rate, 11 ambassador opt-ins.
- `survey_profile`: all completed runs have a profile. The extra profile rows
  belong to non-completed/open sessions and are not blocking dashboard output.
- `survey_tool`: 96 tool rows across 19 tool clusters.
- Completed tool rows have complete account and use-case data:
  62 completed tools, 0 missing `survey_tool_account`, 0 missing
  `survey_tool_use_case`.
- Open/non-completed tool rows account for the incomplete account data:
  34 open-run tools, 32 missing account rows.
- `survey_tool_use_case_context`: 79 context rows available.
- `risk_result`: 45 rows, matching the 45 completed runs.
- `risk_result_tool`: 62 rows, matching completed tool-level risk output.
- `dpo_review_items`: 57 open/in-review items across 28 review-required runs.
- `audit_events`: 66 events, including score-calculation signals.
- `report_exports`: 1 test export row, with 2 suppressed cells.

### Data Relationship Findings

Correct:

- `scan_wave -> survey_run` is consistent for the active test wave.
- `survey_run -> survey_profile` is complete for completed runs.
- `survey_run -> survey_tool` is populated for dashboard inventory.
- `survey_tool -> survey_tool_account` is complete for completed runs.
- `survey_tool -> survey_tool_use_case` is complete for completed runs.
- `survey_run -> risk_result` is complete for completed runs.
- `risk_result -> risk_result_tool` is populated for completed tools.
- `user_roles -> org/dashboard access` is working for
  `marjan@digidactics.nl` as `dpo`.

Partial / follow-up:

- `dpo_review_items` are reliable at run level, but only partially linked at
  tool level. The current scoring function writes run-level review items per
  trigger reason, so some DPO items have `survey_tool_id = null`. If the DPO
  workflow needs tool-specific assignments, add or backfill explicit
  `risk_result_tool -> dpo_review_items` links.
- Activation organisation context still contains local fallback fields for
  sector, employee count, DPO phone, and invite template text. A durable
  organisation/settings table is still needed for full production parity.

### Score Logic Findings

The TypeScript domain tests pass and cover the core V8 behaviours:
approved-sensitive-data review, prohibited toxic boost, unknown policy status,
no-tool exit, and dampened run aggregation.

For live Supabase data after repair:

- 45 `risk_result` rows contain V8 aggregation breakdowns.
- 62 `risk_result_tool` rows contain V8 SQL score breakdowns with
  `agentic_boost`.
- 0 `risk_result` rows and 0 `risk_result_tool` rows still carry
  `source = dashboard_mock_seed`.
- For the 62 V8 SQL tool rows, raw exposure, rounded exposure, priority raw,
  rounded priority, and toxic boost all recompute cleanly.
- For the 45 V8 SQL run rows, highest-priority aggregation, person score,
  review class, and DPO-required flags all recompute cleanly.

Resolved repair:

- Migration `20260528143000_repair_v8_scoring_parity.sql` redefines
  `public.calculate_v8_score(uuid)` with the documented context multiplier,
  additive `agentic_boost`, and whole-score persisted exposure/priority/person
  scores.
- `packages/domain/src/risk-engine.ts` now applies the same context multiplier
  mapping as SQL and has regression tests for context multiplier and agentic
  exposure.
- SQL smoke test
  `supabase/smoke-tests/20260528143000_v8_scoring_parity_smoke.sql` verifies
  `code_schrijven + kritieke_systemen + personal_free + agents_reeks_taken`
  resolves to `use_context_score = 45`, `agentic_boost = 15`,
  `raw_exposure_score = 90.75`, `exposure_score = 91`, and
  `priority_score = 50`.
- The live Supabase project was migrated and the 45 completed test-organisation
  runs were recalculated after the repair.

### Dashboard Coupling Findings

Cross-page KPI consistency:

- A full browser E2E pilot run was completed on 2026-05-28 with run id
  `0b72bddb-30a3-4555-bcaf-b285a5c7c657`. The run created a profile, two
  tools, two account rows, four use-case links, four data-type rows, support
  and motivation rows, one run-level score, two tool-level score rows, and five
  open DPO review items.
- Activatie, Rapportage, and Voortgang align on started/completed counts after
  the E2E run: 78 started, 46 completed.
- Risicoprofiel, Rapportage, and Voortgang align on DPO review pressure after
  the E2E run: 29 DPO-required runs and 62 open/in-review items.
- Governance KPI mapping now shows `Hard triggers actief` as
  `risk_result.dpo_review_required` runs; the separate hard-review trigger
  section continues to show trigger-event counts.
- Tool Inventaris reads live inventory rows from Supabase and no longer injects
  missing HTML reference tools into the production row set.
- Tool Inventaris DPO-matrix now derives cells from live Supabase use-case
  counts instead of the old static HTML matrix cell fixture.
- Risicoprofiel reads `risk_result` and `risk_result_tool` server-side; it does
  not recalculate V8 in the UI.
- Voortgang correctly remains in current-wave/nulmeting mode because only one
  scan wave currently has runs.

Browser verification:

- Checked `/dashboard/activatie`, `/dashboard/tools`,
  `/dashboard/risicoprofiel`, `/dashboard/governance`,
  `/dashboard/rapportage`, and `/dashboard/voortgang` in the logged-in DPO
  browser session.
- All six routes loaded without login fallback or role denial.
- No console errors were reported during the route checks.
- No page-wide horizontal overflow was detected at the current browser width.

Verification commands:

- `corepack pnpm --dir packages/domain test` passed: 8/8 tests.
- `corepack pnpm --dir apps/sai lint` passed.
- `corepack pnpm --dir apps/sai build` passed.

### Current Audit Status

Data relations are strong enough for dashboard inspection with the seeded test
organisation. After the scoring repair and one full E2E pilot run, the test
organisation has 46 V8 run-level score rows and 64 V8 tool-level score rows,
with no remaining
`dashboard_mock_seed` score output in `risk_result` or `risk_result_tool`.
Formula checks for raw exposure, rounded exposure, priority raw, rounded
priority, toxic boost, highest-priority aggregation, person score, review class,
and DPO-required flags all return zero mismatches.
