# SAI Synthetic Flow Testplan

Status: local/staging-only testplan for stap 5 of SAI production-readiness.

This testplan drives the real respondent RPC flow
(`start_survey_run` → `save_*` → `complete_survey_run`) against the
`SAI Synthetic Pilot Organisatie` described in
[`docs/sai-synthetic-pilot-organisatie.md`](sai-synthetic-pilot-organisatie.md)
so that `survey_run`, `survey_profile`, `survey_tool`,
`survey_tool_use_case`, `survey_tool_use_case_context`,
`survey_tool_account`, `survey_data_type`, `risk_result`,
`risk_result_tool`, `dpo_review_items`, and `audit_events` are all filled by
the production code path — `public.calculate_v8_score(...)` — instead of by
hand-written inserts into result tables.

Every expected number below is computed by hand from the live scoring
function in
`supabase/migrations/20260528143000_repair_v8_scoring_parity.sql`
(`calculate_v8_score`), so this document is also a regression check: if a
staging run produces different numbers than documented here, either the
scenario input was entered wrong or the SQL scoring function has drifted.

Prerequisite: run
`supabase/seed/20260708130000_sai_synthetic_pilot_org_fixture.sql` against
your local/staging Supabase first (creates the organization, the active scan
wave, the scoring config, and the `org_tool_policy` rows the scenarios below
depend on). See the header of that file for why this is a SQL fixture and
not an RPC call.

## Formula reference

From `calculate_v8_score`:

```txt
use_context_score = MAX(use_case_base * context_multiplier) over the tool's use cases
raw_exposure       = use_context_score * account_multiplier
                      + data_boost + frequency_boost + automation_boost
                      + extension_boost + agentic_boost
exposure_score      = LEAST(100, ROUND(raw_exposure))
toxic_boost         = 20 if shadow_score > 50 AND exposure_score > 50 else 0
priority_score_raw  = 0.45*shadow_score + 0.45*exposure_score + toxic_boost
priority_score       = LEAST(100, ROUND(priority_score_raw))
tool_tier            = critical>=75, high>=50, elevated>=25, else low

person_score_raw    = highest_tool_priority + 0.15 * sum(other_tool_priorities)
person_score         = LEAST(100, ROUND(person_score_raw))
score_tier            = critical>=75, high>=50, elevated>=25, else low
review_class          = toxic_shadow if prohibited_tool trigger OR person_score>=75
                         priority_review if any trigger present
                         else standard
```

Default org thresholds (from the fixture): `priority_review_threshold=40`,
`toxic_shadow_threshold=50`, `toxic_exposure_threshold=50`,
`dashboard_min_cell_size=5`.

## Scenario 1 — Geen AI-gebruik

Persona: 6× "geen AI-gebruiker" (`marketing_communicatie` ×2,
`sales_account` ×2, `operations` ×2).

| Veld | Waarde |
|---|---|
| `department_code` | per respondent: `marketing_communicatie` / `sales_account` / `operations` |
| `ai_frequency_code` | `never` |
| `no_ai_reason_code` | `geen_waarde` |
| `automation_usage_code` | (leeg) |
| `browser_extension_usage_code` | (leeg) |
| tools | geen — geen `save_tool`-aanroep |

Expected `risk_result`: `person_score=0`, `score_tier=low`,
`review_class=standard`, `review_trigger_codes=[]`,
`dpo_review_required=false`.
Expected `risk_result_tool`: geen rijen.
Expected `dpo_review_items`: geen rijen.
Expected `audit_events`: 1 rij `score.calculated` per run.

## Scenario 2 — Goedgekeurde tool, laag risico

Persona: 7× marketing/communicatiemedewerker (`marketing_communicatie`),
plus hergebruikt als filler in `it_data_development` (5×),
`finance_legal` (5×), `hr_recruitment` (2×), `sales_account` (4×), en
`operations` (4×), en als "kleine cluster"-patroon in scenario 8a/8b.

