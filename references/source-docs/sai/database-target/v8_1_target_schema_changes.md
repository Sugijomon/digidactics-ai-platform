# Changelog — `v8_1_target_schema.sql` v1 → v2

Datum: 2026-05-04
Bron: 7 beslissingen na review v1.

---

## 1. `report_exports` — uitgebreid voor private Storage + audit

**Wijziging:** `storage_path` is nu de bron voor downloads (private bucket); er
wordt geen publieke URL bewaard. Bestand wordt geserveerd via signed URL.

**Toegevoegde velden:**

| Veld | Type | Doel |
|---|---|---|
| `scoring_config_id` | uuid FK | bevriest gebruikte scoring-versie |
| `policy_snapshot_id` | uuid FK | beleidscontext op exportmoment |
| `view_or_query_version` | text | bv. `dpo_risk_clusters@v1.2` |
| `trigger_codes_used` | text[] | filterbasis voor reproductie |
| `min_cell_size` | int | k toegepast bij genereren |
| `suppressed_cell_count` | int | hoeveel cellen onderdrukt < k |
| `export_status` | text | `pending|generating|ready|failed|expired|deleted` |
| `retention_until` | timestamptz | bewaarbeleid (≥ `expires_at`) |
| `expires_at` | timestamptz | TTL signed URL |
| `deleted_at` | timestamptz | soft delete na retentie |

Indexen toegevoegd op `(org_id, export_status)` en op `retention_until` (voor
retentie-cleanup-jobs).

---

## 2. `tools_library.tool_code` — backfill-strategie als comment

`tool_code` blijft naast UUID staan. Comment in schema beschrijft nu expliciet:

- `slugify(name)`: lowercase, NFKD, accenten strippen, niet-alfanumeriek → `-`,
  herhaalde `-` collapsen, trim.
- Collisions: suffix `-2`, `-3`, …
- IMMUTABLE na eerste gebruik in `survey_tool` / `org_tool_policy` /
  `risk_result_tool`. Aparte `03_triggers.sql`-regel blokkeert wijziging als er
  verwijzende rijen bestaan.
- `name`-wijziging beïnvloedt `tool_code` nooit.

---

## 3. `risk_result` & `risk_result_tool` — uitgebreid

Persistent gehouden (Optie A), maar uitgebreid met volledige audit-context.

**`risk_result` toegevoegd:**

- `scoring_config_id` (FK, NOT NULL)
- `priority_score_raw` — vóór banding/cap
- `assigned_tier` herzien naar V8.1 banding: `standard | priority_review | toxic_shadow`
- `review_threshold` — snapshot uit config
- `min_cell_size` — snapshot k-anonimiteit
- `dpo_review_required` boolean (+ partial index)
- `score_breakdown` jsonb (was leeg, nu verplicht)

**`risk_result_tool` toegevoegd:**

- `scoring_config_id` (FK, NOT NULL)
- `policy_snapshot_id` (FK naar `org_tool_policy`) — bevriest beleidscontext
  per tool ten tijde van scoren (kan afwijken van `survey_tool` snapshot bij
  herscoring).
- `raw_exposure_score` — vóór amplifier-cap
- `priority_score_raw` — vóór banding
- `score_breakdown` jsonb

---

## 4. PII verplaatst naar `survey_run_ambassador_opt_in`

`ambassador_email` is uit `survey_run` verwijderd. Boolean
`consent_ambassador` blijft (geen PII).

Nieuwe tabel `survey_run_ambassador_opt_in`:

| Veld | Type |
|---|---|
| `survey_run_id` | uuid PK FK |
| `org_id` | uuid FK |
| `email` | text NOT NULL |
| `consent_given_at` | timestamptz |
| `created_at` | timestamptz |

Trigger `validate_ambassador_opt_in`: verplicht non-empty email + checkt dat
`survey_run.consent_ambassador = true`.

RLS placeholder: alleen `super_admin` + `org_admin/dpo` voor eigen org. Geen
respondent-SELECT na insert (write-once via edge function).

---

## 5. Scoring server-side — `calculate_v8_score` als enige bron

