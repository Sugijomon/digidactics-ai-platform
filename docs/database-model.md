# Database Model

This document is the active product-level database model for SAI: Shadow AI Scan.

Executable schema changes belong in `supabase/migrations/`. Raw exports from Lovable/Supabase belong in `references/lovable/database-export/`.

## Status

Status: draft v0.1.

This model captures the intended SAI data model before implementation in the new Next.js/Supabase stack. It should be reconciled with the Lovable/Supabase export before the first production migration is written.

## Naming Principle

Use stable internal codes that are independent from UI labels.

Example:

```txt
UI label: Vakgebied
Database field: work_domain_code
```

Do not use `department_code` for the Q2 survey answer. The product term is broader than a formal department.

## Core Identity And Organization

### `organizations`

Represents a customer organization.

Expected fields:

```txt
id
name
slug
plan_type
created_at
updated_at
```

### `user_profiles`

Profile record for authenticated users.

Expected fields:

```txt
id                 -> auth.users.id
org_id             -> organizations.id
display_name
email
created_at
updated_at
```

### `user_roles`

Role membership per user and organization.

Expected fields:

```txt
id
user_id            -> auth.users.id
org_id             -> organizations.id
role               -> app_role
created_at
```

Existing role enum:

```txt
super_admin
content_editor
org_admin
dpo
manager
user
```

For SAI MVP, active roles are `super_admin`, `dpo`, and `user`.

## Scan Campaigns And Runs

### `scan_campaigns`

Represents an invitation or scan campaign for one organization.

Expected fields:

```txt
id
org_id             -> organizations.id
name
status             -> draft | active | closed
starts_at
ends_at
created_by         -> auth.users.id
created_at
updated_at
```

### `survey_run`

One respondent's scan session.

Expected fields:

```txt
id
org_id             -> organizations.id
campaign_id        -> scan_campaigns.id, nullable
respondent_user_id -> auth.users.id, nullable
status             -> started | completed | abandoned
exit_path          -> boolean
started_at
completed_at
created_at
updated_at
```

Privacy note:

- Dashboards should avoid respondent-level identification unless explicitly needed for operational troubleshooting.
- DPO outputs should aggregate where possible.

## Survey Profile

### `survey_profile`

One profile record per `survey_run`.

Expected fields:

```txt
id
survey_run_id                  -> survey_run.id
work_domain_code               -> ref_work_domain.code
ai_frequency_code
automation_usage_code
browser_extension_usage_code
non_use_reason_code
created_at
updated_at
```

### Q2: Vakgebied

Active survey copy:

```txt
Binnen welk vakgebied ben je voornamelijk actief?
```

UI label:

```txt
Vakgebied
```

Database field:

```txt
work_domain_code
```

Do not store this as `department_code`.

Suggested stable values:

```txt
it_data_development
marketing_communicatie
hr_recruitment
finance_legal
sales_account
operations
directie_management
anders
```

The exact values should be reconciled with the final survey copy and reference table before migration.

## Survey Tools

### `survey_tool`

One selected or reported tool within a survey run.

Expected fields:

```txt
id
survey_run_id                         -> survey_run.id
tool_catalog_id                       -> tool_catalog.id, nullable
tool_name_snapshot
vendor_name_snapshot
org_policy_status_code_snapshot
account_type_code
created_at
updated_at
```

Snapshot fields preserve scoring/audit context at completion time. `org_policy_status_code_snapshot` feeds the shadow score.

### `survey_tool_use_case`

Selected use cases per reported tool.

Expected fields:

```txt
id
survey_tool_id       -> survey_tool.id
use_case_code
created_at
```

### `survey_tool_context`

Selected contexts per reported tool.

Expected fields:

```txt
id
survey_tool_id       -> survey_tool.id
context_code
created_at
```

Implementation note:

- V8.1 scoring is methodologically based on the combination of tool, use case, context, account type, and data type.
- If a context is asked for a specific use case, implementation should preserve that relation where feasible.
- For the MVP, context may be simplified when it is only asked for specific diagnostic cases, but the risk engine and dashboard should still identify the highest-risk contributing combination as far as the stored data allows.

## Data Types

### `survey_data_type`

Data types reported for the run.

Expected fields:

