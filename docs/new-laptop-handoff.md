# New Laptop Handoff

Laatste bijgewerkt: 2026-05-22

Dit document beschrijft hoe je op een nieuwe laptop verdergaat met de Digidactics AI Platform / Shadow AI Scan V8.1 repo.

## Bron Van Waarheid

Gebruik GitHub als bron van waarheid. De actuele projectset staat lokaal op de oude laptop in:

`C:\Users\Gebruiker\Documents\New project\digidactics-ai-platform`

Zorg dat deze map eerst volledig is gecommit en gepusht voordat je op de nieuwe laptop verdergaat.

## Wat Nu In De Repo Staat

Belangrijke projectcontext:

- `docs/` - actieve projectdocumentatie, architectuur, auth, RPC-flow en bouwplan.
- `supabase/migrations/` - toegepaste/voorbereide V8.1 schema-, RLS- en RPC-migrations.
- `supabase/seed/` - smoke-test seed data.
- `supabase/smoke-tests/` - SQL smoke tests voor de RPC-flow.
- `design-html/sai/survey/` - survey HTML-designs.
- `design-html/sai/dashboard/` - dashboard HTML-pagina's en referentiepagina's.
- `references/project-register/` - Excel-overzicht met alle projectdocumenten.
- `references/source-docs/sai/` - bronmateriaal zoals methodologie, Lovable export, target schema, RLS-referenties, validatie en DPO-documentatie.

Startpunten:

- `docs/README.md`
- `docs/auth-foundation.md`
- `docs/rpc-flow-contract.md`
- `docs/survey-flow-spec.md`
- `references/source-docs/sai/README.md`
- `supabase/README.md`

## Live Supabase Status

Supabase project:

- Naam: `SAI & RAI database`
- Project ref: `cfloqagsqwtrtkxdikec`
- Regio: `eu-central-1`
- Status op 2026-05-04: actief en smoke-tested

Migrations toegepast op Supabase:

- `v8_1_core_schema_baseline`
- `v8_1_pgcrypto_compat_wrappers`
- `v8_1_rls_policies_v2_1_runtime`
- `v8_1_edge_rpcs`

Belangrijk gedrag dat getest is:

- `anon` kan `start_survey_run(wave_token)` aanroepen.
- Respondent schrijft via RPC's, niet direct naar tabellen.
- `complete_survey_run(run_id, token)` sluit de run af.
- `submission_token` wordt na completion opgebrand.
- Hergebruik van token faalt met `invalid_token_or_run_closed`.
- Ambassador opt-in zet `survey_run.consent_ambassador = true`.
- `complete_survey_run(run_id, token)` schrijft via `calculate_v8_score(...)`
  run- en toolniveau score-output naar `risk_result` en `risk_result_tool`.
- DPO/admin dashboards lezen organisatiebrede score- en toolpatronen via RLS,
  zonder individuele respondentidentiteiten te tonen.

Let op: oudere lokale of referentiedocumenten kunnen nog naar een
`calculate_v8_score` skeleton verwijzen. In deze repo is de functie inmiddels
geimplementeerd in `supabase/migrations/20260522100000_implement_v8_scoring.sql`.

## Aanpak Op Nieuwe Laptop

1. Clone of pull de repo.

   ```powershell
   cd "C:\Users\Gebruiker\Documents\New project"
   git clone <github-repo-url> digidactics-ai-platform
   cd digidactics-ai-platform
   ```

   Als de repo al bestaat:

   ```powershell
   cd "C:\pad\naar\digidactics-ai-platform"
   git pull
   ```

2. Controleer de projectstructuur.

   ```powershell
   git status
   Get-ChildItem
   ```

3. Controleer of de Supabase connector in Codex beschikbaar is.

   Vraag Codex op de nieuwe laptop:

   ```text
   Kun je Supabase project cfloqagsqwtrtkxdikec openen en de migration history tonen?
   ```

   Verwachte migrations:

   - `v8_1_core_schema_baseline`
   - `v8_1_pgcrypto_compat_wrappers`
   - `v8_1_rls_policies_v2_1_runtime`
   - `v8_1_edge_rpcs`

4. Start niet met databasewijzigingen voordat Codex de live migration history heeft bevestigd.

