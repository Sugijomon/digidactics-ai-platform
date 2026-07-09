# SAI Synthetic Pilot Organisatie — ontwerp

Status: local/staging-only testpopulatie-ontwerp voor stap 4/5 van SAI
production-readiness.

**Deze organisatie mag nooit in productie worden aangemaakt.** Ze bestaat
uitsluitend om de echte scan/RPC/scoring-flow en de DPO-dashboards tegen een
realistische, k-anonimiteit-testende populatie te kunnen inspecteren op een
lokale of staging Supabase-instantie. Ze is toegevoegd aan de
"Not allowed in production"-lijst in
[`docs/sai-production-release-checklist.md`](sai-production-release-checklist.md).

```txt
Organization: SAI Synthetic Pilot Organisatie
org_id:       00000000-0000-0000-0000-000000000301
wave_id:      00000000-0000-0000-0000-000000000302
wave token:   sai-synthetic-pilot-wave-token
```

Deze organisatie staat los van de bestaande deterministische
`SAI Smoke Test Organisatie` (`00000000-0000-0000-0000-000000000101`, zie
`docs/database-model.md` en `supabase/README.md`). Die blijft de kleine,
technische smoke-test-org voor RPC/RLS-checks. De synthetische pilot-org is
groter en ontworpen om de dashboards (Tool Inventaris, Risicoprofiel,
Governance, Rapportage, Voortgang) met een geloofwaardige populatie te vullen,
inclusief bewuste outliers en clusters onder `dashboard_min_cell_size`.

Alle survey-resultaattabellen voor deze organisatie worden gevuld via de
echte respondent-RPC-flow (zie
[`docs/sai-synthetic-flow-testplan.md`](sai-synthetic-flow-testplan.md) en
`apps/sai/scripts/synthetic-flow/`), niet via handmatige INSERTs in
`survey_run`, `risk_result`, `dpo_review_items`, etc. Alleen organisatie-,
wave- en toolbeleid-setup (die geen respondent-RPC heeft) gebeurt via een
gemarkeerde local/staging SQL-fixture.

## Organisatiestructuur

8 afdelingsclusters (`ref_department.code`), totaal 53 respondenten. De
standaard `dashboard_min_cell_size` is 5 (zie `docs/database-model.md`).
Twee clusters zitten daar bewust onder om small-cell-suppressie te bewijzen;
de overige zes zitten er ruim boven.

| Afdeling (`department_code`)   | Respondenten | Boven/onder min_cell_size(5) |
|----------------------------------|:---:|:---:|
| `it_data_development`            | 12  | boven |
| `marketing_communicatie`         | 9   | boven |
| `hr_recruitment`                 | 8   | boven |
| `finance_legal`                  | 7   | boven |
| `sales_account`                  | 6   | boven |
| `operations`                     | 6   | boven |
| `directie_management`            | 3   | **onder (bewust)** |
| `anders`                         | 2   | **onder (bewust)** |
| **Totaal**                       | **53** | |

## Rolverdeling (dashboard-toegang)

De 53 respondenten zijn anonieme `survey_run`-sessies (token-based, geen
login) — dat is precies hoe de echte scanflow werkt en blijft ongewijzigd.
Alleen dashboard-gebruikers hebben een echte Supabase Auth account +
`public.user_roles`-rij:

| Rol | Aantal accounts | Doel |
|---|:---:|---|
| `dpo` | 1 | Primaire DPO-dashboardgebruiker voor deze org. |
| `org_admin` | 1 | RouteAI-stijl org-eigenaar, om te bevestigen dat org_admin dezelfde dashboarddata ziet als dpo (zie `docs/domain-decisions.md`, "SAI DPO Role Bridges To RouteAI Organization Administration"). |

Zie [`docs/sai-rls-smoke-runbook.md`](sai-rls-smoke-runbook.md) voor hoe je
deze accounts aanmaakt en aan `user_roles` koppelt — hetzelfde patroon, maar
dan gekoppeld aan `org_id = 00000000-0000-0000-0000-000000000301`.

## Outliers en waarom ze erin zitten

Outliers zijn er om te bewijzen dat de risk-engine en de dashboards
onderscheid maken tussen "veel gebruik" en "risicovol gebruik", en om de
review-triggers uit `calculate_v8_score` (zie
`supabase/migrations/20260528143000_repair_v8_scoring_parity.sql`) minstens
één keer elk te activeren:

