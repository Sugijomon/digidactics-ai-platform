# 04_rls_policies — Notes (CONCEPT v1)

Begeleidende notities bij `04_rls_policies.sql` voor V8.1 targetschema v3.

## Patroon

- **Helperfuncties** — alle org-/rolchecks via SECURITY DEFINER functies
  (`is_super_admin`, `is_org_admin`, `is_dpo`, `get_user_org_id`,
  `is_org_admin_or_dpo_for`). Geen inline subqueries op dezelfde tabel
  (voorkomt RLS-recursie).
- **Eén policy per (tabel × operatie × doelgroep)** — expliciet boven slim.
- **`anon` rol** — alleen op survey-flow tabellen (`survey_run` + childs +
  `tool_catalog_discovery`), uitsluitend INSERT/UPDATE zolang
  `survey_run.completed_at IS NULL`.
- **`authenticated` rol** — alle leesrechten voor admin/DPO/super_admin via
  org-scoped helpers.
- **`service_role`** — bypasst RLS automatisch in Supabase; gebruikt door
  edge functions voor: opt-in PII, scoring write-back, audit-events,
  policy-snapshot creatie.

## Schrijftoegang per tabel

| Tabel | Client INSERT | Client UPDATE | Client DELETE | Notitie |
|---|---|---|---|---|
| `tools_library` | super_admin | super_admin | super_admin | Platform-globaal |
| `org_tool_policy` | admin/dpo eigen org | admin/dpo eigen org | admin/dpo eigen org | Live, mutable |
| `org_tool_policy_snapshot` | ❌ alleen SD/service | ❌ trigger blokt | ❌ trigger blokt | Append-only audit |
| `scan_wave` | admin/dpo eigen org | admin/dpo eigen org | admin/dpo eigen org | |
| `scan_scoring_config` | super_admin | super_admin | super_admin | Methodologisch |
| `survey_run` | anon+auth (open) | anon+auth (completen) | super_admin | Edge function preferred |
| `survey_run_ambassador_opt_in` | ❌ alleen service | ❌ | ❌ | PII isolatie |
| `survey_*` childs | anon+auth (run open) | anon+auth (run open) | super_admin | |
| `tool_catalog_discovery` | anon+auth (run open) | admin/dpo eigen org | super_admin | DPO review queue |
| `risk_result` (`_tool`) | ❌ alleen SD/service | ❌ | ❌ | Authoritatieve scoring |
| `dpo_review_items` | ❌ alleen SD/service | admin/dpo eigen org | ❌ (audit) | Status via update |
| `audit_events` | ❌ alleen SD/service | ❌ trigger blokt | ❌ trigger blokt | Append-only |
| `report_exports` | admin/dpo eigen org (created_by=self) | admin/dpo eigen org | super_admin | Geen publieke URL |
| `mv_risk_clusters` | n.v.t. (MV) | n.v.t. | n.v.t. | Wrapper-RPC `dpo_risk_clusters_v2()` |
| `ref_*` | super_admin | super_admin | super_admin | SELECT voor authenticated |

## Speciale constructies

### `org_tool_policy_snapshot`
- Geen INSERT-policy voor `authenticated`/`anon` → uitsluitend bereikbaar via
  `calculate_v8_score` (SECURITY DEFINER) of een toekomstige
  `capture_policy_snapshot()` SD-helper, óf via service_role in een edge function.
- UPDATE/DELETE worden bovendien hard geblokkeerd door de trigger
  `protect_policy_snapshot_immutable` (in schema v3).

### `survey_run_ambassador_opt_in`
- Strikt: geen client INSERT/UPDATE/DELETE-policy. De edge function die de
  opt-in registreert moet draaien onder `service_role`. Reden: PII-bescherming
  + audit van wie/wanneer e-mail koppelt aan een survey-run.

### `mv_risk_clusters`
- Materialized views ondersteunen geen RLS in PostgreSQL.
- Daarom: `REVOKE ALL` op de MV en exposure uitsluitend via SECURITY DEFINER
  RPC `dpo_risk_clusters_v2(p_org_id)`.
- Die RPC:
  1. Controleert of caller super_admin of org_admin/dpo voor `p_org_id` is.
  2. Leest `dashboard_min_cell_size` uit de actieve `scan_scoring_config`.
  3. Filtert rijen onder de cellgrootte (k-anonimiteit).

