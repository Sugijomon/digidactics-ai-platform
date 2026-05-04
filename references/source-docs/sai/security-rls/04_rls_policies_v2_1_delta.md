# 04_rls_policies_v2_1.sql — delta t.o.v. v2

Alleen technische deploy-hardening. Geen wijzigingen aan RLS-keuzes, rolmodel,
append-only gedrag, k-anonimiteit of token-flow.

## Wijzigingen

1. **pgcrypto bovenaan (sectie 0a)**
   `CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;` staat nu
   vóór elke functie die `digest()` of `gen_random_bytes()` gebruikt
   (`survey_run_token_valid`, `start_survey_run`). In v2 stond dit ná
   `survey_run_token_valid` — dat brak bij een schone deploy.

2. **Pre-migration dependency expliciet (sectie 0b)**
   `scan_wave.wave_token_hash bytea` wordt idempotent toegevoegd vóór
   `start_survey_run` wordt gedefinieerd, met partial index. In v2 ontbrak
   dit volledig en zou `start_survey_run` falen op een schone DB.
   Commentaar markeert dit als verplaatsbaar naar de schema-migratie.

3. **Helpers vooraan (sectie 0d)**
   `survey_run_org`, `survey_run_is_open`, `survey_tool_run`,
   `survey_tool_use_case_run` zijn naar sectie 0d verplaatst (in v2 stonden
   ze in sectie 6, nadat policies in eerdere secties ze al impliciet
   referenceerden via inline gedefinieerde policies in sectie 6 zelf — bij
   herordening of partial re-runs ontstond een ordering-bug). Nu altijd
   beschikbaar vóór gebruik.

4. **`survey_run_token_valid` afgeschermd (sectie 0e)**
   `REVOKE ALL ... FROM PUBLIC, anon, authenticated;` — alleen aanroepbaar
   vanuit andere `SECURITY DEFINER` RPC's (`complete_survey_run`,
   `set_ambassador_optin`) en `service_role`. In v2 had `anon` + `authenticated`
   rechtstreeks `EXECUTE`, wat token-bruteforce vanaf de client mogelijk
   maakte.

5. **Idempotentie geverifieerd**
   - Alle `CREATE POLICY` voorafgegaan door `DROP POLICY IF EXISTS`.
   - Alle helper-RPC's via `CREATE OR REPLACE` óf `to_regprocedure`-guard.
   - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` voor beide hash-kolommen.
   - `CREATE INDEX IF NOT EXISTS` voor beide indexes.
   - `DROP TRIGGER IF EXISTS` vóór `CREATE TRIGGER`.
   - Geen `CREATE OR REPLACE` op de legacy-helpers (`get_user_org_id`,
     `is_*`) — die blijven intact in productie.

## Niet-gewijzigd (bewust)

- Tabel- of kolomdefinities buiten `wave_token_hash` en
  `submission_token_hash`.
- Anon-flow: nog steeds uitsluitend via `start_survey_run`,
  `complete_survey_run`, `set_ambassador_optin`.
- Append-only blokkering op `risk_result*`, `audit_events`,
  `org_tool_policy_snapshot`.
- `mv_risk_clusters`: alleen via `dpo_risk_clusters_v2(p_org_id)` met
  `min_cell_size`-suppressie.
- `calculate_v8_score`: directe EXECUTE blijft ingetrokken; aanroep via
  `recalculate_v8_score` wrapper met RBAC-check + audit-trail.

## Deploy-volgorde

1. `v8_1_target_schema.sql` (CONCEPT v3) — tabellen, MV, append-only triggers.
2. `04_rls_policies_v2_1.sql` — dit script.
3. (Optioneel) verplaats secties 0a en 0b naar de schema-migratie en
   verwijder ze hier; het script blijft dan idempotent functioneren omdat
   beide acties `IF NOT EXISTS`-guards gebruiken.

## Resterende open punten (ongewijzigd t.o.v. v2-notes)

- `save_*`-RPC's voor child-tabellen worden in `06_edge_rpcs.sql` opgeleverd
  (buiten scope van dit RLS-script).
- Rate-limiting op `start_survey_run` / `survey_run_token_valid` hoort op
  edge-function-/gateway-niveau (niet in DB).
- Storage-bucket policies voor `report_exports` blijven uit dit script;
  worden via Supabase Storage geconfigureerd.