```txt
id
survey_run_id        -> survey_run.id
data_type_code
created_at
```

Data boost is calculated from the highest data sensitivity reported in the run.

## Reference Tables

Reference tables keep labels and scoring metadata stable.

### `ref_work_domain`

Supports Q2 Vakgebied.

Expected fields:

```txt
code
label_nl
sort_order
active
```

### `ref_use_case`

Expected fields:

```txt
code
label_nl
use_case_base
active
sort_order
```

### `ref_context`

Expected fields:

```txt
code
label_nl
context_multiplier
active
sort_order
```

### `ref_data_type`

Expected fields:

```txt
code
label_nl
data_boost
active
sort_order
```

## Tool Catalog And Organization Policy

SAI does not use a separate `catalog_beheerstatus` field.

For SAI, the operational governance field is the organization-specific tool status:

```txt
org_policy_status_code
```

Future RouteAI Model Library status fields, such as typekaart curation status, adapter status, or update review status, belong to the Model Library layer and must not be mixed into the SAI scoring model.

### `tool_catalog`

Global tool catalog.

Expected fields:

```txt
id
canonical_name
vendor_name
category_code
default_risk_notes
created_at
updated_at
```

### `org_tool_catalog`

Organization-specific tool governance status.

Expected fields:

```txt
id
org_id                 -> organizations.id
tool_catalog_id         -> tool_catalog.id
org_policy_status_code
updated_by              -> auth.users.id
created_at
updated_at
```

Expected policy status values:

```txt
approved
newly_discovered
under_review
restricted
prohibited
```

## Scoring Configuration

### `scan_scoring_config`

Organization-level scoring thresholds.

Expected fields:

```txt
id
org_id
active
priority_review_threshold
toxic_shadow_threshold
toxic_exposure_threshold
dashboard_min_cell_size
created_at
updated_at
```

Default values if no config exists:

```txt
priority_review_threshold = 40
toxic_shadow_threshold = 50
toxic_exposure_threshold = 50
dashboard_min_cell_size = 5
```

## Risk Results

### `risk_result`

Run-level score output.

Expected fields:

```txt
id
survey_run_id              -> survey_run.id
org_id                     -> organizations.id
person_score
assigned_tier              -> standard | priority_review | toxic_shadow
review_trigger_codes       -> text[] or jsonb array
shadow_tool_count
dpo_review_required
calculated_at
created_at
updated_at
```

Exit path behavior:

- If a run has no `survey_tool` rows because the respondent uses no AI tools, write `person_score = 0`, `assigned_tier = standard`, empty review triggers, and `shadow_tool_count = 0`.
- Do not write `risk_result_tool` rows for exit-path runs.

### `risk_result_tool`

Tool-level score output.

Expected fields:

```txt
id
survey_run_id
survey_tool_id
org_id
shadow_score
exposure_score
priority_score
assigned_tier
review_trigger_codes
priority_review_threshold_used
toxic_shadow_threshold_used
toxic_exposure_threshold_used
calculated_at
created_at
updated_at
```

Notes:

- Results must be idempotent by `survey_run_id` and `survey_tool_id`.
- Thresholds used should be persisted for auditability.

## Audit Events

### `audit_events`

Generic audit/event log for important system actions.

Expected fields:

```txt
id
org_id
actor_user_id
event_type
entity_type
entity_id
metadata
created_at
```

Examples:

```txt
survey_run_completed
risk_score_calculated
dpo_review_opened
tool_policy_status_changed
```

## RLS Model Summary

Detailed policies belong in `docs/rls-policy-spec.md`.

High-level principles:

- Respondents may create and update their own active survey run where applicable.
- DPOs may read aggregated and review-relevant data for their own organization.
- DPOs should not need respondent identity for normal dashboard use.
- Super admins may manage platform-wide reference/configuration data.
- Service role access is server-only.

## Open Questions Before Migration

- Exact Lovable table names and column names must be reconciled with this model.
- Decide whether final table names use singular existing names like `survey_run` or plural names like `survey_runs`.
- Decide whether `review_trigger_codes` is stored as `text[]` or `jsonb`.
- Decide whether `work_domain_code` should reference `ref_work_domain(code)` or remain free-coded in MVP.
- Confirm campaign/invitation model from existing Lovable implementation.
