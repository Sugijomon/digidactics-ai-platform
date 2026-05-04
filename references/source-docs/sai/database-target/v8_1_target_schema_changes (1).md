# Changelog — v8_1_target_schema.sql

## CONCEPT v3 (huidig)

Doorgevoerde correcties op basis van review-feedback:

### 1. Reproduceerbare policy-snapshots
- **Nieuwe tabel `org_tool_policy_snapshot`** als immutable auditbron.
  - Velden: `id`, `org_id`, `tool_code`, `org_policy_status_code`,
    `eu_ai_act_flag_code`, `notes`, `content_hash` (sha256), `source_policy_id`,
    `captured_at`, `captured_by`.
  - Append-only via trigger `protect_policy_snapshot_immutable` (UPDATE/DELETE blokkeren).
  - De-dup via unieke index `(org_id, tool_code, content_hash)`.
- `survey_tool.policy_snapshot_id` en `risk_result_tool.policy_snapshot_id`
  verwijzen nu naar `org_tool_policy_snapshot(id)` (was `org_tool_policy(id)`).
- `risk_result_tool.policy_snapshot_id` is **NOT NULL** geworden.
- `report_exports.policy_snapshot_id` ook omgezet naar de snapshot-tabel.

### 2. Splitsing scoretier en reviewklasse
- `risk_result.assigned_tier` **verwijderd**.
- Nieuwe kolommen op `risk_result`:
  - `score_tier text NOT NULL` — `low | elevated | high | critical`
  - `review_class text NOT NULL DEFAULT 'standard'` — `standard | priority_review | toxic_shadow`
- `risk_result_tool.score_tier_tool` toegevoegd (kwantitatieve tier per tool;
  `review_class` blijft op person-niveau).
- Indexen aangepast: `idx_risk_result_org_score_tier` + `idx_risk_result_org_review_class`.
- Comment in sectie 9 documenteert dat beide assen orthogonaal zijn.

### 3. Versterkte ambassador opt-in validatie
- `validate_ambassador_opt_in()` controleert nu drie regels:
  1. `email` niet leeg (was al aanwezig).
  2. `survey_run.consent_ambassador = true` (was al aanwezig).
  3. **Nieuw:** `NEW.org_id = survey_run.org_id` — cross-tenant lekprotectie
     met expliciete `RAISE EXCEPTION` bij mismatch.
- Extra existence-check: error als `survey_run_id` niet bestaat.

### 4. Productietabellen + materialized view
- **Nieuwe tabel `dpo_review_items`** (sectie 9b):
  - Werkqueue voor de DPO; gevuld door `calculate_v8_score`.
  - Velden: `reason_code`, `review_class`, `trigger_codes`, `priority_score`,
    `status` (open|in_review|resolved|dismissed), `decision_code`,
    `decision_notes`, `assigned_to`, `resolved_by`, `resolved_at`.
  - Unieke `(survey_run_id, reason_code)` voorkomt duplicaten bij rescoring.
- **Nieuwe tabel `audit_events`** (sectie 9c):
  - Append-only generieke audit-log, los van legacy `admin_audit_log`.
  - Trigger `protect_audit_events_immutable` blokkeert UPDATE/DELETE.
  - Privacy-comment: `payload` bevat alleen codes/ids, geen PII.
- **Materialized view `mv_risk_clusters`** (sectie 9d):
  - Bewuste keuze: aggregaat, geen authoritatieve data; refresh handmatig.
  - SQL-comment documenteert dat RLS niet werkt op MV — wrap in SECURITY
    DEFINER view of RPC voor DPO-toegang.
  - Unieke index voor `REFRESH MATERIALIZED VIEW CONCURRENTLY`.

### 5. Privacy-afspraak op `score_breakdown`
- Expliciete comment toegevoegd op `risk_result.score_breakdown` en
  `risk_result_tool.score_breakdown`:
  > Bevat UITSLUITEND codes, numerieke waarden, gewichten en aggregaten.
  > NOOIT vrije tekst, raw_tool_name, email, of direct identificeerbare velden.
  > Vrije-tekstvelden (department_other_text, top_concern_other_text,
  > future_usecases_text, motivation_other_text, ambassador_email)
  > MOGEN HIER NIET IN.
