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

## Product Variants

The default respondent flow remains the SAI / Shadow AI Scan V8.1 flow.

AI-Foto is a scan variant that reuses the SAI foundation and adds a concrete
application-depth layer. The variant is selected by the active `scan_wave`
through:

```txt
product_code = ai_foto
method_version = ai-foto-scan-v1
```

SAI V8.1 keeps:

- broad tool inventory;
- use-case selection;
- data/account/frequency/automation/literacy questions;
- trusted server-side V8.1 scoring;
- DPO triage output.

AI-Foto adds, after broad tool/use-case selection, a primary concrete
application step. The respondent selects one chosen tool/use-case combination
that is most important, frequent, or relevant to deepen. A secondary application
may be added later only if the flow remains short enough.

The AI-Foto application step collects:

- short concrete task description;
- application-specific frequency;
- value type, beneficiary, net effect, control/rework, and shareability;
- application-specific data categories and account/environment;
- output destination, output control, and ability to deviate from AI output;
- people impact and transparency;
- near-miss or extra-correction signals;
- escalation-route awareness;
- application-specific support needs;
- short scenario-style skill responses.

These answers feed AI-Foto analysis cards and decision preparation. They do not
silently change SAI V8.1 scoring.

Implemented variant routing:

- `/survey/tools` remains the shared broad tool/use-case selection screen.
- For `productCode = sai`, continuing from `/survey/tools` goes directly to
  `/survey/data`.
- For `productCode = ai_foto`, continuing from `/survey/tools` goes to
  `/survey/application`.
- `/survey/application` stores the primary concrete application through
  `save_survey_application(...)`, then continues to `/survey/data`.
- Existing SAI sessions do not see or require the AI-Foto application step.

AI-Foto application-step UX rules:

- Keep the respondent-facing step shorter than the full consultant interview.
- Present the application step as a sequence of short beats, not as one
  repeated form pattern:
  `Praktijkvoorbeeld`, `Datastroom`, `Mensimpact`, `Waarde`, and
  `Afronding`.
- Use compact answer cards and a single application-flow diagram in this step
  to reduce perceived length and to show why data, environment, output, and
  control belong together.
- The selected tool/use-case may be preselected from the toolpicker. Content
  answers such as frequency, account environment, data categories, value, and
  near-miss signals must not be pre-filled because defaults can steer answers.
- Required fields are limited to concrete application, frequency, account or
  work environment, output destination, output control, data categories, people
  impact, core value signals, control/rework, and value evidence indication.
- The deviation question is conditionally shown only when the respondent says
  the output can affect customers, colleagues, candidates, inhabitants, or an
  important decision.
- Conditions, near-miss signals, support needs, shareability, visibility,
  reporting awareness, and escalation-route awareness are visible in the flow
  but may remain optional with "weet ik niet" or neutral non-answer choices
  where appropriate. They must no longer be hidden under a consultant/DPO
  accordion.
- Near-miss copy must explicitly say that answers are used for pattern
  detection and are not shown as individual employee records.
- Free-text task descriptions must ask for general wording and avoid names,
  dossier numbers, e-mail addresses, or customer details. The UI may show soft
  warnings for obvious personal-data patterns.
- Application-level skill responses are not asked in this MVP step. The
  Vaardighedenkaart may infer support signals from data, output-control,
  near-miss, visibility, and transparency answers. One run-level
  AI-Foto-only scenario question may be asked in the literacy step to give the
  Vaardighedenkaart a positive handling signal. Do not reintroduce a
  per-application skill matrix.

AI-Foto shared data-step rule:

- `/survey/data` remains the shared SAI run-level data screen and still feeds
  SAI V8.1 data boosts.
- For `productCode = ai_foto`, the screen copy must make the level difference
  explicit: "Naast je praktijkvoorbeeld: welke soorten informatie voer je wel
  eens in bij AI-tools?"
- The application-level data categories selected in `/survey/application` may
  be shown as "al genoteerd bij je praktijkvoorbeeld", but they must not be
  used as pre-filled answers for the run-level data question.

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
AI-Foto only: concrete application depth step
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