- **Onbekende tool + privé-account** (`it_data_development`) — bewijst dat
  shadow-status `newly_discovered` samen met een `personal_free` account tot
  `priority_review` kan leiden zonder dat de tool "verboden" is
  (`org_policy_status` blijft los van EU AI Act-signalen, zie
  `docs/domain-decisions.md`).
- **Agentic/automation-outlier** (`it_data_development`) — bewijst dat
  agentic gedrag (`automation_usage_code = agents_reeks_taken`) een
  additieve exposure-boost én een reviewtrigger is, óók op een *goedgekeurde*
  tool. Dit isoleert het gedragssignaal van het tool-beleidssignaal.
- **Restricted/prohibited tool met hoge exposure** (`finance_legal`) —
  bewijst `toxic_shadow`: een verboden tool + kritieke systeem-context +
  privé-account triggert zowel de `prohibited_tool`-trigger als
  `person_score >= 75`.
- **HR/evaluatie-context-outlier** (`hr_recruitment`) — bewijst dat de
  `hr_evaluation_context`-trigger op zichzelf al tot `priority_review` leidt,
  ook bij een verder laag-scorende, goedgekeurde tool. Relevant voor
  EU AI Act Annex III-achtige "besluiten over personen"-gevoeligheid.
- **Kleine clusters** (`directie_management`, `anders`) — bewijst dat
  `dashboard_min_cell_size` clusters van 3 en 2 respondenten onderdrukt in
  Tool Inventaris, de risicomatrix en de review-queue, ongeacht hun
  individuele risiconiveau.

## Persona → scenario-mapping

Elke persona hieronder komt overeen met een scenario uit
[`docs/sai-synthetic-flow-testplan.md`](sai-synthetic-flow-testplan.md) en
wordt daar met exacte antwoorden en verwachte scores uitgewerkt.

| # | Persona | Afdeling | Aantal | Testplan-scenario |
|---|---|---|:---:|---|
| 1 | Geen AI-gebruiker | `marketing_communicatie` (2), `sales_account` (2), `operations` (2) | 6 | Scenario 1 — geen AI-gebruik |
| 2 | Marketing/communicatiemedewerker met goedgekeurde schrijfassistent | `marketing_communicatie` | 7 | Scenario 2 — goedgekeurde tool, laag risico |
| 3 | HR-medewerker die klantenservicetool met bijzondere persoonsgegevens gebruikt | `hr_recruitment` | 4 | Scenario 3 — goedgekeurde tool + gevoelige data |
| 4 | IT'er die een onbekende schrijfassistent op een privéaccount test | `it_data_development` | 4 | Scenario 4 — onbekende tool, privéaccount |
| 5 | Finance-medewerker die een verboden agentic tool op kritieke systemen gebruikt | `finance_legal` | 2 | Scenario 5 — restricted/prohibited tool, hoge exposure |
| 6 | IT/ops-medewerker met agentic workflow-automatisering op een goedgekeurd platform | `it_data_development` | 3 | Scenario 6 — agentic/automation-outlier |
| 7 | HR-medewerker die een goedgekeurde analysetool voor personeelsevaluatie gebruikt | `hr_recruitment` | 2 | Scenario 7 — HR/evaluatie-context-outlier |
| 8a | Directie — laag-risicogebruik, kleine cluster | `directie_management` | 3 | Scenario 8a — kleine cluster (directie) |
| 8b | "Anders"-afdeling — laag-risicogebruik, kleine cluster | `anders` | 2 | Scenario 8b — kleine cluster (anders) |
| filler | Generiek laag-risicogebruik ter opvulling van de cluster | `it_data_development` (5), `finance_legal` (5), `hr_recruitment` (2), `sales_account` (4), `operations` (4) | 20 | Scenario 2-patroon (herbruikt) |

Som: 6 + 7 + 4 + 4 + 2 + 3 + 2 + 3 + 2 + 20 = 53. De filler-rijen zijn
expliciet opgenomen in `apps/sai/scripts/synthetic-flow/src/scenarios.ts`,
zodat de dry-run van `--scenario all` ook daadwerkelijk 53 `survey_run` rows
plant.

## Wat dit ontwerp niet is

- Geen productie-organisatie, geen echte medewerkers, geen echte e-mails.
- Geen vervanging voor een echt pilot-rondje — zie
  `docs/sai-production-release-checklist.md` sectie 8/9 voor de eisen aan een
  echte staging-pilotrun.
- Geen `RAI`/RouteAI-scope-uitbreiding — de personas gebruiken uitsluitend
  bestaande SAI-scanvelden en bestaande referentiecodes uit
  `supabase/seed/20260505_v8_1_reference_seed.sql`.