- Function expliciet `SECURITY DEFINER`, `SET search_path = public`.
- `REVOKE ALL ... FROM PUBLIC` opgenomen.
- Comment: client-side scoring is in V8.1 niet toegestaan voor productie.
- Sectie 9 + sectie 12 verwijzen ernaar: directe INSERT/UPDATE op
  `risk_result(_tool)` wordt door RLS geblokkeerd.

---

## 6. `scan_scoring_config` versioneerbaar gemaakt

**Verwijderd:** `org_id UNIQUE`, `weights jsonb`, `thresholds jsonb`.

**Toegevoegd:**

- `scoring_config_key` (bv. `default`, `pilot-2026q2`)
- `methodology_version` (bv. `v8.1.0`)
- `config_json` jsonb (weights + thresholds + banding samen)
- `effective_from`, `effective_to`
- `is_active` boolean
- `created_by` uuid (profiles.id)
- Behoud: `dashboard_min_cell_size`

**Constraints:**

- `CREATE UNIQUE INDEX ... WHERE is_active = true` → max één actief per org.
- Index op `(org_id, effective_from DESC)` voor history-lookups.

---

## 7. `organizations` & `profiles` als minimale dependency-stubs

Toegevoegd in nieuwe sectie **0b** met `CREATE TABLE IF NOT EXISTS`. Idempotent
in een lege database, raakt bestaande Lovable-tabel niet aan.

Alle FK's naar `organizations(id)` en (waar relevant) `profiles.id` zijn nu
expliciet gemaakt (`org_tool_policy`, `scan_wave`, `scan_scoring_config`,
`survey_run`, `survey_run_ambassador_opt_in`, `tool_catalog_discovery`,
`risk_result`, `risk_result_tool`, `report_exports`).

Updated_at triggers toegevoegd voor beide stub-tabellen.

---

## Resterende open punten

1. **`policy_snapshot_id` invul-strategie bij rescoring**
   Bij eerste score = identiek aan `survey_tool.policy_snapshot_id`. Bij
   rescoring na policy-update: bevriezen of refresh? Gedrag moet uit
   `scan_scoring_config.config_json` komen — nog niet gespecificeerd.

2. **`tool_code` backfill-trigger**
   Trigger die wijziging blokkeert wanneer er verwijzende rijen bestaan moet
   nog geschreven worden in `03_triggers.sql`.

3. **Storage bucket-naam + retention default**
   `storage_path` veronderstelt een bucket (voorstel: `report-exports`,
   private). Default `retention_until` (12 mnd?) en `expires_at` (signed URL
   geldigheid: 7 dagen?) nog vast te leggen.

4. **`report_exports.export_status` lifecycle-trigger**
   Cron/edge-function ontwerp voor `expired` → `deleted` (object verwijderen
   uit Storage, `deleted_at` zetten) ontbreekt.

5. **`calculate_v8_score` implementatie**
   Body is skelet. Volledige port van `v8ScoreEngine.ts` naar plpgsql is een
   apart traject. Tot dan blijft client-side scoring de feitelijke bron — RLS
   die directe writes blokkeert mag pas worden geactiveerd zodra de function
   bruikbaar is.

6. **RLS policies voor `survey_run_ambassador_opt_in`**
   Placeholder-comment is geschreven; concrete `CREATE POLICY` statements
   horen in `04_rls_policies.sql`.

7. **`assigned_tier` codelijst**
   `standard | priority_review | toxic_shadow` is hardcoded string. Eventueel
   verplaatsen naar `ref_assigned_tier` voor labels + sort_order.

8. **`scoring_config_key` uniekheid**
   Geen uniqueness afgedwongen op `(org_id, scoring_config_key, methodology_version)`
   — bewust opengelaten zodat dezelfde key meerdere historische rijen kan
   hebben. Bevestigen of dit klopt.

9. **`profiles.id` zonder FK naar `auth.users`**
   Conform projectconventie. Documenteer in DPIA dat orphaning kan ontstaan
   bij verwijdering uit `auth.users` zonder profiel-cleanup.

10. **Privacy review op `score_breakdown` jsonb**
    Breakdown kan ruwe codes bevatten die met andere kolommen herleidbaar zijn
    naar individu. Geen vrije tekst opnemen in breakdown.