### `survey_run` open-flow
- Anon mag INSERT (start survey) en UPDATE (completen) zonder authenticatie.
- Beperking: UPDATE alleen als `completed_at IS NULL` → één keer afronden.
- **Bekend risico**: zonder per-run secret kan iemand met de UUID een open run
  manipuleren. Mitigatie staat in open punten — overweging: edge-function-only
  flow met run-token, of `started_by_token` kolom met match-check.

### Survey child-tabellen
- Policies gebruiken `survey_run_is_open(run_id)` en `survey_run_org(run_id)`
  helpers (SECURITY DEFINER). Eén keer gedefinieerd, hergebruikt via DO-loop.
- DELETE uitsluitend door super_admin → forensische rij-bescherming.

### `report_exports` INSERT
- WITH CHECK afdwingt `created_by = auth.uid()` → voorkomt impersonation.
- Storage-toegang verloopt via signed URLs op private bucket; deze RLS regelt
  alleen de metadata-rij.

## Assumpties

1. **Bestaande helpers** (`get_user_org_id`, `is_super_admin`, `is_org_admin`,
   `is_dpo`) staan al in productie en gedragen zich zoals gespecificeerd in de
   legacy DB. De `CREATE OR REPLACE` in dit bestand zijn idempotente fallbacks
   voor greenfield-deployments.
2. **`user_roles`-tabel** bestaat met enum/text-rol kolom. Niet opnieuw
   gedefinieerd in dit bestand.
3. **`profiles.org_id`** is gevuld voor elke ingelogde gebruiker. NULL → geen
   org-scoped toegang.
4. **`service_role`** wordt gebruikt door edge functions; bypasst RLS standaard.
5. **`anon`-rol** is de standaard rol voor unauthenticated requests in Supabase.
6. **`auth.uid()`** retourneert `NULL` voor anonymous calls. `is_*`-helpers
   gaan correct om met NULL (geen rij in `user_roles` → false).
7. **DPO en org_admin hebben gelijke toegang** binnen Shadow AI Scan-scope.
   Differentiatie (bv. financiële velden) wordt door view/kolom-laag geregeld,
   niet door RLS hier.
8. **Geen `force row level security`** — eigenaren (postgres) bypassen RLS;
   acceptabel voor migrations/backups.
9. **Edge functions voor respondent-flow zijn de geprefereerde route**; directe
   anon-policies dienen als fallback voor in-app survey-rendering. Productie
   kan deze later strakker maken (edge-only).

## Open punten

1. **Run-token voor anon survey-flow** — moet er een server-side gegenereerd
   `run_token` (text/uuid) komen op `survey_run` zodat UPDATE/INSERT alleen
   slaagt bij geldig token? Sterk aanbevolen vóór productie.
2. **Edge-function-only flow** — alternatief: alle anon-policies droppen en
   uitsluitend via service_role-edge function laten lopen. Eenvoudiger
   threat-model, vereist herwerk van survey-frontend.
3. **`dpo_review_items` — kunnen DPO/admin een item handmatig openen?** — nu
   alleen INSERT via scoring function. Eventueel SD-helper toevoegen voor
   handmatige cases (bv. melding van gebruiker buiten scoring om).
4. **`audit_events` retentie** — geen TTL/partitioning hier; afhankelijk van
   beslissing in schema-changelog open punt #6.
5. **`mv_risk_clusters` — kolom `dominant_trigger`** — definitie nu = eerste
   element van `review_trigger_codes`. Consistentie met legacy
   `dpo_risk_clusters()` (die ranking toepast op verboden/special/HR/agentic)
   moet bevestigd worden.
6. **`scan_scoring_config` schrijfrecht** — nu super_admin-only. Discussie:
   moet org_admin per org kunnen versionieren binnen vooraf goedgekeurde
   bandbreedte? Vereist policy-split.
7. **`tools_library` write** — nu super_admin only. Als content_editor-rol
   (uit RouteAI) ook tools mag toevoegen, breidt policy uit met
   `is_content_editor()`.
8. **`organizations` / `profiles` policies** — overschrijven nu mogelijk
   bestaande policies. In productie eerst `DROP POLICY IF EXISTS` of policies
   uit dit bestand verwijderen vóór deployment.
9. **DELETE op survey-data** — alleen super_admin. Voor AVG-verwijderverzoeken
   moet er een aparte SD-RPC `anonymize_survey_run(id)` komen die data scrubt
   i.p.v. delete.
10. **Force RLS** — overweeg `ALTER TABLE … FORCE ROW LEVEL SECURITY` op
    audit-tabellen om eigenaar-bypass uit te sluiten in productie.
