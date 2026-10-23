# AI-Foto Analysis Spec

Status: draft v0.1, based on Fable design feedback and the existing SAI
variant architecture.

## Boundary

AI-Foto analysis is a card and decision-preparation layer over the SAI record
plane. It does not change SAI V8.1 scoring.

```txt
survey_run / survey_tool / survey_application
  -> deterministic ai-foto-analysis-v1
    -> card_item
      -> approved customer cards and export audit
```

The output is signalering and besluitvoorbereiding. It is not a legal
classification, DPIA, compliance guarantee, audit, employee performance view,
or complete AI register.

## Card Types

```txt
waarde
aandacht
vaardigheid
```

Each card item must have a structured source, respondent count, evidence refs,
and status. Free-text task descriptions may guide clustering, but customer
output should default to structured observations and not quote individual
respondents.

## Evidence Levels

```txt
gesteld      survey signal without concrete example or measurement indication
aannemelijk  survey signal with concrete example or measurement indication
aangetoond   manual only after triangulation outside the survey
```

Automatic analysis may never raise a record to `aangetoond`. Survey-only input
sets a ceiling:

```txt
value_evidence_code = feeling_estimate  -> max gesteld
value_evidence_code = concrete_example  -> max aannemelijk
value_evidence_code = measurable        -> max aannemelijk
value_evidence_code = unknown           -> max gesteld
missing value_evidence_code             -> max gesteld
```

## Attention Level

`ai-foto-analysis-v1` uses deterministic attention levels:

```txt
basis
middel
hoog
```

High attention is assigned when an application has any near-miss signal except
neutral non-answers, automatic output processing, important-decision people
impact, or a personal free account environment.

Medium attention is assigned when output control is partial or missing, factual
AI visibility is absent or unknown, reporting/escalation awareness is unclear,
or control/rework is substantial.

Otherwise the level is basis.

These levels are operational signal bands, not legal risk classes.

## Clustering

The default cluster key is:

```txt
tool_name_normalized + use_case_code
```

Segment may be added only when the segment meets the active
`dashboard_min_cell_size`. Small segments must be merged, suppressed, or shown
only as qualitative organization-wide signals.

## Card Routing

Waardekaart uses value type, beneficiary, net effect, control/rework,
shareability, value evidence, frequency, and conditions.

Aandachtspuntenkaart uses application data types, account/work environment,
output destination, output control, people impact, deviation authority,
factual visibility, reporting awareness, escalation awareness, near misses, and
conditions.

Vaardighedenkaart uses the AI-Foto doubt scenario, output control behavior,
data-use uncertainty, near-miss categories, visibility/reporting uncertainty,
escalation uncertainty, and support needs.

## Human Review

The following fields require human review before export:

- interpretation;
- selected open questions;
- precaution;
- follow-up direction;
- proposed owner role;
- review date;
- relations between card items;
- the final selection of items per exported card.

An exported customer card may use only `approved` items.

## Workbench Workflow

The dashboard workbench may generate card items from completed AI-Foto
`survey_application` records. Generation is idempotent by organization, scan
wave, analysis version, card type, source kind, and cluster key. It may insert
new `ai_suggested` items or refresh editable draft items, but approved items
must remain stable.

Human users may edit title, observation, interpretation, open questions,
precaution, follow-up direction, owner role, review date, and evidence level.
Approval requires title, observation, interpretation, respondent count,
analysis version, evidence refs, and neutral wording without legal conclusion
phrases such as compliance guarantees.

## GenAI Guardrails

GenAI may propose titles, observation wording, and B1 rewrites using only
aggregated structured fields and evidence refs. It may not add facts, quote or
paraphrase individual free text, assign legal qualifications, raise evidence
levels, determine owner/termijn definitively, or produce final decision points.

Generated output must be logged with prompt/model/version metadata before it
can become an auditable artifact.

## Export Rules

Exports use fixed templates for:

```txt
Waardekaart
Aandachtspuntenkaart
Vaardighedenkaart
```

Each export records method version, analysis version, selected item ids,
actor, timestamp, source limits, and suppressions in the existing evidence
plane (`report_exports` and/or `audit_events`). The template includes the fixed
disclaimer: signalering en besluitvoorbereiding, geen juridische classificatie,
audit of compliancegarantie.

The first export step is a preview registration only: it records an
approved-only selection in `report_exports` with `export_status =
preview_ready`, without creating a final PDF/A3 file.

Staging validation is documented in
[`docs/ai-foto-staging-smoke-runbook.md`](ai-foto-staging-smoke-runbook.md).