| Veld | Waarde |
|---|---|
| `department_code` | `marketing_communicatie` (of filler-afdeling) |
| `ai_frequency_code` | `weekly` |
| `automation_usage_code` | `alleen_chatbot` |
| `browser_extension_usage_code` | `nee` |
| `data_type_codes` | `["public_information"]` |
| tool | `tool_code="ms_copilot_365"`, `tool_name="Microsoft 365 Copilot"`, `is_custom=false` |
| use case | `drafting` |
| context | `internal_work` |
| account type | `business_license` |

Calculation: `use_context=10*1.0=10`, `raw_exposure=10*0.8+0+8+0+0+0=16`,
`exposure_score=16`, `shadow_score=0` (approved), `priority_raw=7.2`,
`priority_score=7` → **tier `low`**.

Expected `risk_result`: `person_score=7`, `score_tier=low`,
`review_class=standard`, `review_trigger_codes=[]`,
`dpo_review_required=false`.
Expected `risk_result_tool`: 1 row, `shadow_score=0`, `exposure_score=16`,
`priority_score=7`, `score_tier_tool=low`, `trigger_codes=[]`.
Expected `dpo_review_items`: geen rijen.

## Scenario 3 — Goedgekeurde tool met gevoelige/special-category data

Persona: 4× HR-medewerker (`hr_recruitment`).

| Veld | Waarde |
|---|---|
| `department_code` | `hr_recruitment` |
| `ai_frequency_code` | `daily` |
| `automation_usage_code` | `alleen_chatbot` |
| `browser_extension_usage_code` | `nee` |
| `data_type_codes` | `["special_personal_data"]` |
| tool | `tool_code="chatgpt_enterprise"`, `tool_name="ChatGPT Enterprise"`, `is_custom=false` |
| use case | `klantenservice` |
| context | `internal_work` |
| account type | `business_license` |

Calculation: `use_context=25*1.0=25`,
`raw_exposure=25*0.8+30+14+0+0+0=64`, `exposure_score=64`,
`shadow_score=0` (approved), `priority_raw=28.8`, `priority_score=29` →
**tier `elevated`**.

Expected `risk_result`: `person_score=29`, `score_tier=elevated`,
`review_class=priority_review`, `review_trigger_codes=["special_category_data"]`,
`dpo_review_required=true`.
Expected `risk_result_tool`: 1 row, `shadow_score=0`, `exposure_score=64`,
`priority_score=29`, `score_tier_tool=elevated`,
`trigger_codes=["special_category_data"]`.
Expected `dpo_review_items`: 1 open item, `reason_code=special_category_data`.

This isolates the point in `docs/domain-decisions.md` that data sensitivity
drives review independently of tool policy status.

## Scenario 4 — Onbekende tool met privé-account

Persona: 4× IT-medewerker (`it_data_development`).

| Veld | Waarde |
|---|---|
| `department_code` | `it_data_development` |
| `ai_frequency_code` | `weekly` |
| `automation_usage_code` | `alleen_chatbot` |
| `browser_extension_usage_code` | `nee` |
| `data_type_codes` | `["customer_data"]` |
| tool | geen `tool_code` (custom), `tool_name="Onbekende schrijfassistent"`, `is_custom=true`, gevolgd door `register_tool_discovery` met `raw_tool_name="Onbekende schrijfassistent"` |
| use case | `klantenservice` |
| context | `klantgerichte_toepassing` |
| account type | `personal_free` |

Calculation: `use_context=25*1.2=30`,
`raw_exposure=30*1.35+20+8+0+0+0=68.5`, `exposure_score=69`,
`shadow_score=20` (no `org_tool_policy` row → defaults to
`newly_discovered`), `priority_raw=0.45*20+0.45*69=40.05`,
`priority_score=40` → **tier `elevated`** (>=25, <50).

Expected `risk_result`: `person_score=40`, `score_tier=elevated`,
`review_class=priority_review`, `review_trigger_codes=["priority_threshold"]`,
`dpo_review_required=true`.
Expected `risk_result_tool`: 1 row, `shadow_score=20`, `exposure_score=69`,
`priority_score=40`, `score_tier_tool=elevated`,
`trigger_codes=["priority_threshold"]`, `policy_snapshot_id=NULL` (per
`docs/database-model.md`, custom tools without a `tools_library` row do not
get a policy snapshot).
Expected `dpo_review_items`: 1 open item, `reason_code=priority_threshold`.
Expected `tool_catalog_discovery`: 1 row (`review_status=pending`) — outside
the required table list, but the RPC produces it as a side effect of
`register_tool_discovery`.

