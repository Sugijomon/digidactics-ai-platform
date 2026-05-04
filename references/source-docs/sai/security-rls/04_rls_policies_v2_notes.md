# 04_rls_policies_v2 — Notes

Productie-harde versie van de Shadow AI Scan V8.1 RLS-policies. Hieronder de
verschillen t.o.v. v1, resterende aannames, productiechecks en bewuste keuzes
rond anon-toegang.

---

## 1. Belangrijkste wijzigingen t.o.v. v1

| # | v1 | v2 |
|---|----|----|
| 1 | `anon` mocht direct INSERT op `survey_run` met enkel `org_id IS NOT NULL` | INSERT-policy verwijderd; aanmaak alleen via SD-RPC `start_survey_run(wave_token)` |
| 2 | `anon` mocht direct INSERT/UPDATE op alle survey-childtabellen mits `survey_run_is_open` | INSERT/UPDATE-policies verwijderd; flow via SD-RPC's met submission-token-validatie |
| 3 | Helpers `is_super_admin`, `get_user_org_id` etc. werden met `CREATE OR REPLACE` overschreven | Helpers worden alleen aangemaakt als ze niet bestaan (`to_regprocedure`-check) |
| 4 | Policies waren niet idempotent (her-uitvoeren faalt) | Iedere `CREATE POLICY` heeft een voorafgaande `DROP POLICY IF EXISTS` |
| 5 | `tool_catalog_discovery` had geen cross-tenant-guard | Trigger `tool_catalog_discovery_enforce_org` dwingt `org_id == survey_run.org_id` af |
| 6 | `calculate_v8_score(uuid)` direct EXECUTE-grant op `authenticated` | Direct grant ingetrokken; wrapper `recalculate_v8_score(p_run_id)` doet RBAC-check + audit |
| 7 | `survey_run_update_complete` policy stond elke `anon` toe completed_at te zetten | Vervangen door SD-RPC `complete_survey_run(run_id, token)` met token-burn |

---

## 2. Submission-token mechanisme (nieuw)

- Kolom `survey_run.submission_token_hash bytea` (idempotent toegevoegd).
- `start_survey_run(p_wave_token)` genereert 32-byte token, slaat hash op,
  retourneert cleartext eenmalig.
- `survey_run_token_valid(run_id, token)` vergelijkt SHA-256 hashes; eist
  `completed_at IS NULL`.
- Alle vervolg-RPC's (`set_ambassador_optin`, `complete_survey_run`, en de nog
  te leveren `save_*`-RPC's) accepteren `(run_id, token)` als auth-context.
- Bij `complete_survey_run` wordt `submission_token_hash` op `NULL` gezet
  → token-burn, geen re-submit.

**Vereiste schema-aanvulling buiten dit bestand:** `scan_wave.wave_token_hash bytea`
(voor `start_survey_run`). Indien afwezig: toevoegen aan schema v3 of via
losse migratie.

---

## 3. Bewuste keuzes — geen anon-access op:

| Object | Reden |
|--------|-------|
| Alle `ref_*`-tabellen | Voorkomt enumeratie van ongepubliceerde codes; labels worden door edge function geleverd in survey-payload. |
| `tools_library` | Niet vertrouwelijk, maar respondent heeft het niet nodig — tool-picker krijgt subset via RPC. |
| `org_tool_policy` + `_snapshot` | Org-vertrouwelijk (beleidsstatus per tool). |
| `scan_wave` | Wave-resolving via geheim wave-token in edge/RPC, nooit via SELECT. |
| `scan_scoring_config` | Methodologie + min_cell_size — niet relevant voor respondent. |
| `survey_run` SELECT/UPDATE/DELETE | Respondent heeft geen terugleeshuishouding. |
| Alle survey-childtabellen | Schrijven via SD-RPC's; lezen niet nodig. |
| `risk_result(_tool)`, `dpo_review_items`, `audit_events` | Output van governance — uitsluitend voor admin/DPO. |
| `report_exports` | Bestanden via signed URL; metadata alleen voor admin. |
| `mv_risk_clusters` | MV ondersteunt geen RLS; alleen via `dpo_risk_clusters_v2`. |

`anon` heeft enkel EXECUTE-rechten op:
- `start_survey_run(text)`
- `survey_run_token_valid(uuid, text)`
- `complete_survey_run(uuid, text)`
- `set_ambassador_optin(uuid, text, text)`

