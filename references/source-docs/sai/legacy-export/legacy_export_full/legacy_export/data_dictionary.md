# Data Dictionary — Lovable legacy database

Bron: Supabase project (public schema). Geëxtraheerd: zie `meta_columns.tsv`.
Aantal tabellen: 66. Totaal kolommen: 610.

Legenda kolom **PII?**: of het veld persoonlijk identificeerbaar kan zijn.
Legenda kolom **V8.1?**: of het veld waarschijnlijk nodig is voor V8.1 scoring.

## `_legacy_tools_catalog` _(LEGACY)_
Rijen (approx): **2**. PK: `id`. FK's: 2. Unique: 2. Checks: 3.
RLS-policies: 3.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | — | nee |  |  |
| `org_id` | uuid | NO | — | — | nee |  | → `.` |
| `tool_id` | uuid | NO | — | — | nee |  | → `.` |
| `is_enabled` | boolean | YES | false | — | nee |  |  |
| `custom_guidelines` | text | YES | — | — | nee |  |  |
| `custom_risk_notes` | text | YES | — | — | nee |  |  |
| `custom_display_name` | text | YES | — | — | ja |  |  |
| `contract_reference` | text | YES | — | — | nee |  |  |
| `procurement_date` | date | YES | — | — | nee |  |  |
| `contract_expiry_date` | date | YES | — | — | nee |  |  |
| `procurement_contact` | text | YES | — | — | nee |  |  |
| `cost_center` | text | YES | — | — | nee |  |  |
| `usage_limits` | text | YES | — | — | nee |  |  |
| `monthly_cost` | numeric | YES | — | — | nee |  |  |
| `allowed_roles` | ARRAY | YES | '{user,manager,org_admin}'::text[] | — | nee |  |  |
| `requires_approval` | boolean | YES | false | — | nee |  |  |
| `custom_icon_url` | text | YES | — | — | nee |  |  |
| `display_priority` | integer | YES | 0 | — | nee |  |  |
| `notes` | text | YES | — | — | nee |  |  |
| `created_at` | timestamp with time zone | YES | now() | — | nee |  |  |
| `updated_at` | timestamp with time zone | YES | now() | — | nee |  |  |

