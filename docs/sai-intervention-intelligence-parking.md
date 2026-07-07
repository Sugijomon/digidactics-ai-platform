# SAI Intervention Intelligence Parking

Status: parked. Not part of the current Learning System runtime.

## Purpose

SAI scan outputs can contain valuable aggregated signals for future organizational learning and intervention analysis.

This information may later help answer questions such as:

- Which risk patterns recur across departments or waves?
- Which use cases create the most uncertainty or governance pressure?
- Which tool/context combinations suggest a need for policy clarification?
- Which organization-level interventions could reduce repeated high-risk behavior?

This is an analysis flow, not a learner-facing recommendation flow.

## Boundary

For the current product architecture:

- SAI must not generate Learning System recommendations.
- SAI scan results must not unlock, block, or assign RouteAI learning content.
- The Learning System must focus on AI Literacy as a RouteAI access requirement.
- RouteAI risk classifications may later trigger microlearnings for medium and high risk use cases.

## Parked Signal Set

Potential non-PII or aggregated SAI signals to retain for later analysis:

```txt
trigger_codes
use_case_codes
context_codes
tool_codes
score_tiers
review_classes
scan_wave_id
org_id
department_code
aggregated counts
```

Free-text respondent input, emails, raw tool names, or direct identifiers should not be copied into this analysis layer.

## Future Shape

If activated later, this should become a separate analytics or intelligence module, for example:

```txt
sai_intervention_signal_snapshots
sai_intervention_insights
sai_intervention_recommendation_drafts
```

These outputs could support admin/DPO decision-making, content roadmap updates, or organization-level intervention planning.

They should not automatically assign learner content unless that product decision is explicitly made later.

## Relationship To Learning System

The current Learning System path is:

```txt
AI Literacy training -> RouteAI access gate -> RouteAI usecase check -> RouteAI-driven microlearning for medium/high risk
```

The parked SAI intelligence path is:

```txt
SAI scan results -> aggregated signal analysis -> possible future intervention insights
```

These paths should remain separate until a later architecture decision explicitly connects them.
