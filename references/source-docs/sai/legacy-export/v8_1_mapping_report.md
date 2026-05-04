# V8.1 Mapping Report — Lovable legacy → Shadow AI Scan V8.1

Doelconcepten zijn de tabellen voorgesteld voor de nieuwe Next.js + Supabase implementatie.
Mapping is een **voorstel**, geen migratie. Geen schema-wijzigingen toegepast.

## `organizations`
**Bronnen (legacy):** `organizations`
**Toelichting:** 1:1 over te nemen. Veld-uitsplitsing voor financiële PII overwegen (zie risks).

## `organization_members`
**Bronnen (legacy):** `profiles`, `user_roles`
**Toelichting:** Combineer `profiles` (basisidentiteit) met `user_roles` (RBAC). `org_id` op profile = lidmaatschap.

## `scan_rounds`
**Bronnen (legacy):** `survey_wave`
**Toelichting:** `survey_wave` is leeg in legacy (0 rijen). Concept bestaat al via `survey_run.wave_id` (nullable).

## `survey_responses`
**Bronnen (legacy):** `survey_run`, `survey_profile`, `survey_motivation`, `survey_data_type`, `survey_top_concern`, `survey_support_need`, `survey_tool_preference_reason`
**Toelichting:** Eén header (`survey_run`) + meerdere child-tabellen per blok. In V8.1 als denormalised JSONB per response overwegen, of parent + per-blok child houden.

## `tool_usage_combinations`
**Bronnen (legacy):** `survey_tool`, `survey_tool_use_case`, `survey_tool_use_case_context`, `survey_tool_account`, `survey_tool_use_case_flag`
**Toelichting:** Centrale kern van V8.1 scoring. Combinatie tool × use_case × context × account = scoringseenheid.

## `organization_tool_policy_snapshots`
**Bronnen (legacy):** `org_tool_policy`
**Toelichting:** `survey_tool.org_policy_status_code_snapshot` + `eu_ai_act_flag_code_snapshot` zijn de point-in-time snapshots. `org_tool_policy` (0 rijen) is de live policy-tabel — historiseren in V8.1.

## `scoring_configs`
**Bronnen (legacy):** `scan_scoring_config`
**Toelichting:** Tabel bestaat (0 rijen). Bevat o.a. `dashboard_min_cell_size`. Schema valideren tegen V8.1 weights.

## `tool_scores`
**Bronnen (legacy):** `risk_result_tool`
**Toelichting:** Bevat `shadow_score`, `exposure_score` per tool per run. Dichtst bij V8.1 `tool_scores`.

## `respondent_scores`
**Bronnen (legacy):** `risk_result`
**Toelichting:** Per `survey_run_id`: `person_score`, `assigned_tier`, `highest_priority_score`, `review_trigger_codes`.

## `risk_clusters`
**Bronnen (legacy):** `dpo_risk_clusters() RPC`
**Toelichting:** Geen tabel; resultaat van RPC met k-anonimiteit. In V8.1 als materialized view of cron-aggregaat overwegen.

## `dpo_review_items`
**Bronnen (legacy):** `dpo_notifications`, `tool_catalog_discovery`
**Toelichting:** `dpo_notifications` = generieke meldingen. `tool_catalog_discovery` = pending tool-reviews. Mogelijk samenvoegen.

## `report_exports`
**Bronnen (legacy):** `—`
**Toelichting:** **Ontbreekt** in legacy. Audit-trail van gegenereerde DPO-exports moet nieuw worden opgezet.

## `audit_events`
**Bronnen (legacy):** `admin_audit_log`
**Toelichting:** Bestaat. Beperkt tot rol/profiel-mutaties — V8.1 moet uitgebreid worden met scan- en scoring-events.

## Dekking V8.1 scoring-inputs

| Concept | Aanwezig? | Locatie(s) |
|---|---|---|
| org_policy_status | ✅ | `org_tool_policy.org_policy_status_code`, `survey_tool.org_policy_status_code_snapshot` |
| tool | ✅ | `org_tool_policy.tool_code`, `survey_tool.tool_code`, `org_tools_catalog.tool_name`, `survey_tool.tool_name`, `tool_discoveries.tool_name` _(+4)_ |
| use_case | ✅ | `survey_tool_use_case.use_case_code` |
| context | ✅ | `survey_tool_use_case_context.context_code` |
| accounttype | ✅ | `survey_tool_account.account_type_code` |
| datatype | ✅ | `survey_data_type.data_type_code` |
| frequency | ✅ | `survey_profile.ai_frequency_code` |
| browser_extension_usage | ✅ | `survey_profile.browser_extension_usage_code` |
| automation_flag | ✅ | `survey_profile.automation_usage_code` |
| agentic_usage | ✅ | `risk_result_tool.agentic_boost` |
| override_reason | ✅ | `risk_result.override_reason`, `risk_result_tool.override_reason`, `org_tools_catalog.override_data_storage`, `org_tools_catalog.override_trains_on_input`, `org_tools_catalog.override_acknowledged_by` _(+3)_ |
| department/team/cluster | ✅ | `survey_profile.department_code`, `survey_profile.department_other_text` |
| scan_round | ✅ | `scan_scoring_config.wave_id`, `survey_invite.wave_id`, `survey_run.wave_id` |
| respondent pseudonymous ID | ✅ | `risk_result.survey_run_id`, `risk_result_tool.survey_run_id`, `survey_data_type.survey_run_id`, `survey_motivation.survey_run_id`, `survey_participation.survey_run_id` _(+7)_ |

## Dekking V8.1 scoring-outputs

| Output | Aanwezig? | Locatie(s) |
|---|---|---|
| shadow_score | ✅ | `risk_result_tool.shadow_score` |
| raw_exposure_score | ✅ | `risk_result_tool.raw_exposure_score` |
| exposure_score | ✅ | `risk_result_tool.exposure_score` |
| toxic_boost | ✅ | `risk_result_tool.toxic_boost` |
| review_boost | ✅ | `risk_result_tool.review_boost` |
| priority_score_raw | ✅ | `risk_result_tool.priority_score_raw` |
| priority_score | ✅ | `risk_result_tool.priority_score`, `risk_result.highest_priority_score` |
| tier | ✅ | `legacy_survey_participation_view.assigned_tier`, `risk_result.assigned_tier`, `shadow_survey_runs.assigned_tier`, `legacy_survey_participation_view.assigned_tier`, `risk_result.assigned_tier` |
| dpo_review_required | ✅ | `risk_result.dpo_review_required`, `risk_result_tool.dpo_review_required`, `shadow_survey_runs.dpo_review_required`, `risk_result.review_trigger_codes`, `risk_result_tool.review_trigger_codes` |
| trigger_codes | ✅ | `risk_result.review_trigger_codes`, `risk_result_tool.review_trigger_codes`, `risk_result.review_trigger_codes`, `risk_result_tool.review_trigger_codes` |