## `admin_audit_log`
Rijen (approx): **39**. PK: `id`. FK's: 0. Unique: 0. Checks: 6.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "82b64341-bd42-4c35-be10-40a86ae4c200" | nee |  |  |
| `actor_id` | uuid | NO | — | "b9760186-050a-47e7-a480-197ba0dc5c5a" | nee |  |  |
| `action` | text | NO | — | "role.assign" | nee |  |  |
| `target_table` | text | NO | — | "user_roles" | nee |  |  |
| `target_id` | uuid | NO | — | "f9a52b1f-d8ec-4e2b-924c-a2649ea31030" | nee |  |  |
| `target_user_id` | uuid | YES | — | "ae974c57-2c88-409c-a75e-75a149a95ffe" | nee |  |  |
| `org_id` | uuid | YES | — | "00000000-0000-0000-0000-000000000001" | nee |  |  |
| `old_value` | jsonb | YES | — | {"role": "user", "org_id": "00000000-0000-0000-0000-00000… | nee |  |  |
| `new_value` | jsonb | YES | — | {"role": "dpo", "org_id": "00000000-0000-0000-0000-000000… | nee |  |  |
| `reason` | text | YES | — | — | nee |  |  |
| `created_at` | timestamp with time zone | NO | now() | "2026-03-31T09:55:55.884529+00:00" | nee |  |  |

## `archetype_ml_map`
Rijen (approx): **3**. PK: `id`. FK's: 1. Unique: 1. Checks: 3.
RLS-policies: 3.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "a3000000-0000-0000-0000-000000000001" | nee |  |  |
| `archetype_code` | text | NO | — | "O-01" | nee |  |  |
| `library_item_id` | uuid | NO | — | "a2000000-0000-0000-0000-000000000001" | nee |  | → `.` |
| `context_card_text` | text | YES | — | "Deze toepassing beoordeelt of rankt mensen of hun output… | nee |  |  |
| `is_active` | boolean | YES | true | true | nee |  |  |
| `created_at` | timestamp with time zone | YES | now() | "2026-03-28T01:40:13.056355+00:00" | nee |  |  |
| `updated_at` | timestamp with time zone | YES | now() | "2026-03-28T01:40:13.056355+00:00" | nee |  |  |

## `assessment_ml_assignments` _(EMPTY)_
Rijen (approx): **0**. PK: `id`. FK's: 3. Unique: 2. Checks: 6.
RLS-policies: 3.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | — | nee |  |  |
| `assessment_id` | uuid | NO | — | — | nee |  | → `.` |
| `user_id` | uuid | NO | — | — | nee |  | → `.` |
| `library_item_id` | uuid | NO | — | — | nee |  | → `.` |
| `is_required` | boolean | NO | true | — | nee |  |  |
| `context_card_text` | text | YES | — | — | nee |  |  |
| `assigned_at` | timestamp with time zone | NO | now() | — | nee |  |  |

## `assessment_ml_completions` _(EMPTY)_
Rijen (approx): **0**. PK: `id`. FK's: 3. Unique: 3. Checks: 5.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | — | nee |  |  |
| `assessment_id` | uuid | NO | — | — | nee |  | → `.` |
| `user_id` | uuid | NO | — | — | nee |  | → `.` |
| `library_item_id` | uuid | NO | — | — | nee |  | → `.` |
| `completed_at` | timestamp with time zone | NO | now() | — | nee |  |  |
| `module_version` | text | YES | — | — | nee |  |  |

## `assessments` _(EMPTY)_
Rijen (approx): **0**. PK: `id`. FK's: 3. Unique: 0. Checks: 18.
RLS-policies: 4.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | — | nee |  |  |
| `org_id` | uuid | NO | — | — | nee |  | → `.` |
| `created_by` | uuid | NO | — | — | nee |  | → `.` |
| `created_at` | timestamp with time zone | NO | now() | — | nee |  |  |
| `updated_at` | timestamp with time zone | NO | now() | — | nee |  |  |
| `tool_id` | uuid | YES | — | — | nee |  |  |
| `tool_name_raw` | text | NO | — | — | ja |  |  |
| `survey_answers` | jsonb | NO | — | — | nee |  |  |
| `route` | assessment_route enum(green|yellow|orange|red) | NO | — | — | nee |  |  |
| `primary_archetype` | text | NO | — | — | nee |  |  |
| `secondary_archetypes` | ARRAY | YES | '{}'::text[] | — | nee |  |  |
| `archetype_refs` | ARRAY | NO | — | — | nee |  |  |
| `escalation_refs` | ARRAY | YES | '{}'::text[] | — | nee |  |  |
| `plain_language` | text | NO | — | — | nee |  |  |
| `routing_method` | routing_method enum(deterministic|claude_assisted) | NO | 'deterministic'::routing_method | — | nee |  |  |
| `decision_version` | text | NO | — | — | nee |  |  |
| `claude_input_hash` | text | YES | — | — | nee |  |  |
| `reason_filtered` | text | YES | — | — | nee |  |  |
| `dpia_required` | boolean | NO | false | — | nee |  |  |
| `fria_required` | boolean | NO | false | — | nee |  |  |
| `transparency_required` | boolean | NO | false | — | nee |  |  |
| `transparency_template` | text | YES | — | — | nee |  |  |
| `dpo_oversight_required` | boolean | NO | false | — | nee |  |  |
| `user_instructions` | ARRAY | YES | '{}'::text[] | — | nee |  |  |
| `dpo_instructions` | ARRAY | YES | '{}'::text[] | — | nee |  |  |
| `status` | assessment_status enum(active|paused|stopped|superseded|pending_review|pending_dpo) | NO | 'active'::assessment_status | — | nee |  |  |
| `reviewer_admin_id` | uuid | YES | — | — | nee |  | → `.` |
| `reviewed_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `eu_act_category` | text | YES | — | — | nee |  |  |

## `course_lessons`
Rijen (approx): **15**. PK: `id`. FK's: 2. Unique: 6. Checks: 2.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "b090269e-f9ea-4052-8161-af2f96626ed0" | nee |  |  |
| `course_id` | uuid | YES | — | "c1dfe82a-490b-4097-977a-4072838f5bb1" | nee |  | → `.` |
| `lesson_id` | uuid | YES | — | "ee735f9c-95f2-4ca1-9b41-5d5ce4cfc0bf" | nee |  | → `.` |
| `sequence_order` | integer | NO | — | 2 | nee |  |  |
| `is_required` | boolean | YES | true | true | nee |  |  |

## `courses`
Rijen (approx): **4**. PK: `id`. FK's: 1. Unique: 0. Checks: 3.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "fb2c4e2a-2c6b-4c81-a0e4-6142ab790f34" | nee |  |  |
| `title` | text | NO | — | "AI Proficiency" | nee |  |  |
| `description` | text | YES | — | "**AI Proficiency** gaat een stap verder …[truncated]" | nee |  |  |
| `required_for_onboarding` | boolean | YES | false | false | nee |  |  |
| `passing_threshold` | integer | YES | 80 | 80 | nee |  |  |
| `unlocks_capability` | text | YES | — | "ai_check" | nee |  |  |
| `is_published` | boolean | YES | false | false | nee |  |  |
| `created_at` | timestamp with time zone | YES | now() | "2026-03-13T11:25:51.283503+00:00" | nee |  |  |
| `updated_at` | timestamp with time zone | YES | now() | "2026-03-13T11:25:51.283503+00:00" | nee |  |  |
| `org_id` | uuid | NO | — | "00000000-0000-0000-0000-000000000001" | nee |  | → `.` |

## `dpo_notifications` _(EMPTY)_
Rijen (approx): **0**. PK: `id`. FK's: 3. Unique: 0. Checks: 5.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | — | nee |  |  |
| `org_id` | uuid | NO | — | — | nee |  | → `.` |
| `assessment_id` | uuid | YES | — | — | nee |  | → `.` |
| `type` | dpo_notification_type enum(orange_route_new|red_route_blocked|incident_high|reexam_requ) | NO | — | — | nee |  |  |
| `status` | dpo_notification_status enum(pending|seen|actioned|dismissed) | NO | 'pending'::dpo_notification_status | — | nee |  |  |
| `created_at` | timestamp with time zone | NO | now() | — | nee |  |  |
| `seen_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `actioned_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `actioned_by` | uuid | YES | — | — | nee |  | → `.` |
| `notes` | text | YES | — | — | nee |  |  |

## `incidents` _(EMPTY)_
Rijen (approx): **0**. PK: `id`. FK's: 4. Unique: 0. Checks: 8.
RLS-policies: 3.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | — | nee |  |  |
| `org_id` | uuid | NO | — | — | nee |  | → `.` |
| `assessment_id` | uuid | YES | — | — | nee |  | → `.` |
| `reported_by` | uuid | NO | — | — | nee |  | → `.` |
| `created_at` | timestamp with time zone | NO | now() | — | nee |  |  |
| `description` | text | NO | — | — | nee |  |  |
| `severity` | incident_severity enum(low|medium|high) | NO | — | — | nee |  |  |
| `output_used` | text | YES | — | — | nee |  |  |
| `dpo_notified` | boolean | NO | false | — | nee |  |  |
| `dpo_reviewed_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `dpo_notes` | text | YES | — | — | nee |  |  |
| `dpo_action` | incident_dpo_action enum(auto_handled|reviewed|intervention_planned|resolved) | YES | — | — | nee |  |  |
| `dpo_reviewed_by` | uuid | YES | — | — | nee |  | → `.` |

## `learning_answers` _(EMPTY)_
Rijen (approx): **0**. PK: `id`. FK's: 4. Unique: 3. Checks: 5.
RLS-policies: 4.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | — | nee |  |  |
| `user_id` | uuid | NO | — | — | nee |  | → `.` |
| `question_id` | uuid | NO | — | — | nee |  | → `.` |
| `lesson_id` | uuid | NO | — | — | nee |  | → `.` |
| `user_answer` | jsonb | NO | — | — | nee |  |  |
| `is_correct` | boolean | YES | — | — | nee |  |  |
| `points_earned` | integer | YES | 0 | — | nee |  |  |
| `time_spent_seconds` | integer | YES | — | — | nee |  |  |
| `attempt_number` | integer | YES | 1 | — | nee |  |  |
| `org_id` | uuid | YES | '00000000-0000-0000-0000-000000000001'::uuid | — | nee |  | → `.` |
| `answered_at` | timestamp with time zone | YES | now() | — | nee |  |  |

## `learning_catalog`
Rijen (approx): **1**. PK: `id`. FK's: 2. Unique: 4. Checks: 3.
RLS-policies: 4.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "ee9d1cd7-e0ec-4800-9b1e-9811e8b12bf2" | nee |  |  |
| `org_id` | uuid | NO | — | "00000000-0000-0000-0000-000000000001" | nee |  | → `.` |
| `library_item_id` | uuid | NO | — | "5db5eaa0-b1e2-48ad-902f-4dc97e196fc5" | nee |  | → `.` |
| `is_enabled` | boolean | YES | false | false | nee |  |  |
| `is_mandatory` | boolean | YES | false | true | nee |  |  |
| `custom_title` | text | YES | — | — | nee |  |  |
| `custom_intro` | text | YES | — | — | nee |  |  |
| `custom_notes` | text | YES | — | — | nee |  |  |
| `assigned_to_roles` | ARRAY | YES | — | — | nee |  |  |
| `priority` | integer | YES | 0 | 0 | nee |  |  |
| `custom_deadline` | date | YES | — | — | nee |  |  |
| `created_at` | timestamp with time zone | YES | now() | "2026-01-27T01:20:39.356041+00:00" | nee |  |  |
| `updated_at` | timestamp with time zone | YES | now() | "2026-03-14T12:30:22.882282+00:00" | nee |  |  |
| `custom_completion_message` | text | YES | — | — | nee |  |  |
| `completion_reward_points` | integer | YES | 0 | 0 | nee |  |  |

## `learning_library`
Rijen (approx): **4**. PK: `id`. FK's: 3. Unique: 0. Checks: 4.
RLS-policies: 5.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "5db5eaa0-b1e2-48ad-902f-4dc97e196fc5" | nee |  |  |
| `title` | text | NO | — | "RouteAI architecture viz" | nee |  |  |
| `description` | text | YES | — | "CL-1 module voor evaluatieve toepassinge…[truncated]" | nee |  |  |
| `content` | jsonb | YES | '{}'::jsonb | {"body": "This is a test document for RouteAI"} | nee |  |  |
| `version` | text | YES | '1.0'::text | "1.0" | nee |  |  |
| `created_by` | uuid | YES | — | — | nee |  | → `.` |
| `created_at` | timestamp with time zone | YES | now() | "2026-01-27T01:19:18.125547+00:00" | nee |  |  |
| `updated_at` | timestamp with time zone | YES | now() | "2026-01-27T01:20:12.481786+00:00" | nee |  |  |
| `org_id` | uuid | YES | — | — | nee |  | → `.` |
| `content_type` | learning_content_type enum(course|module|assessment|document|microlearning) | NO | — | "document" | nee |  |  |
| `difficulty_level` | learning_difficulty_level enum(basic|intermediate|advanced) | YES | 'basic'::learning_difficulty_level | "intermediate" | nee |  |  |
| `estimated_duration_minutes` | integer | YES | — | 5 | nee |  |  |
| `learning_objectives` | ARRAY | YES | '{}'::text[] | — | nee |  |  |
| `required_for_license` | ARRAY | YES | '{}'::text[] | ["yellow_license"] | nee |  |  |
| `status` | learning_status enum(draft|published|deprecated) | NO | 'draft'::learning_status | "published" | nee |  |  |
| `cluster_id` | text | YES | — | "CL-1" | nee |  |  |
| `archetype_codes` | ARRAY | YES | '{}'::text[] | ["O-01"] | nee |  |  |
| `is_activation_req` | boolean | YES | false | false | nee |  |  |
| `context_card` | text | YES | — | "Controleer elk AI-oordeel over een persoon individueel v… | nee |  |  |
| `lesson_id` | uuid | YES | — | "a1000000-0000-0000-0000-000000000001" | nee |  | → `.` |

## `learning_questions`
Rijen (approx): **2**. PK: `id`. FK's: 3. Unique: 0. Checks: 7.
RLS-policies: 4.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "a2be2c5f-42fa-4db7-8a86-e927818bc860" | nee |  |  |
| `lesson_id` | uuid | YES | — | "b40e2e63-8fb2-4868-9dcd-19a36a2e0f69" | nee |  | → `.` |
| `question_type` | question_type enum(multiple_choice|multiple_select|true_false|fill_in|essay) | NO | — | "true_false" | nee |  |  |
| `question_text` | text | NO | — | "Is het vandaag vrijdag? " | nee |  |  |
| `question_config` | jsonb | NO | '{}'::jsonb | {} | nee |  |  |
| `correct_answer` | jsonb | NO | '{}'::jsonb | {"selected": false} | nee |  |  |
| `points` | integer | YES | 1 | 1 | nee |  |  |
| `explanation` | text | YES | — | "Vandaag is het woensdag" | nee |  |  |
| `order_index` | integer | NO | 0 | 0 | nee |  |  |
| `is_required` | boolean | YES | true | true | nee |  |  |
| `org_id` | uuid | YES | '00000000-0000-0000-0000-000000000001'::uuid | "00000000-0000-0000-0000-000000000001" | nee |  | → `.` |
| `created_at` | timestamp with time zone | YES | now() | "2026-01-28T10:50:35.535517+00:00" | nee |  |  |
| `updated_at` | timestamp with time zone | YES | now() | "2026-01-28T10:50:35.535517+00:00" | nee |  |  |
| `created_by` | uuid | YES | — | "43b7bcca-4f80-4410-b7dc-0fbb9fa9da9f" | nee |  | → `.` |

## `legacy_survey_participation_view` _(EMPTY)_
Rijen (approx): **0**. PK: `—`. FK's: 0. Unique: 0. Checks: 0.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | YES | — | — | nee |  |  |
| `org_id` | uuid | YES | — | — | nee |  |  |
| `user_id` | uuid | YES | — | — | nee |  |  |
| `amnesty_acknowledged` | boolean | YES | — | — | nee |  |  |
| `submitted_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `assigned_tier` | text | YES | — | — | nee | ja |  |

## `lesson_attempts`
Rijen (approx): **46**. PK: `id`. FK's: 2. Unique: 3. Checks: 6.
RLS-policies: 4.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "3b6332a7-97dd-446f-a6eb-85585d509a9f" | nee |  |  |
| `user_id` | uuid | NO | — | "ae1bfece-ec41-4707-9e97-3873d81db90a" | nee |  |  |
| `lesson_id` | uuid | NO | — | "52b3c300-fa99-49b1-8b8a-7682b4c3d97c" | nee |  | → `.` |
| `attempt_number` | integer | NO | 1 | 3 | nee |  |  |
| `score` | integer | YES | — | 10 | nee |  |  |
| `max_score` | integer | YES | — | 20 | nee |  |  |
| `percentage` | integer | YES | — | 50 | nee |  |  |
| `passed` | boolean | YES | false | false | nee |  |  |
| `time_spent` | integer | YES | — | 37 | nee |  |  |
| `started_at` | timestamp with time zone | NO | now() | "2026-01-25T04:04:08.091+00:00" | nee |  |  |
| `completed_at` | timestamp with time zone | YES | — | "2026-01-27T01:01:30.588+00:00" | nee |  |  |
| `created_at` | timestamp with time zone | NO | now() | "2026-01-25T04:04:09.642586+00:00" | nee |  |  |
| `org_id` | uuid | YES | — | "00000000-0000-0000-0000-000000000001" | nee |  | → `.` |

## `lessons`
Rijen (approx): **15**. PK: `id`. FK's: 2. Unique: 0. Checks: 5.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "2a89ae21-5c9e-4943-9f0f-bf0f1397e8e2" | nee |  |  |
| `title` | text | NO | — | "Wat is AI?" | nee |  |  |
| `description` | text | YES | — | "Begrijp wat AI is en wat het niet is — d…[truncated]" | nee |  |  |
| `lesson_type` | text | NO | 'standalone'::text | "standalone" | nee |  |  |
| `blocks` | jsonb | NO | '[]'::jsonb | {"topics": [{"id": "migrated-62420b06-f4bb-4253-bcc3-3159… | nee |  |  |
| `estimated_duration` | integer | YES | — | 5 | nee |  |  |
| `passing_score` | integer | YES | — | 80 | nee |  |  |
| `is_published` | boolean | YES | false | true | nee |  |  |
| `created_by` | uuid | YES | — | "3b9e5d6c-56a2-4d6f-92b1-f4d494fd72cb" | nee |  | → `.` |
| `created_at` | timestamp with time zone | YES | now() | "2026-01-28T14:26:17.346213+00:00" | nee |  |  |
| `updated_at` | timestamp with time zone | YES | now() | "2026-03-14T13:47:03.52312+00:00" | nee |  |  |
| `org_id` | uuid | NO | — | "00000000-0000-0000-0000-000000000001" | nee |  | → `.` |

## `model_typekaart_updates` _(EMPTY)_
Rijen (approx): **0**. PK: `id`. FK's: 2. Unique: 0. Checks: 3.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | — | nee |  |  |
| `typekaart_id` | uuid | NO | — | — | nee |  | → `.` |
| `field_name` | text | NO | — | — | ja |  |  |
| `old_value` | text | YES | — | — | nee |  |  |
| `new_value` | text | YES | — | — | nee |  |  |
| `change_type` | text | YES | — | — | nee |  |  |
| `source` | text | YES | — | — | nee |  |  |
| `confidence` | text | YES | — | — | nee |  |  |
| `approved_by` | uuid | YES | — | — | nee |  | → `.` |
| `approved_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `status` | text | YES | 'pending'::text | — | nee |  |  |
| `created_at` | timestamp with time zone | YES | now() | — | nee |  |  |

## `model_typekaarten`
Rijen (approx): **19**. PK: `id`. FK's: 1. Unique: 1. Checks: 5.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "48b9a3be-db67-42d5-8f9c-6b3aaf086428" | nee |  |  |
| `canonical_id` | text | NO | — | "gpt-4o" | nee |  |  |
| `display_name` | text | NO | — | "GPT-4o" | ja |  |  |
| `provider` | text | NO | — | "OpenAI" | nee |  |  |
| `model_type` | text | NO | — | "language_model" | nee |  |  |
| `gpai_designated` | boolean | YES | false | true | nee |  |  |
| `systemic_risk` | boolean | YES | false | true | nee |  |  |
| `eu_license_status` | text | YES | 'unknown'::text | "open" | nee |  |  |
| `hosting_region` | text | YES | — | "VS" | nee |  |  |
| `data_storage_region` | text | YES | — | "VS" | nee |  |  |
| `trains_on_input` | boolean | YES | false | false | nee |  |  |
| `dpa_available` | boolean | YES | false | true | nee |  |  |
| `statutory_prohibitions` | jsonb | YES | '[]'::jsonb | — | nee |  |  |
| `contractual_restrictions` | jsonb | YES | '[]'::jsonb | [{"source": "OpenAI Usage Policies", "restriction": "Geen… | nee |  |  |
| `typekaart_version` | text | YES | '1.0'::text | "1.0" | nee |  |  |
| `last_verified_at` | timestamp with time zone | YES | — | "2026-03-01T00:00:00+00:00" | nee |  |  |
| `status` | text | YES | 'draft'::text | "published" | nee |  |  |
| `created_by` | uuid | YES | — | — | nee |  | → `.` |
| `created_at` | timestamp with time zone | YES | now() | "2026-03-26T12:22:48.107121+00:00" | nee |  |  |
| `updated_at` | timestamp with time zone | YES | now() | "2026-03-26T12:22:48.107121+00:00" | nee |  |  |

## `org_notifications` _(EMPTY)_
Rijen (approx): **0**. PK: `id`. FK's: 2. Unique: 0. Checks: 7.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | — | nee |  |  |
| `org_id` | uuid | NO | — | — | nee |  | → `.` |
| `source` | org_notification_source enum(scan_engine|model_library|system) | NO | — | — | nee |  |  |
| `severity` | org_notification_severity enum(info|warning|critical) | NO | 'info'::org_notification_severity | — | nee |  |  |
| `title` | text | NO | — | — | nee |  |  |
| `body` | text | YES | — | — | nee |  |  |
| `action_url` | text | YES | — | — | nee |  |  |
| `is_read` | boolean | NO | false | — | nee |  |  |
| `read_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `read_by` | uuid | YES | — | — | nee |  | → `.` |
| `created_at` | timestamp with time zone | NO | now() | — | nee |  |  |
| `expires_at` | timestamp with time zone | YES | — | — | nee |  |  |

## `org_tool_policy` _(EMPTY)_
Rijen (approx): **0**. PK: `org_id, tool_code`. FK's: 1. Unique: 0. Checks: 4.
RLS-policies: 5.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `org_id` | uuid | NO | — | — | nee |  | → `.` |
| `tool_code` | character varying | NO | — | — | nee | ja |  |
| `org_policy_status_code` | character varying | NO | 'newly_discovered'::character varying | — | nee | ja |  |
| `eu_ai_act_flag_code` | character varying | NO | 'none'::character varying | — | nee |  |  |
| `first_seen_at` | timestamp with time zone | YES | now() | — | nee |  |  |
| `decided_by` | character varying | YES | — | — | nee |  |  |
| `decided_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `notes` | text | YES | — | — | nee |  |  |

## `org_tools_catalog`
Rijen (approx): **12**. PK: `id`. FK's: 2. Unique: 2. Checks: 4.
RLS-policies: 4.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "791dd162-66d3-40c4-8c0e-338e0c32dc82" | nee |  |  |
| `org_id` | uuid | NO | — | "00000000-0000-0000-0000-000000000001" | nee |  | → `.` |
| `tool_name` | text | NO | — | "ChatGPT" | nee | ja |  |
| `status` | text | NO | 'known_unconfigured'::text | "known_unconfigured" | nee |  |  |
| `typekaart_id` | uuid | YES | — | — | nee |  |  |
| `added_by` | uuid | YES | — | "e46ede2c-3bde-4138-aaf1-3fbc4ca7903f" | nee |  |  |
| `added_at` | timestamp with time zone | YES | now() | "2026-03-23T11:54:19.14+00:00" | nee |  |  |
| `notes` | text | YES | — | — | nee |  |  |
| `override_data_storage` | text | YES | — | — | nee | ja |  |
| `override_trains_on_input` | boolean | YES | — | — | nee | ja |  |
| `override_acknowledged_by` | uuid | YES | — | — | nee | ja | → `.` |
| `override_acknowledged_at` | timestamp with time zone | YES | — | — | nee | ja |  |
| `first_seen_at` | timestamp with time zone | YES | now() | "2026-04-27T10:31:58.092501+00:00" | nee |  |  |

## `organizations`
Rijen (approx): **3**. PK: `id`. FK's: 0. Unique: 2. Checks: 8.
RLS-policies: 6.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "00000000-0000-0000-0000-000000000001" | nee |  |  |
| `name` | text | NO | — | "Digidactics" | ja |  |  |
| `slug` | text | YES | — | "digidactics" | nee |  |  |
| `sector` | text | YES | — | "EdTech" | nee |  |  |
| `country` | text | YES | 'NL'::text | "NL" | nee |  |  |
| `settings` | jsonb | YES | '{}'::jsonb | {} | nee |  |  |
| `created_at` | timestamp with time zone | YES | now() | "2026-01-25T05:36:33.314782+00:00" | nee |  |  |
| `updated_at` | timestamp with time zone | YES | now() | "2026-01-25T05:36:33.314782+00:00" | nee |  |  |
| `status` | text | YES | 'active'::text | "active" | nee |  |  |
| `subscription_type` | text | YES | 'basic'::text | "basic" | nee |  |  |
| `subscription_start_date` | date | YES | CURRENT_DATE | "2026-01-26" | nee |  |  |
| `subscription_end_date` | date | YES | — | "2027-03-23" | nee |  |  |
| `contact_person` | text | YES | — | "Jan" | nee |  |  |
| `contact_email` | text | YES | — | "hash:d804ca95e631" | ja |  |  |
| `street_address` | text | YES | — | — | ja |  |  |
| `postal_code` | text | YES | — | — | nee |  |  |
| `city` | text | YES | — | — | nee |  |  |
| `contact_phone` | text | YES | — | — | ja |  |  |
| `bank_account` | text | YES | — | — | ja |  |  |
| `bank_name` | text | YES | — | — | ja |  |  |
| `plan_type` | text | NO | 'routeai'::text | "both" | nee |  |  |
| `scoreboard_slug` | text | YES | — | — | nee |  |  |
| `scoreboard_enabled` | boolean | NO | false | false | nee |  |  |
| `scoreboard_config` | jsonb | NO | '{}'::jsonb | {} | nee |  |  |

## `passport_identity` _(EMPTY)_
Rijen (approx): **0**. PK: `id`. FK's: 1. Unique: 1. Checks: 2.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | — | nee |  |  |
| `org_id` | uuid | NO | — | — | nee |  | → `.` |
| `org_description` | text | YES | — | — | nee |  |  |
| `dpo_name` | text | YES | — | — | ja |  |  |
| `dpo_email` | text | YES | — | — | ja |  |  |
| `ai_policy_url` | text | YES | — | — | nee |  |  |
| `governance_scope` | text | YES | — | — | nee |  |  |
| `review_cycle` | text | YES | 'Jaarlijks'::text | — | nee |  |  |
| `last_reviewed_at` | date | YES | — | — | nee |  |  |
| `created_at` | timestamp with time zone | YES | now() | — | nee |  |  |
| `updated_at` | timestamp with time zone | YES | now() | — | nee |  |  |

## `profiles`
Rijen (approx): **10**. PK: `id`. FK's: 2. Unique: 0. Checks: 5.
RLS-policies: 7.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | — | "b9760186-050a-47e7-a480-197ba0dc5c5a" | nee |  | → `.` |
| `email` | text | YES | — | "hash:d2e5f78f7c76" | ja |  |  |
| `full_name` | text | YES | — | "[REDACTED]" | ja |  |  |
| `department` | text | YES | — | — | nee |  |  |
| `has_ai_rijbewijs` | boolean | YES | false | false | nee |  |  |
| `ai_rijbewijs_obtained_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `created_at` | timestamp with time zone | YES | now() | "2026-01-20T04:36:41.49601+00:00" | nee |  |  |
| `updated_at` | timestamp with time zone | YES | now() | "2026-01-25T05:36:33.314782+00:00" | nee |  |  |
| `org_id` | uuid | NO | '00000000-0000-0000-0000-000000000001'::uuid | "00000000-0000-0000-0000-000000000001" | nee |  | → `.` |
| `import_batch_id` | text | YES | — | — | nee |  |  |
| `routeai_invited_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `is_active` | boolean | NO | true | true | nee |  |  |
| `has_set_password` | boolean | NO | false | false | nee |  |  |
| `banner_password_dismissed` | boolean | NO | false | false | nee |  |  |

## `ref_account_type` _(SEED)_
Rijen (approx): **4**. PK: `code`. FK's: 0. Unique: 0. Checks: 2.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `code` | character varying | NO | — | "zakelijke_licentie" | nee |  |  |
| `label` | character varying | NO | — | "Zakelijke licentie" | nee |  |  |

## `ref_ai_frequency` _(SEED)_
Rijen (approx): **4**. PK: `code`. FK's: 0. Unique: 0. Checks: 3.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `code` | character varying | NO | — | "dagelijks" | nee |  |  |
| `label` | character varying | NO | — | "Dagelijks" | nee |  |  |
| `sort_order` | integer | NO | — | 1 | nee |  |  |

## `ref_catalog_beheerstatus` _(SEED)_
Rijen (approx): **5**. PK: `code`. FK's: 0. Unique: 0. Checks: 2.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `code` | character varying | NO | — | "approved" | nee |  |  |
| `label` | character varying | NO | — | "Goedgekeurd" | nee |  |  |

## `ref_context` _(SEED)_
Rijen (approx): **11**. PK: `code`. FK's: 0. Unique: 0. Checks: 3.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `code` | character varying | NO | — | "intern_gebruik" | nee |  |  |
| `label` | character varying | NO | — | "Intern gebruik" | nee |  |  |
| `context_multiplier` | numeric | NO | 1.0 | 1.0 | nee |  |  |

## `ref_data_type` _(SEED)_
Rijen (approx): **13**. PK: `code`. FK's: 0. Unique: 0. Checks: 3.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `code` | character varying | NO | — | "publiek" | nee |  |  |
| `label` | character varying | NO | — | "Publieke informatie" | nee |  |  |
| `risk_level` | character varying | NO | 'low'::character varying | "low" | nee |  |  |

## `ref_department` _(SEED)_
Rijen (approx): **8**. PK: `code`. FK's: 0. Unique: 0. Checks: 3.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `code` | character varying | NO | — | "it_data_development" | nee |  |  |
| `label` | character varying | NO | — | "IT, Data & Development" | nee |  |  |
| `sort_order` | integer | NO | — | 1 | nee |  |  |

## `ref_eu_ai_act_flag` _(SEED)_
Rijen (approx): **3**. PK: `code`. FK's: 0. Unique: 0. Checks: 2.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `code` | character varying | NO | — | "none" | nee |  |  |
| `label` | character varying | NO | — | "Geen indicatie" | nee |  |  |

## `ref_governance_flag` _(SEED)_
Rijen (approx): **8**. PK: `code`. FK's: 0. Unique: 0. Checks: 2.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `code` | character varying | NO | — | "actiecapaciteit" | nee |  |  |
| `label` | character varying | NO | — | "Actiecapaciteit" | nee |  |  |

## `ref_no_ai_reason` _(SEED)_
Rijen (approx): **3**. PK: `code`. FK's: 0. Unique: 0. Checks: 2.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `code` | character varying | NO | — | "geen_behoefte" | nee |  |  |
| `label` | character varying | NO | — | "Geen behoefte aan AI-tools" | nee |  |  |

## `ref_org_policy_status` _(SEED)_
Rijen (approx): **5**. PK: `code`. FK's: 0. Unique: 0. Checks: 3.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `code` | character varying | NO | — | "approved" | nee |  |  |
| `label` | character varying | NO | — | "Toegestaan" | nee |  |  |
| `shadow_base` | numeric | NO | — | 0.0 | nee |  |  |

## `ref_review_trigger` _(SEED)_
Rijen (approx): **8**. PK: `code`. FK's: 0. Unique: 0. Checks: 2.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `code` | character varying | NO | — | "prohibited_tool" | nee |  |  |
| `label` | character varying | NO | — | "Tool niet toegestaan" | nee |  |  |
| `description` | text | YES | — | "shadow_base = 80" | nee |  |  |

## `ref_use_case` _(SEED)_
Rijen (approx): **17**. PK: `code`. FK's: 0. Unique: 0. Checks: 3.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `code` | character varying | NO | — | "teksten_schrijven" | nee |  |  |
| `label` | character varying | NO | — | "Teksten schrijven of bewerken" | nee |  |  |
| `use_case_base` | numeric | NO | 20 | 10.0 | nee |  |  |

## `rijbewijs_records` _(EMPTY)_
Rijen (approx): **0**. PK: `id`. FK's: 3. Unique: 1. Checks: 5.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | — | nee |  |  |
| `user_id` | uuid | NO | — | — | nee |  | → `.` |
| `org_id` | uuid | YES | — | — | nee |  | → `.` |
| `lesson_attempt_id` | uuid | YES | — | — | nee |  | → `.` |
| `exam_version` | text | NO | '1.0'::text | — | nee |  |  |
| `earned_at` | timestamp with time zone | YES | now() | — | nee |  |  |
| `status` | text | NO | 'active'::text | — | nee |  |  |

## `risk_result`
Rijen (approx): **8**. PK: `survey_run_id`. FK's: 1. Unique: 0. Checks: 8.
RLS-policies: 4.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `survey_run_id` | uuid | NO | — | "f76f9a51-77f1-4ce0-baf6-18bae490d20f" | nee | ja | → `.` |
| `person_score_raw` | numeric | YES | — | 49.95 | nee |  |  |
| `person_score` | numeric | NO | 0 | 49.95 | nee |  |  |
| `assigned_tier` | character varying | NO | 'green'::character varying | "priority_review" | nee | ja |  |
| `dpo_review_required` | boolean | NO | false | true | nee | ja |  |
| `toxic_combination` | boolean | NO | false | false | nee |  |  |
| `shadow_tool_count` | integer | NO | 0 | 7 | nee |  |  |
| `review_trigger_codes` | ARRAY | YES | — | ["extension_unmanaged", "priority_threshold"] | nee | ja |  |
| `highest_risk_tool` | character varying | YES | — | "5411a2b0-ee9d-4d75-a09f-5ed25b79e05f" | nee |  |  |
| `highest_risk_use_case` | character varying | YES | — | — | nee |  |  |
| `highest_risk_context` | character varying | YES | — | — | nee |  |  |
| `highest_priority_score` | numeric | YES | — | 49.95 | nee | ja |  |
| `hard_override` | boolean | NO | false | false | nee | ja |  |
| `override_reason` | character varying | YES | — | — | nee | ja |  |
| `created_at` | timestamp with time zone | NO | now() | "2026-04-30T01:05:47.127453+00:00" | nee |  |  |

## `risk_result_tool`
Rijen (approx): **19**. PK: `survey_tool_id, survey_run_id`. FK's: 3. Unique: 0. Checks: 20.
RLS-policies: 4.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `survey_run_id` | uuid | NO | — | "f76f9a51-77f1-4ce0-baf6-18bae490d20f" | nee | ja | → `.` |
| `survey_tool_id` | uuid | NO | — | "5454da18-adf1-40ba-a229-8652bacfe410" | nee | ja | → `.` |
| `shadow_base` | numeric | NO | 0 | 20.0 | nee |  |  |
| `shadow_score` | numeric | NO | 0 | 20.0 | nee | ja |  |
| `use_case_base` | numeric | NO | 0 | 20.0 | nee |  |  |
| `context_multiplier` | numeric | NO | 1.0 | 1.0 | nee |  |  |
| `account_multiplier` | numeric | NO | 1.0 | 1.0 | nee |  |  |
| `data_boost` | numeric | NO | 0 | 30.0 | nee |  |  |
| `frequency_boost` | numeric | NO | 0 | 15.0 | nee |  |  |
| `automation_boost` | numeric | NO | 0 | 0.0 | nee |  |  |
| `extension_boost` | numeric | NO | 0 | 10.0 | nee |  |  |
| `agentic_boost` | numeric | NO | 0 | 0.0 | nee | ja |  |
| `raw_exposure_score` | numeric | NO | 0 | 75.0 | nee | ja |  |
| `exposure_score` | numeric | NO | 0 | 75.0 | nee | ja |  |
| `toxic_boost` | numeric | NO | 0 | 0.0 | nee | ja |  |
| `review_boost` | numeric | NO | 0 | 0.0 | nee | ja |  |
| `priority_score_raw` | numeric | NO | 0 | 42.75 | nee | ja |  |
| `priority_score` | numeric | NO | 0 | 42.75 | nee | ja |  |
| `dpo_review_required` | boolean | NO | false | true | nee | ja |  |
| `review_trigger_codes` | ARRAY | YES | — | ["extension_unmanaged", "priority_threshold"] | nee | ja |  |
| `scoring_config_id` | uuid | YES | — | — | nee |  | → `.` |
| `priority_review_threshold_used` | numeric | YES | — | 40.0 | nee |  |  |
| `toxic_shadow_threshold_used` | numeric | YES | — | 50.0 | nee |  |  |
| `toxic_exposure_threshold_used` | numeric | YES | — | 50.0 | nee |  |  |
| `hard_override` | boolean | NO | false | false | nee | ja |  |
| `override_reason` | character varying | YES | — | — | nee | ja |  |

## `scan_scoring_config` _(EMPTY)_
Rijen (approx): **0**. PK: `id`. FK's: 2. Unique: 0. Checks: 10.
RLS-policies: 4.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | — | nee |  |  |
| `org_id` | uuid | NO | — | — | nee |  | → `.` |
| `wave_id` | uuid | YES | — | — | nee | ja | → `.` |
| `scoring_version` | character varying | NO | 'V8.1'::character varying | — | nee |  |  |
| `priority_review_threshold` | numeric | NO | 40 | — | nee |  |  |
| `toxic_shadow_threshold` | numeric | NO | 50 | — | nee |  |  |
| `toxic_exposure_threshold` | numeric | NO | 50 | — | nee |  |  |
| `dashboard_min_cell_size` | integer | NO | 5 | — | nee |  |  |
| `public_scoreboard_enabled` | boolean | NO | false | — | nee |  |  |
| `notes` | text | YES | — | — | nee |  |  |
| `created_by` | character varying | YES | — | — | nee |  |  |
| `created_at` | timestamp with time zone | NO | now() | — | nee |  |  |
| `active_from` | timestamp with time zone | NO | now() | — | nee |  |  |
| `active_until` | timestamp with time zone | YES | — | — | nee |  |  |

## `shadow_survey_runs` _(LEGACY)_
Rijen (approx): **1**. PK: `id`. FK's: 2. Unique: 0. Checks: 4.
RLS-policies: 6.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "e5ea2544-0a5e-417e-9324-a51400ee7b99" | nee |  |  |
| `org_id` | uuid | NO | — | "34f89abf-ba18-4e7c-83aa-d4bc7e845c00" | nee |  | → `.` |
| `user_id` | uuid | YES | — | "91e483b7-05bb-497e-bbe2-3dd4518bfa57" | nee |  | → `.` |
| `survey_version` | text | NO | '1.0'::text | "1.0" | nee |  |  |
| `submitted_at` | timestamp with time zone | YES | now() | "2026-04-01T12:34:49.963288+00:00" | nee |  |  |
| `ai_maturity_score` | integer | YES | — | — | nee |  |  |
| `department` | text | YES | — | — | nee |  |  |
| `role_description` | text | YES | — | — | nee |  |  |
| `amnesty_acknowledged` | boolean | YES | false | true | nee |  |  |
| `assigned_tier` | text | YES | — | "advanced" | nee | ja |  |
| `data_classification` | text | YES | — | "sensitive" | nee |  |  |
| `primary_use_case` | text | YES | — | "data_analysis" | nee |  |  |
| `primary_concern` | text | YES | — | "accuracy" | nee |  |  |
| `risk_score` | integer | YES | — | 62 | nee |  |  |
| `dpo_review_required` | boolean | YES | false | true | nee | ja |  |
| `review_notes` | text | YES | — | — | nee |  |  |
| `survey_completed_at` | timestamp with time zone | YES | — | "2026-04-01T12:55:18.683+00:00" | nee |  |  |
| `extra_data` | jsonb | YES | '{}'::jsonb | {"context": {"tasks": ["writing", "research", "design"], … | nee |  |  |
| `scoreboard_name_visible` | boolean | YES | false | false | ja |  |  |

## `survey_data_type`
Rijen (approx): **14**. PK: `data_type_code, survey_run_id`. FK's: 1. Unique: 0. Checks: 2.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `survey_run_id` | uuid | NO | — | "5f4d87b9-761e-41af-92b3-ea557e708586" | nee | ja | → `.` |
| `data_type_code` | character varying | NO | — | "publiek" | nee | ja |  |

## `survey_invite` _(EMPTY)_
Rijen (approx): **0**. PK: `id`. FK's: 2. Unique: 2. Checks: 5.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | — | nee |  |  |
| `wave_id` | uuid | YES | — | — | nee | ja | → `.` |
| `org_id` | uuid | NO | — | — | nee |  | → `.` |
| `email` | character varying | NO | — | — | ja |  |  |
| `display_name` | character varying | YES | — | — | ja |  |  |
| `department_label` | character varying | YES | — | — | nee |  |  |
| `invited_at` | timestamp with time zone | NO | now() | — | nee |  |  |
| `reminder_sent_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `participation_status` | character varying | NO | 'invited'::character varying | — | nee |  |  |

## `survey_motivation`
Rijen (approx): **10**. PK: `survey_run_id, motivation_code`. FK's: 1. Unique: 0. Checks: 2.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `survey_run_id` | uuid | NO | — | "5f4d87b9-761e-41af-92b3-ea557e708586" | nee | ja | → `.` |
| `motivation_code` | character varying | NO | — | "tijdswinst" | nee |  |  |
| `motivation_other_text` | character varying | YES | — | "Bijblijven met de tijd" | nee |  |  |

## `survey_participation` _(EMPTY)_
Rijen (approx): **0**. PK: `invite_id`. FK's: 2. Unique: 0. Checks: 1.
RLS-policies: 3.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `invite_id` | uuid | NO | — | — | nee |  | → `.` |
| `survey_run_id` | uuid | YES | — | — | nee | ja | → `.` |
| `opened_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `completed_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `last_reminder_at` | timestamp with time zone | YES | — | — | nee |  |  |

## `survey_profile`
Rijen (approx): **11**. PK: `survey_run_id`. FK's: 1. Unique: 0. Checks: 1.
RLS-policies: 3.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `survey_run_id` | uuid | NO | — | "5f4d87b9-761e-41af-92b3-ea557e708586" | nee | ja | → `.` |
| `department_code` | character varying | YES | — | "it_data_development" | nee | ja |  |
| `department_other_text` | character varying | YES | — | "Supply Chain" | nee | ja |  |
| `ai_frequency_code` | character varying | YES | — | "wekelijks" | nee | ja |  |
| `no_ai_reason_code` | character varying | YES | — | "geen_behoefte" | nee |  |  |
| `processing_output_code` | character varying | YES | — | "controle_handmatig" | nee |  |  |
| `ai_policy_awareness_code` | character varying | YES | — | "ja_goed" | nee |  |  |
| `ai_skill_level_code` | character varying | YES | — | "gemiddeld" | nee |  |  |
| `top_concern_other_text` | character varying | YES | — | — | nee |  |  |
| `future_usecases_text` | text | YES | — | "Wat gebeurd er met mijn antwoord hier??" | nee |  |  |
| `browser_extension_usage_code` | character varying | YES | — | "ja_bewust" | nee | ja |  |
| `extension_awareness_code` | character varying | YES | — | — | nee |  |  |
| `automation_usage_code` | character varying | YES | — | "agents_reeks_taken" | nee | ja |  |
| `automation_awareness_code` | character varying | YES | — | — | nee |  |  |
| `data_awareness_code` | character varying | YES | — | "gedeeltelijk" | nee |  |  |
| `anonymization_behavior_code` | character varying | YES | — | "soms" | nee |  |  |

## `survey_run`
Rijen (approx): **11**. PK: `id`. FK's: 2. Unique: 0. Checks: 4.
RLS-policies: 4.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "5f4d87b9-761e-41af-92b3-ea557e708586" | nee |  |  |
| `wave_id` | uuid | YES | — | — | nee | ja | → `.` |
| `org_id` | uuid | NO | — | "34f89abf-ba18-4e7c-83aa-d4bc7e845c00" | nee |  | → `.` |
| `started_at` | timestamp with time zone | NO | now() | "2026-04-29T01:41:33.02976+00:00" | nee |  |  |
| `completed_at` | timestamp with time zone | YES | — | "2026-04-29T01:50:01.055+00:00" | nee |  |  |
| `locale` | character varying | YES | 'nl'::character varying | "nl" | nee |  |  |
| `source` | character varying | YES | 'web'::character varying | "web" | nee |  |  |
| `consent_ambassador` | boolean | YES | — | true | nee |  |  |
| `ambassador_email` | character varying | YES | — | "hash:977e2aa85f43" | ja |  |  |

## `survey_support_need`
Rijen (approx): **8**. PK: `support_need_code, survey_run_id`. FK's: 1. Unique: 0. Checks: 2.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `survey_run_id` | uuid | NO | — | "5f4d87b9-761e-41af-92b3-ea557e708586" | nee | ja | → `.` |
| `support_need_code` | character varying | NO | — | "duidelijke_spelregels" | nee |  |  |

## `survey_tool`
Rijen (approx): **26**. PK: `id`. FK's: 1. Unique: 0. Checks: 4.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "049b6d72-1cc9-4751-8fa3-300c061e1b8a" | nee |  |  |
| `survey_run_id` | uuid | NO | — | "5f4d87b9-761e-41af-92b3-ea557e708586" | nee | ja | → `.` |
| `tool_code` | character varying | YES | — | "99d83f5f-d80f-4a7e-9f77-86297dafaf1e" | nee | ja |  |
| `tool_name` | character varying | NO | — | "ChatGPT" | nee | ja |  |
| `is_custom` | boolean | NO | false | false | nee |  |  |
| `catalog_beheerstatus_code` | character varying | YES | — | — | nee |  |  |
| `org_policy_status_code_snapshot` | character varying | YES | — | "newly_discovered" | nee | ja |  |
| `eu_ai_act_flag_code_snapshot` | character varying | YES | — | "none" | nee |  |  |

## `survey_tool_account`
Rijen (approx): **19**. PK: `survey_tool_id`. FK's: 1. Unique: 0. Checks: 2.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `survey_tool_id` | uuid | NO | — | "049b6d72-1cc9-4751-8fa3-300c061e1b8a" | nee | ja | → `.` |
| `account_type_code` | character varying | NO | — | "prive_betaald" | nee | ja |  |

## `survey_tool_preference_reason`
Rijen (approx): **6**. PK: `survey_run_id, preference_reason_code`. FK's: 1. Unique: 0. Checks: 2.
RLS-policies: 3.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `survey_run_id` | uuid | NO | — | "5f4d87b9-761e-41af-92b3-ea557e708586" | nee | ja | → `.` |
| `preference_reason_code` | character varying | NO | — | "snelheid" | nee |  |  |

## `survey_tool_use_case`
Rijen (approx): **34**. PK: `id`. FK's: 2. Unique: 0. Checks: 3.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "16b1d4e2-d51c-4b0a-bd27-cf450f68b79d" | nee |  |  |
| `survey_tool_id` | uuid | NO | — | "049b6d72-1cc9-4751-8fa3-300c061e1b8a" | nee | ja | → `.` |
| `use_case_code` | character varying | NO | — | "brainstormen" | nee | ja | → `.` |

## `survey_tool_use_case_context`
Rijen (approx): **2**. PK: `survey_tool_use_case_id, context_code`. FK's: 2. Unique: 0. Checks: 2.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `survey_tool_use_case_id` | uuid | NO | — | "358d4463-d665-4970-8ab6-177f96b4055d" | nee |  | → `.` |
| `context_code` | character varying | NO | — | "intern_gebruik" | nee | ja | → `.` |

## `survey_tool_use_case_flag` _(EMPTY)_
Rijen (approx): **0**. PK: `survey_tool_use_case_id, governance_flag_code`. FK's: 2. Unique: 0. Checks: 2.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `survey_tool_use_case_id` | uuid | NO | — | — | nee |  | → `.` |
| `governance_flag_code` | character varying | NO | — | — | nee |  | → `.` |

## `survey_top_concern`
Rijen (approx): **4**. PK: `top_concern_code, survey_run_id`. FK's: 1. Unique: 0. Checks: 2.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `survey_run_id` | uuid | NO | — | "5f4d87b9-761e-41af-92b3-ea557e708586" | nee | ja | → `.` |
| `top_concern_code` | character varying | NO | — | "kosten" | nee |  |  |

## `survey_wave` _(EMPTY)_
Rijen (approx): **0**. PK: `id`. FK's: 1. Unique: 0. Checks: 6.
RLS-policies: 1.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | — | nee |  |  |
| `org_id` | uuid | NO | — | — | nee |  | → `.` |
| `wave_name` | character varying | NO | — | — | ja |  |  |
| `wave_type` | character varying | NO | 'baseline'::character varying | — | nee |  |  |
| `survey_version` | character varying | YES | — | — | nee |  |  |
| `scoring_version` | character varying | YES | 'V8.1'::character varying | — | nee |  |  |
| `policy_snapshot_date` | date | YES | — | — | nee |  |  |
| `opens_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `closes_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `status` | character varying | NO | 'draft'::character varying | — | nee |  |  |
| `notes` | text | YES | — | — | nee |  |  |
| `created_at` | timestamp with time zone | NO | now() | — | nee |  |  |

## `tool_catalog_discovery`
Rijen (approx): **1**. PK: `id`. FK's: 3. Unique: 0. Checks: 6.
RLS-policies: 4.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "75a440b6-880f-45e2-b025-15f7a287a331" | nee |  |  |
| `org_id` | uuid | NO | — | "34f89abf-ba18-4e7c-83aa-d4bc7e845c00" | nee |  | → `.` |
| `survey_run_id` | uuid | YES | — | "f76f9a51-77f1-4ce0-baf6-18bae490d20f" | nee | ja | → `.` |
| `survey_tool_id` | uuid | YES | — | "f87789ab-a03b-4a4f-b1d1-7888ac9ea2fb" | nee | ja | → `.` |
| `raw_tool_name` | character varying | NO | — | "Claude Code" | ja |  |  |
| `normalized_tool_name` | character varying | YES | — | — | ja |  |  |
| `discovery_source` | character varying | NO | 'survey'::character varying | "survey" | nee |  |  |
| `review_status` | character varying | NO | 'pending'::character varying | "pending" | nee |  |  |
| `promoted_tool_code` | character varying | YES | — | — | nee |  |  |
| `created_at` | timestamp with time zone | NO | now() | "2026-04-29T04:48:48.214893+00:00" | nee |  |  |
| `reviewed_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `reviewed_by` | character varying | YES | — | — | nee |  |  |
| `notes` | text | YES | — | — | nee |  |  |

## `tool_discoveries` _(LEGACY)_
Rijen (approx): **20**. PK: `id`. FK's: 5. Unique: 0. Checks: 6.
RLS-policies: 5.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "58ba096e-7d74-42d8-809b-d4d91304abe4" | nee |  |  |
| `org_id` | uuid | NO | — | "34f89abf-ba18-4e7c-83aa-d4bc7e845c00" | nee |  | → `.` |
| `survey_run_id` | uuid | YES | — | "e5ea2544-0a5e-417e-9324-a51400ee7b99" | nee | ja | → `.` |
| `submitted_by` | uuid | YES | — | "91e483b7-05bb-497e-bbe2-3dd4518bfa57" | nee |  | → `.` |
| `tool_name` | text | NO | — | "Salesforce Einstein" | nee | ja |  |
| `vendor` | text | YES | — | — | nee |  |  |
| `use_case` | text | YES | — | "data_analysis, research" | nee |  |  |
| `use_frequency` | text | YES | — | "weekly" | nee |  |  |
| `data_types_used` | ARRAY | YES | — | ["client"] | nee |  |  |
| `department` | text | YES | — | — | nee |  |  |
| `submitted_at` | timestamp with time zone | YES | now() | "2026-04-01T12:36:47.905077+00:00" | nee |  |  |
| `review_status` | text | NO | 'pending'::text | "pending" | nee |  |  |
| `reviewed_by` | uuid | YES | — | — | nee |  | → `.` |
| `reviewed_at` | timestamp with time zone | YES | — | — | nee |  |  |
| `review_notes` | text | YES | — | — | nee |  |  |
| `resulting_tool_id` | uuid | YES | — | — | nee |  | → `.` |
| `application_risk_class` | text | YES | — | — | nee |  |  |
| `eu_ai_act_context` | text | YES | — | — | nee |  |  |

## `tools_library`
Rijen (approx): **55**. PK: `id`. FK's: 2. Unique: 0. Checks: 5.
RLS-policies: 4.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "99d83f5f-d80f-4a7e-9f77-86297dafaf1e" | nee |  |  |
| `name` | text | NO | — | "ChatGPT" | ja |  |  |
| `vendor` | text | NO | — | "OpenAI" | nee |  |  |
| `description` | text | YES | — | "Veelzijdige AI-assistent voor tekst, ana…[truncated]" | nee |  |  |
| `hosting_location` | text | YES | — | "US" | nee |  |  |
| `data_residency` | text | YES | — | "US" | nee |  |  |
| `gpai_status` | boolean | YES | false | true | nee |  |  |
| `model_type` | text | YES | — | "GPT-4" | nee |  |  |
| `capabilities` | ARRAY | YES | '{}'::text[] | ["text_generation", "analysis", "code", "brainstorm"] | nee |  |  |
| `vendor_privacy_policy_url` | text | YES | — | — | nee |  |  |
| `vendor_terms_url` | text | YES | — | — | nee |  |  |
| `vendor_website_url` | text | YES | — | — | nee |  |  |
| `api_available` | boolean | YES | false | false | nee |  |  |
| `contract_required` | boolean | YES | false | false | nee |  |  |
| `category` | text | YES | — | "llm" | nee |  |  |
| `version` | text | YES | '1.0'::text | "1.0" | nee |  |  |
| `status` | text | YES | 'draft'::text | "published" | nee |  |  |
| `org_id` | uuid | YES | — | — | nee |  | → `.` |
| `created_by` | uuid | YES | — | — | nee |  | → `.` |
| `created_at` | timestamp with time zone | YES | now() | "2026-01-26T07:03:02.199163+00:00" | nee |  |  |
| `updated_at` | timestamp with time zone | YES | now() | "2026-01-26T07:03:02.199163+00:00" | nee |  |  |

## `user_badges`
Rijen (approx): **2**. PK: `id`. FK's: 2. Unique: 2. Checks: 5.
RLS-policies: 3.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "6a4ee36a-f5e5-4bff-bbce-ec7b27bbb2ce" | nee |  |  |
| `user_id` | uuid | NO | — | "91e483b7-05bb-497e-bbe2-3dd4518bfa57" | nee |  | → `.` |
| `org_id` | uuid | NO | — | "34f89abf-ba18-4e7c-83aa-d4bc7e845c00" | nee |  | → `.` |
| `badge_type` | text | NO | — | "ai_scout" | nee |  |  |
| `earned_at` | timestamp with time zone | NO | now() | "2026-04-01T12:48:10.024929+00:00" | nee |  |  |

## `user_course_completions`
Rijen (approx): **1**. PK: `id`. FK's: 3. Unique: 4. Checks: 3.
RLS-policies: 3.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "111fe541-4e07-4d7f-a66e-e4ab08fd8606" | nee |  |  |
| `user_id` | uuid | NO | — | "3b9e5d6c-56a2-4d6f-92b1-f4d494fd72cb" | nee |  | → `.` |
| `course_id` | uuid | NO | — | "c1dfe82a-490b-4097-977a-4072838f5bb1" | nee |  | → `.` |
| `final_score` | integer | YES | — | 83 | nee |  |  |
| `capability_unlocked` | text | YES | — | — | nee |  |  |
| `completed_at` | timestamp with time zone | YES | now() | "2026-03-14T06:53:56.233+00:00" | nee |  |  |
| `org_id` | uuid | YES | — | — | nee |  | → `.` |

## `user_course_progress`
Rijen (approx): **1**. PK: `id`. FK's: 3. Unique: 4. Checks: 4.
RLS-policies: 4.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "37ef9624-d81b-469f-9277-0992bf7ea764" | nee |  |  |
| `user_id` | uuid | NO | — | "3b9e5d6c-56a2-4d6f-92b1-f4d494fd72cb" | nee |  | → `.` |
| `course_id` | uuid | NO | — | "c1dfe82a-490b-4097-977a-4072838f5bb1" | nee |  | → `.` |
| `lessons_completed` | integer | YES | 0 | 3 | nee |  |  |
| `lessons_required` | integer | NO | — | 3 | nee |  |  |
| `progress_percentage` | integer | YES | 0 | 100 | nee |  |  |
| `started_at` | timestamp with time zone | YES | now() | "2026-03-14T04:50:32.337615+00:00" | nee |  |  |
| `updated_at` | timestamp with time zone | YES | now() | "2026-03-29T04:39:07.913388+00:00" | nee |  |  |
| `org_id` | uuid | YES | — | — | nee |  | → `.` |

## `user_lesson_completions`
Rijen (approx): **3**. PK: `id`. FK's: 3. Unique: 4. Checks: 3.
RLS-policies: 4.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "74870050-7f1e-4ed7-a0fb-35be6285e75f" | nee |  |  |
| `user_id` | uuid | NO | — | "3b9e5d6c-56a2-4d6f-92b1-f4d494fd72cb" | nee |  | → `.` |
| `lesson_id` | uuid | NO | — | "52b3c300-fa99-49b1-8b8a-7682b4c3d97c" | nee |  | → `.` |
| `score` | integer | YES | — | 50 | nee |  |  |
| `time_spent` | integer | YES | — | 2138 | nee |  |  |
| `completed_at` | timestamp with time zone | YES | now() | "2026-01-28T13:39:45.595+00:00" | nee |  |  |
| `org_id` | uuid | YES | — | — | nee |  | → `.` |

## `user_lesson_progress`
Rijen (approx): **8**. PK: `id`. FK's: 3. Unique: 2. Checks: 3.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "17b38460-9023-453a-be69-67f1063415ce" | nee |  |  |
| `user_id` | uuid | NO | — | "3b9e5d6c-56a2-4d6f-92b1-f4d494fd72cb" | nee |  | → `.` |
| `lesson_id` | uuid | NO | — | "2d5c558b-6376-40b9-8bb6-bbfc6b9de058" | nee |  | → `.` |
| `current_block_index` | integer | YES | 0 | 1 | nee |  |  |
| `blocks_completed` | jsonb | YES | '[]'::jsonb | ["75931e74-2267-4d55-8846-6f0d178da550", "bb031859-dff7-4… | nee |  |  |
| `progress_percentage` | integer | YES | 0 | 0 | nee |  |  |
| `quiz_attempts` | jsonb | YES | '{}'::jsonb | {"c3cfb524-363a-4ebd-937f-cfe2da9fdd2e": 1, "result_c3cfb… | nee |  |  |
| `started_at` | timestamp with time zone | YES | now() | "2026-03-14T11:48:25.167172+00:00" | nee |  |  |
| `updated_at` | timestamp with time zone | YES | now() | "2026-03-14T14:44:02.366507+00:00" | nee |  |  |
| `org_id` | uuid | YES | — | — | nee |  | → `.` |

## `user_roles`
Rijen (approx): **14**. PK: `id`. FK's: 2. Unique: 4. Checks: 4.
RLS-policies: 2.

| Veld | Type | Nullable | Default | Voorbeeld | PII? | V8.1? | Betekenis |
|---|---|---|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | "ed14e1d5-41cf-43f5-a90c-64b6a777904e" | nee |  |  |
| `user_id` | uuid | NO | — | "96379c15-f11a-43eb-9b37-987be3c56a42" | nee |  | → `.` |
| `role` | app_role enum(user|super_admin|content_editor|org_admin|manager|dpo) | NO | — | "super_admin" | nee |  |  |
| `created_at` | timestamp with time zone | YES | now() | "2026-01-26T05:19:38.241305+00:00" | nee |  |  |
| `org_id` | uuid | NO | '00000000-0000-0000-0000-000000000001'::uuid | "00000000-0000-0000-0000-000000000001" | nee |  | → `.` |
