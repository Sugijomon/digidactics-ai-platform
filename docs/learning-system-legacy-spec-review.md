# Learning System Legacy Spec Review

Status: reviewed against the Lovable export and RouteAI snapshot on 2026-05-08.

## Sources Reviewed

- `C:\Users\Gebruiker\Desktop\02. Shadow AI\02. Ontwikkeling\06. Lovable export\data_dictionary.md`
- `C:\Users\Gebruiker\Desktop\02. Shadow AI\02. Ontwikkeling\06. Lovable export\legacy_schema.sql`
- `C:\Users\Gebruiker\Desktop\02. Shadow AI\02. Ontwikkeling\06. Lovable export\legacy_sample_data\sample_data\*.json`
- `C:\Users\Gebruiker\Desktop\Downloads\sugijomon-routeai-compass-55-8a5edab282632443(11).txt`

There was no single standalone Learning System `.md` spec in the Lovable export by filename. The old specification is spread across the data dictionary, SQL schema, sample data, and the RouteAI project snapshot.

## Product Reading

The old RouteAI snapshot already used the "rijbewijs" metaphor: capability-based compliance rather than a checkbox exercise.

It also described AISA as a separate AI skills product with no technical RouteAI coupling. The current product decision is more specific:

- AI Literacy is the hard access gate for RouteAI usecase checks.
- RouteAI can later require microlearnings for medium/high risk classifications.
- SAI scan signals are parked outside the current Learning System runtime.

This means the new foundation should keep the old capability-gate idea, but avoid rebuilding the old SAI/orange-assessment assignment flow as current LS behavior.

## Covered In The New Foundation

The current Next.js/Supabase foundation covers the important backend primitives:

- courses and ordered lessons
- JSON lesson content
- lesson progress
- lesson attempts
- course enrollments
- learning catalog assignment per organization
- RouteAI-oriented recommendation rules
- AI Literacy certification
- capability access checks via `learning_check_capability_access`

This is enough to build a first visible Learning System experience: catalog, AI Literacy course view, lesson player skeleton, progress, and RouteAI access gate.

## Legacy Concepts Not Yet Rebuilt

### General Learning Library

The old `learning_library` worked as a broader library around courses, modules, assessments, documents, and microlearnings. It included metadata such as:

- `content_type`
- `difficulty_level`
- `learning_objectives`
- `required_for_license`
- `cluster_id`
- `archetype_codes`
- `is_activation_req`
- `context_card`
- linked `lesson_id`

The new model keeps most of this intent across courses, lessons, and recommendation rules, but does not yet have a single generalized library table for all document/content types.

### Quiz Question Bank

The old model had separate `learning_questions`, `learning_answers`, `check_quiz_answer`, and `finalize_lesson_attempt` behavior.

The new model intentionally keeps quiz/content blocks inside lesson JSON for portability, but server-side objective grading is not implemented yet.

### Automatic Microlearning Assignment

The old schema had `assign_microlearning_on_orange_assessment()` and an orange-assessment trigger. That flow should not be rebuilt as current Learning System behavior because it is tied to the old assessment route.

For the new product, microlearning assignment should be created from RouteAI risk-engine outcomes, not SAI scan results and not the old orange route.

### Completion Tables

The old model had separate user completion/progress tables for courses and lessons. The new model consolidates this through enrollments, lesson progress, attempts, and certifications.

This is a cleaner direction for the new stack, but the UI needs to compute familiar progress states from these newer tables.

## Recommendation

Do not copy the old Learning System one-to-one.

Keep the current foundation and build the next layer in this order:

1. Build the visible AI Literacy course and lesson viewer.
2. Wire progress and enrollment updates.
3. Add a trusted server flow that issues `ai_literacy_foundation` only after the course completion rule passes.
4. Add the RouteAI access guard using `learning_check_capability_access`.
5. Add RouteAI microlearning requirement tables only after the RouteAI usecase/risk-result model is in place.

Before merging to production, no blocking legacy-field gap was found. The likely future additions are nullable metadata fields for learning objectives, context cards, and cluster/archetype labels. Those can be added later without breaking the foundation.

