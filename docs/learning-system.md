# RouteAI Learning System

Status: foundation v0.1.

This document describes the first production-grade Learning System foundation for RouteAI, built on the shared SAI & RAI Supabase database.

Product behavior is specified in `docs/learning-system-product-spec.md`.

## Positioning

The Learning System is a RouteAI module that can run independently while SAI is being completed.

It shares the platform foundation:

- `organizations`
- `profiles`
- `user_roles`
- `audit_events`

It does not depend on SAI survey tables for its core operation.

## Why JSONB Content Is Intentional

Lesson content is stored as versioned JSONB. This is a deliberate product choice, not a temporary shortcut.

Reasons:

- AI Act interpretation, internal policy, sector examples, and training cases will evolve.
- Lessons need to support different block types without schema churn.
- Sector-specific cases can be added without rebuilding the lesson engine.
- Content can be reviewed, superseded, and versioned while preserving learner history.

The authoritative table is `learning_lessons`.

Key fields:

- `lesson_code`
- `content_schema_version`
- `content`
- `version`
- `supersedes_lesson_id`
- `sector_tags`
- `use_case_codes`
- `context_codes`
- `trigger_codes`
- `regulatory_frameworks`
- `ai_act_archetypes`

The database validates that content is a JSON object with either `blocks[]` or `topics[]`.

## Content Model

The preferred content shape for v1 is:

```json
{
  "version": 1,
  "blocks": [
    {
      "id": "hero",
      "type": "hero",
      "title": "Wat is AI?",
      "subtitle": "Begrijp het systeem voordat je de output vertrouwt."
    }
  ]
}
```

Supported block types are defined in `packages/domain/learning.ts`.

The model intentionally allows additional fields per block. Runtime rendering must validate by block `type` and ignore unknown fields safely.

## Tables

Authoritative content:

- `learning_courses`
- `learning_lessons`
- `learning_course_lessons`
- `learning_catalog`

Learner state:

- `learning_course_enrollments`
- `learning_lesson_progress`
- `learning_lesson_attempts`
- `learning_certifications`

Access and rule bridge:

- `learning_access_requirements`
- `learning_recommendation_rules`

## Platform Vs Organization Content

Platform content has `org_id = NULL`.

Organization-specific content or overrides use `org_id`.

This supports:

- reusable Digidactics content
- sector modules
- customer-specific policy training
- future partner-created modules

## RouteAI Learning Gate

The Learning System exists first as an AI Literacy training and access gate for RouteAI.

The intended flow:

- A user completes the AI Literacy foundation training.
- Completion acts as a hard access criterion for RouteAI usecase checks.
- RouteAI classifies submitted use cases through its own risk engine.
- Medium and high risk RouteAI outcomes can require additional microlearnings from the learning library.

The first access RPC is `learning_check_capability_access('routeai_usecase_check')`.

SAI scan outputs must not drive learner-facing LS recommendations in the current product. SAI-derived intervention intelligence is parked separately in `docs/sai-intervention-intelligence-parking.md`.

## RLS Model

All learning tables have RLS enabled.

High-level access:

- Platform published content: readable by authenticated users.
- Org content: readable by members of that org.
- Content management: `super_admin`, `content_editor`, or `org_admin` for own org.
- Learner progress: user can read/update own progress.
- Certifications: user can read own certifications; admins/DPOs can read org certifications.
- Access requirements: readable for authenticated users; managed by learning admins.
- Org admin/DPO: can read org progress for governance dashboards.
- Recommendation rules: platform or own-org readable; managed by learning admins.

## Initial Seed

The seed adds:

- Course: `ai-literacy-foundation`
- Lessons:
  - `ai-literacy-what-is-ai`
  - `ai-literacy-data-and-confidentiality`
  - `ai-literacy-human-oversight`
- Foundation recommendation rules and high-risk microlearning examples.

The seed is deliberately clean and rewritten from the Lovable direction instead of copying old demo data.

## Next Implementation Steps

1. Add a Next.js learning surface for the AI Literacy foundation course in `apps/rai`. Done.
2. Build a renderer for v1 lesson blocks. Done.
3. Track reliable course completion. First server-action layer is in place for enrollments and lesson progress; it requires an authenticated Supabase session.
4. Wire `learning_check_capability_access` into a server action.
5. Add a trusted certification issue flow after verified AI Literacy completion.
6. Model medium/high RouteAI risk classes to required microlearnings once RouteAI usecase results exist.

## Current App Integration

The first RAI app surface lives in `apps/rai`.

Routes:

- `/learning`
- `/learning/ai-literacy-foundation`
- `/learning/ai-literacy-foundation/[lessonCode]`

The UI reads the AI Literacy course and lessons from Supabase when a valid
session/configuration is available. In local development, it falls back to the
seed-equivalent preview content so the course viewer remains inspectable before
auth is wired.

Server actions:

- `startAiLiteracyCourse`
- `completeAiLiteracyLesson`

These actions use the authenticated Supabase session and write to:

- `learning_course_enrollments`
- `learning_lesson_progress`

Certificate issuance is deliberately not triggered from the lesson UI yet. The
next step is to add the access-check and certificate issue flow after the RAI
auth/session surface is in place.

## RAI Auth Session

The RAI app has a minimal Supabase magic-link login surface:

- `/auth/login`
- `/auth/check-email`
- `/auth/callback`
- `/auth/sign-out`

Middleware refreshes Supabase cookies so Server Components and Server Actions can
read the authenticated user. Local development currently uses the Supabase dev
branch in `.env.local`.

Supabase Auth must allow the local callback URL during development:

```txt
http://localhost:3010/auth/callback
```

Once login succeeds, the Learning System can write enrollments and lesson
progress through the existing server actions.
