# SAI RPC Flow Contract

Status: implemented as SQL migration, frontend not yet implemented.

This document records the client/server contract for the Shadow AI Scan
respondent write flow.

## Migration

The RPC layer lives in:

```txt
supabase/migrations/20260504130000_06_edge_rpcs.sql
```

It depends on:

```txt
supabase/migrations/20260504110000_v8_1_target_schema.sql
supabase/migrations/20260504120000_rls_policies_v2_1.sql
```

## Security Model

Respondents do not write directly to tables.

Flow:

1. Client calls `start_survey_run(wave_token)`.
2. Database returns `run_id` and one-time `submission_token`.
3. Client stores token only for the active survey session.
4. Client calls `save_*` RPCs with `(run_id, submission_token, payload)`.
5. Client calls `complete_survey_run(run_id, submission_token)`.
6. Completion burns the token by setting `submission_token_hash = NULL`.

The database derives `org_id` from `survey_run`. The client never sends `org_id`
for respondent writes.

## Respondent RPCs

Existing from RLS migration:

```txt
start_survey_run(p_wave_token text)
complete_survey_run(p_run_id uuid, p_token text)
set_ambassador_optin(p_run_id uuid, p_token text, p_email text)
```

Added in `06_edge_rpcs.sql`:

```txt
save_profile(p_run_id uuid, p_token text, p_payload jsonb)
save_motivations(p_run_id uuid, p_token text, p_items jsonb)
save_data_types(p_run_id uuid, p_token text, p_codes jsonb)
save_concerns(p_run_id uuid, p_token text, p_codes jsonb)
save_support_needs(p_run_id uuid, p_token text, p_codes jsonb)
save_tool_preference_reasons(p_run_id uuid, p_token text, p_codes jsonb)
save_tool(p_run_id uuid, p_token text, p_payload jsonb) -> uuid
save_tool_use_case(p_run_id uuid, p_token text, p_survey_tool_id uuid, p_use_case_code text) -> uuid
save_tool_use_cases(p_run_id uuid, p_token text, p_survey_tool_id uuid, p_use_case_codes jsonb) -> uuid[]
save_tool_use_case_context(p_run_id uuid, p_token text, p_survey_tool_use_case_id uuid, p_context_codes jsonb)
save_tool_account(p_run_id uuid, p_token text, p_survey_tool_id uuid, p_account_type_code text)
register_tool_discovery(p_run_id uuid, p_token text, p_survey_tool_id uuid, p_raw_tool_name text) -> uuid
```

## Frontend Refactor Notes

When the Next.js app exists, replace direct table writes such as:

```ts
supabase.from("survey_run").insert(...)
supabase.from("survey_profile").upsert(...)
supabase.from("survey_tool").insert(...)
```

with:

```ts
supabase.rpc("start_survey_run", { p_wave_token })
supabase.rpc("save_profile", { p_run_id, p_token, p_payload })
supabase.rpc("save_tool", { p_run_id, p_token, p_payload })
supabase.rpc("complete_survey_run", { p_run_id, p_token })
```

The frontend should keep a small survey session state:

```txt
runId
submissionToken
startedAt
currentStep
```

Do not persist the submission token beyond the active survey session unless a
deliberate resume-flow is designed.

## Smoke Tests

Manual smoke-test notes live in:

```txt
supabase/smoke-tests/20260504140000_sai_rpc_smoke_tests.sql
```

Minimum checks:

- anon direct table writes fail
- valid token RPC writes succeed
- invalid token RPC writes fail
- completion burns the token
- direct `calculate_v8_score` remains blocked
- DPO/admin reads remain governed by RLS
