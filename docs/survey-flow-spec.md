# Survey Flow Spec

This document is the active product specification for the Shadow AI Scan respondent survey.

Source references and question/answer overviews live under `references/source-docs/sai/survey/`. Active implementation decisions are summarized in this spec.

## Product Boundary

The survey is the respondent experience:

- simple and safe
- step-by-step
- suitable for honest self-reporting
- writes structured scan data
- avoids DPO/admin terminology where possible

The DPO dashboard is a separate analysis and triage experience.

## Current Screens

The current HTML reference screens live in `design-html/sai/survey/`:

```txt
screen-01-intro.html
screen-02-werkplek.html
screen-03-frequentie.html
screen-04-toolpicker-fixed.html
screen-05-datatype.html
screen-06-accountmatrix.html
screen-07-vaardigheid-spelregels.html
screen-08-toekomst.html
screen-09-afronding.html
```

## Terminology Decision: Vakgebied

Use **Vakgebied** as the product term instead of **Afdeling** for Q2 and related dashboard labels where the survey asks about the respondent's organizational/work context.

Rationale:

- “Afdeling” sounds like a formal org chart unit.
- “Vakgebied” is broader and works better for smaller organizations, hybrid roles, and cross-functional work.
- It reduces the feeling that the scan is identifying a person by department.

Recommended Q2 copy:

```txt
Vraag: Binnen welk vakgebied ben je voornamelijk actief?
```

Suggested option values can still map to stable internal codes, for example:

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

UI labels may be Dutch and user-friendly; stored codes should remain stable and lowercase.

## Implementation Notes

- Keep survey UI wording respondent-friendly.
- Keep stored values stable and independent from label changes.
- Do not use dashboard/DPO terminology in survey screens unless required.
- If labels change, update this spec and the relevant HTML/React screens together.
