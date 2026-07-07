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

These HTML screens are the canonical UX reference for the respondent flow. The
production Next.js implementation should follow their screen order, visual
hierarchy, question grouping, validation behavior, and respondent-facing copy as
closely as possible.

Canonical respondent order:

```txt
intro/access code
werkplek
frequentie + motivatie
toolpicker with use-case selection
datatype + data awareness + anonymization
account matrix + browser extensions + agents/automation
vaardigheid + spelregels + tool preference + output handling
toekomst + concerns + support needs
afronding + ambassador opt-in
```

Exit path:

If a respondent answers that they currently do not use AI tools, the flow asks
for the main reason and then skips the toolpicker, datatype, account, and
literacy screens. The respondent continues at `screen-08-toekomst.html`
(`/survey/future`) and can complete the scan without registering a tool.

Technical RPC checks, token-burn verification, and other implementation details
must not be exposed as respondent steps. The respondent should complete the scan
with a single final action.

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