(plus de nog te leveren `save_*`-RPC's in `06_edge_rpcs.sql`).

---

## 4. Resterende aannames

1. **Schema v3 levert append-only triggers** op `audit_events`,
   `org_tool_policy_snapshot`, `risk_result`, `risk_result_tool`. Dit bestand
   leunt erop maar definieert ze niet.
2. **`scan_wave.wave_token_hash`** bestaat (of wordt toegevoegd). Zonder
   token-kolom werkt `start_survey_run` niet.
3. **Helper-functies `is_super_admin/is_org_admin/is_dpo/get_user_org_id`**
   uit de bestaande Lovable-DB blijven semantisch identiek aan de v2-defs.
4. **`pgcrypto`** is beschikbaar in schema `extensions`. Idempotent
   `CREATE EXTENSION` zit in dit bestand.
5. **`audit_events.actor_user_id`** kolom bestaat (gebruikt door
   `recalculate_v8_score`). Indien afwezig: toevoegen aan schema v3.
6. **Storage-bucket voor `report_exports`** is privé en wordt door een edge
   function aangesproken met service_role; signed URL-uitgifte loopt buiten
   de DB.
7. De nog niet geleverde **`save_*`-RPC's** (`save_profile`, `save_tool`,
   `save_motivations`, etc.) volgen hetzelfde patroon: `(run_id, token, payload)`
   → token-validatie → INSERT met `SECURITY DEFINER`.

---

## 5. Productiechecks vóór deploy

- [ ] **Helpers reeds aanwezig?** `SELECT to_regprocedure('public.is_super_admin(uuid)');`
      voor alle vier de helpers — bevestigen dat de `IF NULL`-fallbacks niets overschrijven.
- [ ] **`pgcrypto`-extensie:** `\dx pgcrypto` of
      `SELECT * FROM pg_extension WHERE extname='pgcrypto';`
- [ ] **Append-only triggers** uit schema v3 staan ACTIEF op `audit_events`,
      `risk_result`, `risk_result_tool`, `org_tool_policy_snapshot`.
- [ ] **`scan_wave.wave_token_hash`** kolom bestaat en is gevuld voor alle
      lopende waves (anders breekt `start_survey_run` direct).
- [ ] **`audit_events.actor_user_id`** kolom bestaat.
- [ ] **Smoke-test als `anon`:**
      - Direct `INSERT INTO survey_run …` → moet falen.
      - Direct `INSERT INTO survey_tool …` → moet falen.
      - `SELECT public.start_survey_run('<token>')` → moet `(run_id, token)` retourneren.
      - `SELECT public.calculate_v8_score('<run>')` → moet falen
        (`permission denied`).
      - `SELECT public.recalculate_v8_score('<run>')` zonder login → moet falen.
- [ ] **Smoke-test als `authenticated` (gewone user):**
      - `SELECT * FROM survey_run` → alleen rijen van eigen org of leeg.
      - `INSERT INTO tool_catalog_discovery (org_id=<andere_org>, …)` → moet falen
        (cross-tenant trigger).
- [ ] **`mv_risk_clusters`:** `SELECT … FROM mv_risk_clusters` als
      authenticated → permission denied. `dpo_risk_clusters_v2(<eigen_org>)`
      → werkt en past `min_cell_size` toe.
- [ ] **Idempotentie:** script tweemaal achter elkaar runnen — geen errors,
      geen dubbele policies (controleer met
      `SELECT polname, polrelid::regclass FROM pg_policy ORDER BY 2,1;`).
- [ ] **Edge-function audit:** controleer dat huidige client-code uit
      `src/lib/shadowSurveyEngineV8.ts` migreert naar de SD-RPC's; directe
      `supabase.from('survey_run').insert(...)`-calls breken na deploy.

---

## 6. Open punten / vervolg

1. Levering van `06_edge_rpcs.sql` met `save_profile`, `save_motivations`,
   `save_tool`, `save_tool_use_case`, `save_tool_use_case_context`,
   `save_tool_account`, `save_data_types`, `save_concerns`, `save_support_needs`,
   `save_tool_preference_reasons`, `register_tool_discovery`. Allemaal
   `(run_id, token, payload) → void` met token-validatie en cross-tenant guards.
2. Refactor van `src/lib/shadowSurveyEngineV8.ts` om RPC's te gebruiken i.p.v.
   directe table writes. Behoud van het bestaande engine-API maar met
   token-state in de `SurveyState`.
3. Beslissing over rate-limiting per `submission_token` (bv. via
   `extensions.uuid-ossp` + audit_events count) — buiten DB-RLS-scope, eerder
   een edge-function/middleware-onderwerp.
4. Beslissing of `super_admin` cross-org `recalculate_v8_score` mag triggeren
   — momenteel WEL toegestaan (impliciet in `is_super_admin`-clausule).
5. Documentatie van de wave-token-uitgifte (waar wordt `wave_token_hash`
   gevuld? In `scan_wave write`-policy of via aparte SD-RPC `create_wave`?).
