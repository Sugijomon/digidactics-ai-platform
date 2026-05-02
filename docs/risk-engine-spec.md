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
