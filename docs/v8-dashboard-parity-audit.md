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
- `/dashboard/activatie` is currently a dashboard entry/overview page. It should
  receive live activation KPIs in a later preview-readiness step.

## Remaining Work

- Apply the scoring migration set to the staging Supabase project, or confirm it
  is already applied.
- Run the full pilot smoke test against real Supabase data:
  respondent flow -> completion -> `risk_result` rows -> DPO dashboards.
- Add a regression fixture or SQL smoke test for agentic behavior so SQL parity
  remains covered outside the TypeScript package tests.
