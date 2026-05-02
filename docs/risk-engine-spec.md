# Risk Engine Spec

This file is the durable specification for Shadow AI Scan / RouteAI risk logic.

Status: draft v0.1, based on SAI V8.1 methodology.

The detailed method document remains `Shadow_AI_Scan_Scoring_V8_1.docx`. This repo spec captures the implementation-relevant decisions that Codex must preserve.

## Core Principle

The risk engine separates governance deviation from exposure.

An approved tool has:

```txt
shadow_score = 0
```

But this does **not** mean:

```txt
priority_score = 0
```

Approved tools can still have high exposure or trigger DPO review when they are used with sensitive data, high-impact use cases, risky account types, frequent use, automation, browser extensions, or agentic behavior.

This prevents the old mistake where `shadow_base = 0` effectively collapsed the whole risk calculation to zero.

The engine has two distinct functions:

- scoring: calculate shadow, exposure, priority, tier, and review need
- classification: explain which tool/use-case/context patterns require DPO or governance attention

These functions must not collapse into one opaque score. The dashboard should preserve explainability: what is high, why it is high, and which intervention follows.

## Methodological Layers

The engine works from source observations toward DPO action in this order:

1. source layer: survey answers on tool, use case, context, account type, data type, and profile signals
2. governance snapshot: organization policy status captured at scoring time
3. shadow score: pure governance deviation
4. exposure score: use and data risk
5. priority score and aggregation: DPO triage and respondent/run-level output

Scoring should preserve the heaviest contributing combination. Conceptually, the method evaluates:

```txt
tool x use case x context x account type x data type
```

The implementation may simplify parts of this in the MVP, but dashboards and audit output should still explain the highest-risk contributing combination where possible.

## Scores

### Shadow Score

The shadow score measures only governance deviation.

```txt
shadow_score = shadow_base
```

Mapping from organization policy status:

```txt
approved          -> 0
newly_discovered  -> 20
under_review      -> 20
restricted        -> 40
prohibited        -> 80
missing/null      -> 20
```

Use case, context, account type, data type, frequency, automation, extensions, and agentic usage are not shadow variables.

### Exposure Score

The exposure score measures use and data risk, independent from governance status.

```txt
raw_exposure_score =
  (use_case_base * context_multiplier * account_multiplier)
  + data_boost
  + frequency_boost
  + automation_boost
  + extension_boost
  + agentic_boost

exposure_score = min(raw_exposure_score, 100)
```

This formula still applies when `shadow_score = 0`.

### Priority Score

The priority score combines governance deviation and exposure into DPO triage priority.

```txt
priority_score_raw =
  (0.45 * shadow_score)
  + (0.45 * exposure_score)
  + toxic_boost
  + review_boost

priority_score = min(priority_score_raw, 100)
```

`review_boost` is reserved for explicit DPO/admin overrides or hard review logic that raises triage priority without changing the underlying shadow or exposure scores. Any override must be auditable and must not rewrite the axis scores.

## Safeguards

V8.1 uses three safeguards to keep scoring explainable and prevent runaway scoring.

### 1. Additive Boosts, Not Extra Multipliers

Only use case, context, and account type are proportional multipliers.

These signals are additive boosts:

- data type
- frequency
- browser extension use
- automation
- agentic behavior

Frequency belongs in `exposure_score` as `frequency_boost`, not as a late priority correction. It represents cumulative exposure and should remain visible on the exposure axis.

### 2. Toxic Combination Cap

The toxic boost is controlled and additive:

```txt
toxic_boost = 20
```

It activates only when both axes cross their thresholds. It changes DPO urgency, not the underlying `shadow_score` or `exposure_score`.

### 3. Hybrid Aggregation

Run/respondent-level scoring must not be a simple sum or average of all tool scores.

Principle:

- highest individual tool `priority_score` determines the base
- additional tools may contribute only through a dampened addition
- final run-level/person score is capped at 100

Rationale: one critical tool/use-case/data combination should not disappear into an average, and ten low-risk tools should not outweigh one urgent DPO case.

The exact dampening formula may be finalized during implementation, but the methodological rule is fixed: quality of risk dominates quantity of tools.

## Banding

Dashboards should emphasize tiers over false precision.

Recommended score bands:

```txt
0-24    low
25-49   elevated
50-74   high
75-100  critical
```

Exact scores remain useful for sorting and audit, but management/DPO interpretation should focus on bands and review triggers.

## Review Triggers

Review triggers must be persisted as explainable codes.

Minimum active triggers:

```txt
prohibited_tool
agentic_usage
automation_unmanaged
extension_unmanaged
special_category_data
hr_evaluation_context
priority_threshold
manual_override
```

### Special Category Data

Approved tools with critical/special-category data remain visible.

```txt
special_category_data
```

fires when:

```txt
shadow_base = 0
and data_boost = 30
```

Rationale: a tool can be approved by the organization and still require DPO review when used with highly sensitive data.

### Priority Threshold

`priority_threshold` fires when:

```txt
priority_score >= scan_scoring_config.priority_review_threshold
```

Default:

```txt
priority_review_threshold = 40
```

It is not based on `exposure_score` alone.

## Toxic Combination

```txt
toxic_boost = 20
```

when:

```txt
shadow_score > toxic_shadow_threshold
and exposure_score > toxic_exposure_threshold
```

Defaults:

```txt
toxic_shadow_threshold = 50
toxic_exposure_threshold = 50
```

Because the current shadow scale is 0/20/40/80, `shadow_score > 50` effectively means `prohibited` / not allowed. `restricted` at 40 does not activate the toxic boost by itself.

## Legal And Governance Boundaries

The scan produces indicative risk and governance signals, not legal conclusions.

Do not present formal EU AI Act or GDPR qualifications in scan output. Labels such as legal attention point or further review recommended are DPO signals, not legal determinations.

Toxic combinations and legal attention points are separate concepts:

- toxic combination: score-engine outcome based on shadow and exposure thresholds
- legal attention point: pattern that may require further review even if the score is not toxic

Formal EU AI Act classification, supplier documentation, GPAI classification, conformity assessment, and legal qualification belong in later RouteAI workflows, not in SAI scoring alone.

## Exit Path

If a run has no AI tools because the respondent selected the no-tools path:

```txt
person_score = 0
assigned_tier = standard
review_trigger_codes = []
shadow_tool_count = 0
```

No `risk_result_tool` rows are written.

## Auditability

Persist:

- tool-level scores
- run-level score
- review trigger codes
- thresholds used
- calculated_at
- policy-status snapshot used for scoring

Historical scores must not silently change when policy thresholds or tool statuses are later updated.

## Privacy And Small Groups

SAI is an anonymous inventory and triage instrument, not an individual enforcement instrument.

Dashboard clusters should respect a minimum cell size. The default configuration is:

```txt
dashboard_min_cell_size = 5
```

Smaller clusters should be suppressed, merged, or shown only as qualitative signals.

## Social Indicators

Survey answers can produce social and governance insights, such as awareness gaps, uncertainty, training needs, or unmet internal tooling needs.

These are not score components unless explicitly defined in the formula. They should feed dashboard interpretation, governance planning, training, and later RouteAI workflows without silently changing `shadow_score` or `exposure_score`.