5. Volgende bouwfase: preview/staging-validatie met echte Supabase env vars en
   DPO-testgebruikers.

## Volgende Ontwikkelstap

De verticale frontend slice bestaat inmiddels. De volgende stap is
pilot-hardening op een echte preview/staging omgeving:

1. Configureer GitHub/Vercel/Supabase public frontend env vars.
2. Deploy SAI preview vanuit `apps/sai`.
3. Doorloop de respondentflow met een pilot wave token.
4. Controleer dat `risk_result`, `risk_result_tool`, `dpo_review_items` en
   audit-events worden gevuld.
5. Log in als DPO/admin en controleer `/dashboard/activatie`,
   `/dashboard/tools` en `/dashboard/risicoprofiel`.
6. Controleer dat kleine clusters worden onderdrukt volgens
   `dashboard_min_cell_size`.

## Codex Startup Prompt Voor Nieuwe Laptop

Gebruik onderstaande prompt in Codex op de nieuwe laptop.

```text
Je werkt in de repo:

C:\Users\Gebruiker\Documents\New project\digidactics-ai-platform

Context:
- Dit is het Digidactics AI Platform met Shadow AI Scan V8.1.
- GitHub is de bron van waarheid; werk niet buiten de repo tenzij expliciet nodig.
- Supabase project is `SAI & RAI database`, ref `cfloqagsqwtrtkxdikec`, regio `eu-central-1`.
- De V8.1 databasebasis, RLS/token lifecycle en respondent RPC-laag zijn al toegepast en smoke-tested.
- Belangrijke docs:
  - docs/README.md
  - docs/auth-foundation.md
  - docs/rpc-flow-contract.md
  - docs/survey-flow-spec.md
  - docs/new-laptop-handoff.md
  - supabase/README.md
  - references/source-docs/sai/README.md
- Belangrijke bronbestanden:
  - references/source-docs/sai/methodology/Shadow_AI_Scan_Scoring_V8_1.md
  - references/source-docs/sai/methodology/SAI_V8_1_scoring_config.json
  - design-html/sai/survey/
  - design-html/sai/dashboard/
  - supabase/migrations/

Doel:
We gaan de SAI preview/staging flow valideren op de veilige Supabase RPC-flow.
Anonieme respondenten mogen niet direct naar tabellen schrijven. Alles loopt via RPC's:
- start_survey_run
- save_profile
- save_motivations
- save_data_types
- save_concerns
- save_support_needs
- save_tool_preference_reasons
- save_tool
- save_tool_use_case / save_tool_use_cases
- save_tool_use_case_context
- save_tool_account
- register_tool_discovery
- complete_survey_run

Eerste opdracht:
1. Inspecteer eerst de repo-structuur, package files en bestaande app/Next.js setup.
2. Controleer via Supabase connector de live migration history van project `cfloqagsqwtrtkxdikec`.
3. Lees `docs/deployment-preview.md`, `docs/rpc-flow-contract.md` en `docs/risk-engine-spec.md`.
4. Controleer dat de SAI CI workflow groen is.
5. Maak daarna een korte validatieplanning voor:
   survey start -> profiel opslaan -> tool opslaan -> use case/context/account opslaan -> afronden -> DPO dashboard check.

Belangrijke randvoorwaarden:
- Gebruik `@supabase/ssr` voor Next.js App Router.
- Gebruik geen `service_role` in frontend/client code.
- Gebruik geen directe inserts/updates vanuit anon naar survey-tabellen.
- Bewaar `run_id` en `submission_token` alleen als respondent-flow state; token is na completion ongeldig.
- Scoringfunctie `calculate_v8_score(uuid)` is geimplementeerd. Houd wijzigingen
  in sync met `packages/domain/src/risk-engine.ts`, `docs/risk-engine-spec.md`
  en de Supabase migraties.
- Houd bronmateriaal in `references/` read-only; actieve besluiten horen in `docs/`.
```

## Checklist Voor De Oude Laptop

Voordat je definitief overstapt:

- `git status` controleren.
- Alle gewenste bestanden stagen.
- Commit maken met duidelijke boodschap.
- Push naar GitHub.
- Op nieuwe laptop `git pull` draaien.
- In Codex op nieuwe laptop bovenstaande startup prompt gebruiken.