## Scenario 5 — Restricted/prohibited tool met hoge exposure

Persona: 2× finance-medewerker (`finance_legal`).

| Veld | Waarde |
|---|---|
| `department_code` | `finance_legal` |
| `ai_frequency_code` | `daily` |
| `automation_usage_code` | `agents_reeks_taken` |
| `browser_extension_usage_code` | `ja_bewust` |
| `data_type_codes` | `["financial_data"]` |
| tool | `tool_code="shadow_agent_x"`, `tool_name="Shadow Agent X"`, `is_custom=false` |
| use case | `systemen_aansturen` |
| context | `kritieke_systemen` |
| account type | `personal_free` |

Calculation: `use_context=45*1.8=81`,
`raw_exposure=81*1.35+22+14+15+8+15=183.35`, `exposure_score=100` (capped),
`shadow_score=80` (prohibited), `toxic_boost=20` (both thresholds exceeded),
`priority_raw=0.45*80+0.45*100+20=101`, `priority_score=100` (capped) →
**tier `critical`**.

Expected `risk_result`: `person_score=100`, `score_tier=critical`,
`review_class=toxic_shadow`,
`review_trigger_codes` contains `prohibited_tool`, `agentic_usage`,
`automation_unmanaged`, `extension_unmanaged`, `priority_threshold` (5
codes), `dpo_review_required=true`.
Expected `risk_result_tool`: 1 row, `shadow_score=80`, `exposure_score=100`,
`priority_score=100`, `score_tier_tool=critical`, same 5 `trigger_codes`.
Expected `dpo_review_items`: 5 open items, one per `reason_code` above.

This is the end-to-end `toxic_shadow` proof: a single run with all five
review triggers firing at once.

## Scenario 6 — Agentic/automation-outlier

Persona: 3× IT/ops-medewerker (`it_data_development`).

| Veld | Waarde |
|---|---|
| `department_code` | `it_data_development` |
| `ai_frequency_code` | `daily` |
| `automation_usage_code` | `agents_reeks_taken` |
| `browser_extension_usage_code` | `nee` |
| `data_type_codes` | `["internal_documents"]` |
| tool | `tool_code="zapier_ai_agents"`, `tool_name="Zapier AI Agents"`, `is_custom=false` |
| use case | `workflow_uitvoeren` |
| context | `internal_work` |
| account type | `business_license` |

Calculation: `use_context=40*1.0=40`, `raw_exposure=40*0.8+15+14+15+0+15=91`,
`exposure_score=91`, `shadow_score=0` (**approved** tool — this scenario
deliberately isolates the behavior signal from the policy signal),
`priority_raw=0.45*0+0.45*91=40.95`, `priority_score=41` →
**tier `elevated`**.

Expected `risk_result`: `person_score=41`, `score_tier=elevated`,
`review_class=priority_review`,
`review_trigger_codes=["agentic_usage","automation_unmanaged","priority_threshold"]`,
`dpo_review_required=true`.
Expected `risk_result_tool`: 1 row, matching values, `score_tier_tool=elevated`.
Expected `dpo_review_items`: 3 open items.

Contrast with scenario 5: same agentic/automation behavior, but because the
tool is `approved` (`shadow_score=0`) the outcome is `priority_review`, not
`toxic_shadow` — proves the two signals are independent, per
`docs/domain-decisions.md`.

## Scenario 7 — HR/evaluatie-context-outlier

Persona: 2× HR-medewerker (`hr_recruitment`).

| Veld | Waarde |
|---|---|
| `department_code` | `hr_recruitment` |
| `ai_frequency_code` | `weekly` |
| `automation_usage_code` | `alleen_chatbot` |
| `browser_extension_usage_code` | `nee` |
| `data_type_codes` | `["names"]` |
| tool | `tool_code="hr_people_analytics"`, `tool_name="HR People Analytics Suite"`, `is_custom=false` |
| use case | `data_analyseren` |
| context | `hr_evaluatie` |
| account type | `business_license` |