- Zelfde regel geldt voor `audit_events.payload`.

### 6. `calculate_v8_score` skelet bijgewerkt
- Blijft `SECURITY DEFINER` met `search_path = public`.
- Verantwoordelijkheden in commentaar uitgebreid:
  - Per tool: bereken `content_hash`, zoek of insert in
    `org_tool_policy_snapshot`, gebruik die `policy_snapshot_id`.
  - Vul `score_tier` en `review_class` apart (orthogonale escalatie).
  - UPSERT `dpo_review_items` per `(survey_run_id, reason_code)`; obsolete
    open items → `status = 'dismissed'`.
  - INSERT `audit_events` met `event_type='score.calculated'` en payload
    zonder PII.

### 12. RLS-placeholder uitgebreid
- Nieuwe tabellen toegevoegd aan `ENABLE ROW LEVEL SECURITY`-blok:
  `org_tool_policy_snapshot`, `dpo_review_items`, `audit_events`.
- Comments beschrijven het toegangspatroon per nieuwe tabel.

---

## Open punten (resterend)

| # | Onderwerp | Beslissing nodig |
|---|-----------|------------------|
| 1 | **Banding-grenzen** | Concrete numerieke drempels voor `score_tier` (low/elevated/high/critical) — moet uit `scan_scoring_config.config_json` of als kolom op die tabel? |
| 2 | **`review_class`-mapping-tabel** | Moet er een `ref_review_class_rule` komen die trigger_codes → review_class mapt, of blijft die logica binnen `calculate_v8_score`? |
| 3 | **`dpo_review_items.reason_code`** | Aparte `ref_dpo_reason` referentielijst nodig of vrij text-veld met validatie? |
| 4 | **`mv_risk_clusters` toegang** | Wrapper-RPC bouwen (`dpo_risk_clusters_v2(p_org_id)`) of SECURITY DEFINER view? Voorkeur: RPC, consistent met legacy. |
| 5 | **`mv_risk_clusters` refresh** | Cron via `pg_cron` extensie of edge-function-trigger na wave-afsluiting? |
| 6 | **`audit_events` retentie** | Bewaarbeleid (12 / 24 / 60 mnd?) en mechaniek (partitionering, archival-bucket?). |
| 7 | **`org_tool_policy_snapshot.captured_by`** | Bij anonieme respondent INSERT: NULL of system-actor uuid? |
| 8 | **Backfill bij migratie** | Voor bestaande Lovable-rijen: hoe initial snapshots aanmaken (één per (org, tool_code) op moment T0)? |
| 9 | **Rescoring-strategie** | Bij policy-update: rescoring per wave-close, on-demand, of automatisch? Beïnvloedt UPSERT-gedrag in `calculate_v8_score`. |
| 10 | **`dpo_review_items` ↔ legacy `dpo_notifications`** | Migratie-mapping: items uit RouteAI-flow ook hier landen, of blijven die in `dpo_notifications`? |
| 11 | **`tools_library.tool_code` immutability** | Trigger nog te schrijven (gepland in `03_triggers.sql`). |
| 12 | **RLS-policies zelf** | `04_rls_policies.sql` nog te bouwen (expliciet uitgesteld). |

---

## CONCEPT v2 (vorige iteratie)

Korte samenvatting (zie git-history voor detail):
- `report_exports` uitgebreid met audit-/governance-velden, private storage_path.
- `tools_library.tool_code` met backfill-strategie.
- `risk_result(_tool)` uitgebreid met `scoring_config_id`, raw scores, breakdown.
- `ambassador_email` verhuisd naar `survey_run_ambassador_opt_in`.
- `calculate_v8_score` expliciet `SECURITY DEFINER`; client-scoring verboden.
- `scan_scoring_config` versioneerbaar (partial unique index op `is_active`).
- `organizations` + `profiles` als minimale dependency-stubs.
