# Learning System Product Spec

Status: product direction v0.1.

This specification fixes the intended product logic for the RouteAI Learning System before UI and app implementation starts.

Implementation note: the first certification/access-gate database layer lives in `supabase/migrations/20260508100000_learning_certification_access_gate.sql`.

## Product Role

The Learning System is not a generic recommendation layer.

Its first role is to provide an AI Literacy training that acts as a hard access requirement for RouteAI.

After access is granted, RouteAI may require extra microlearnings based on the risk classification of a submitted AI use case.

## Core Flow

```txt
User account
-> AI Literacy training
-> AI Literacy completion/certificate
-> RouteAI access granted
-> RouteAI usecase check
-> RouteAI risk classification
-> optional required microlearnings for medium/high risk
```

## Hard Gate

AI Literacy completion is a hard criterion for RouteAI access.

RouteAI should check this before allowing a user to submit or run usecase checks.

Expected behavior:

- No valid AI Literacy completion: user can access learning, but not RouteAI checks.
- Valid AI Literacy completion: user can access RouteAI checks.
- Expired or superseded AI Literacy completion: user must renew before RouteAI checks continue.

The exact UX can be decided later, but the product rule is fixed.

## Learning Content Types

Current architecture note:

```txt
Course -> Topic -> Page -> JSONB blocks
```

Full authored courses use `learning_topics`, `learning_pages`,
`learning_page_progress`, and `learning_page_attempts`. Legacy
`learning_lessons` tables remain available for microlearnings and compatibility
until that path is deliberately retired.

### AI Literacy Foundation

The foundation course is the baseline "rijbewijs".

It should cover:

- what AI is and is not
- responsible use of AI output
- data, confidentiality, and privacy
- human oversight
- organizational policy awareness
- when to use RouteAI for a usecase check

### Microlearning Library

Microlearnings are short targeted modules linked to RouteAI risk patterns.

They can cover topics such as:

- high-impact decision support
- sensitive or confidential data
- human oversight
- bias and discrimination risk
- transparency and user communication
- prohibited or unacceptable use patterns
- documentation and evidence requirements

Microlearnings are not triggered by SAI scan results in the current product.

## RouteAI Risk Link

RouteAI is the source of usecase classification.

The Learning System may use RouteAI outputs such as:

```txt
routeai_risk_class
eu_ai_act_classification
trigger_codes
use_case_codes
context_codes
sector_tags
required_controls
```

Medium and high RouteAI risk classes may create required learning actions.

The Learning System must not change RouteAI risk scores or classifications. It only interprets RouteAI outcomes for training/access purposes.

## SAI Boundary

SAI scan results are valuable, but they are not part of the current LS runtime.

SAI must not:

- assign learner-facing LS recommendations
- unlock or block RouteAI access
- directly create LS enrollments
- directly require microlearnings

SAI-derived signals are parked for future aggregated intervention intelligence in `docs/sai-intervention-intelligence-parking.md`.

## Data Model Additions Needed

The existing foundation tables cover content, enrollments, lesson progress, attempts, and rule definitions.

The next database layer should add certification and access semantics.

Implemented foundation tables:

```txt
learning_certifications
learning_access_requirements
```

Future RouteAI microlearning tables:

```txt
routeai_learning_requirements
routeai_learning_requirement_completions
```

### `learning_certifications`

Represents a user's earned certificate.

Suggested fields:

```txt
id
org_id
user_id
course_id
certification_code
status                  -- active | expired | revoked | superseded
issued_at
expires_at
superseded_by_id
created_at
updated_at
```

### `learning_access_requirements`

Defines which certification is required for a platform capability.

Suggested fields:

```txt
id
capability_code         -- routeai_usecase_check
required_certification_code
org_id                  -- null for platform default
is_active
created_at
updated_at
```

### `routeai_learning_requirements`

Represents microlearning requirements created from a RouteAI usecase result.

Suggested fields:

```txt
id
org_id
user_id
routeai_usecase_id
routeai_result_id
lesson_id
course_id
requirement_reason_code
risk_class
status                  -- required | in_progress | completed | waived
due_at
created_at
updated_at
```

### `routeai_learning_requirement_completions`

Links required RouteAI microlearnings to actual learning completion.

Suggested fields:

```txt
id
requirement_id
lesson_progress_id
course_enrollment_id
completed_at
created_at
```

## Access Check Contract

The first useful backend helper should answer:

```txt
Can this user access RouteAI usecase checks?
```

Suggested response shape:

```json
{
  "can_access": true,
  "capability_code": "routeai_usecase_check",
  "required_certification_code": "ai_literacy_foundation",
  "certification_status": "active",
  "expires_at": "2027-05-07T00:00:00Z"
}
```

Implemented RPC:

```txt
learning_check_capability_access(p_capability_code text)
```

Certification issue RPC:

```txt
learning_issue_certification_for_enrollment(p_enrollment_id uuid)
```

Certification issue is deliberately restricted to learning admins/trusted server flows until objective grading and completion rules are fully enforced server-side.

Current TypeScript completion gate:

- all required `learning_pages` must be completed
- pages with manual-review evidence must have a latest attempt with
  `manual_review_required = false` and `passed = true`
- auto-gradable pages must meet the course `passing_threshold`
- certificate evidence must cover the critical competencies C4 data/privacy,
  C6 human oversight, and C8 escalation/evidence

The shared helper is `evaluateLearningCertificationEligibility(...)` in
`packages/domain/learning.ts`. The SQL certificate issue RPC still only checks
that the enrollment is completed, so direct RPC use should stay trusted/admin
only until the SQL side mirrors this eligibility contract or calls a trusted
server action that uses it.

If blocked:

```json
{
  "can_access": false,
  "capability_code": "routeai_usecase_check",
  "required_certification_code": "ai_literacy_foundation",
  "certification_status": "missing",
  "required_course_code": "ai-literacy-foundation"
}
```

## Implementation Order

1. Build lesson/course UI for AI Literacy in `apps/rai`.
2. Track completion reliably through `learning_lesson_progress` and `learning_course_enrollments`.
3. Wire the existing `learning_certifications` and access requirement RPCs into the first server actions.
4. Add RouteAI gate middleware/server guard once the RouteAI app surface exists.
5. Add RouteAI microlearning requirements once the RouteAI usecase model and risk result model exist.

## Explicit Non-Goals For Now

- No SAI-to-LS learner recommendations.
- No automatic SAI-driven enrollments.
- No generative personalization of required learning.
- No direct LS dependency on SAI survey tables.
- No RouteAI risk score mutation from learning state.