Calculation: `use_context=30*1.7=51`, `raw_exposure=51*0.8+8+8+0+0+0=56.8`,
`exposure_score=57`, `shadow_score=0` (approved), `priority_raw=25.65`,
`priority_score=26` → **tier `elevated`**.

Expected `risk_result`: `person_score=26`, `score_tier=elevated`,
`review_class=priority_review`,
`review_trigger_codes=["hr_evaluation_context"]`, `dpo_review_required=true`.
Expected `risk_result_tool`: 1 row, matching values.
Expected `dpo_review_items`: 1 open item, `reason_code=hr_evaluation_context`.

Shows that a low/elevated score can still require review purely because of
context — relevant for EU AI Act Annex III "decisions about people" framing.

## Scenario 8a/8b — Kleine clusters onder `dashboard_min_cell_size`

Persona: 3× directie (`directie_management`), 2× "anders" (`anders`). Reuses
the scenario 2 answer set exactly (same tool, same profile answers), only
`department_code` differs.

Expected per-run `risk_result`/`risk_result_tool`: identical to scenario 2
(`person_score=7`, `score_tier=low`, `review_class=standard`).

Expected **dashboard** behavior (manual check, not a scoring assertion):
because `directie_management` (3) and `anders` (2) both fall below
`dashboard_min_cell_size=5`, Tool Inventaris, the Risicoprofiel matrix, and
the review queue should merge or suppress these clusters instead of showing
them as identifiable groups — see `docs/domain-decisions.md`,
"Dashboard Privacy And Scoring Regression Tests".

## How to run

```bash
# 1. Apply migrations + the reference seed (once per local/staging DB).
# 2. Apply the org/wave/tool-policy fixture:
psql "<db-url>" -f supabase/seed/20260708130000_sai_synthetic_pilot_org_fixture.sql

# 3. Preview the plan first (dry run — default, no Supabase calls, no env needed):
corepack pnpm --dir apps/sai seed:synthetic-flow -- --scenario all

# 4. Then actually write, with explicit opt-in:
corepack pnpm --dir apps/sai seed:synthetic-flow -- \
  --wave-token sai-synthetic-pilot-wave-token \
  --target local --confirm \
  --scenario all
# (use --target staging --confirm --i-know-this-is-staging against staging)
```

The script lives in `apps/sai/scripts/synthetic-flow/` and is documented in
its own README plus `supabase/README.md`. It:

- reads `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` from
  the environment (the same anon-only surface the real respondent flow
  uses — no service-role key anywhere in this script, and no `.env` file is
  ever read or printed by this documentation, only the variable names above);
- **defaults to a dry run** (prints the plan, makes zero Supabase calls) and
  only writes data when both `--target local|staging` and `--confirm` are
  passed explicitly; `--target staging` additionally requires
  `--i-know-this-is-staging`, and a mismatch between `--target` and the
  resolved URL host is a hard failure (same guard family as
  `supabase/smoke-tests/run-rls-role-matrix-smoke.sh` — see
  `apps/sai/scripts/synthetic-flow/src/authorization.ts`);
- plays each scenario through `start_survey_run` → `save_profile` →
  `save_data_types` → `save_tool` → `save_tool_use_case` →
  `save_tool_use_case_context` → `save_tool_account` →
  (`register_tool_discovery` for scenario 4) → `complete_survey_run`, exactly
  the RPC sequence `apps/sai/lib/sai-rpc/client.ts` uses;
- supports `--scenario <name|all>` and `--repeat <n>` to reproduce the
  respondent counts in
  [`docs/sai-synthetic-pilot-organisatie.md`](sai-synthetic-pilot-organisatie.md).

After running, inspect `/dashboard/tools`, `/dashboard/risicoprofiel`,
`/dashboard/governance`, and `/dashboard/rapportage` as the DPO test user
from `docs/sai-rls-smoke-runbook.md` (linked to
`org_id=00000000-0000-0000-0000-000000000301`) to confirm the numbers above
surface correctly and the small clusters are suppressed.
