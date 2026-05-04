# New Laptop Handoff

Laatste bijgewerkt: 2026-05-04

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

Let op: `calculate_v8_score(uuid)` is nog een skeleton. Completion werkt, maar scoring zelf moet nog worden ingevuld.

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

5. Volgende bouwfase: Next.js frontend refactor naar de RPC-flow.

## Volgende Ontwikkelstap

De volgende stap is een verticale frontend slice:

1. Next.js/Supabase auth fundament met `@supabase/ssr`.
2. Supabase browser/server clients.
3. Middleware voor sessieverversing.
4. Server-side role helper op basis van `user_roles`.
5. Kleine survey RPC-client:
   - `startSurveyRun`
   - `saveProfile`
   - `saveTool`
   - `saveToolUseCase`
   - `completeSurveyRun`
6. Eén werkende end-to-end flow:
   - wave token invoeren/openen
   - survey run starten
   - profiel opslaan
   - tool opslaan
   - use case/context/account opslaan
   - afronden
   - verifiëren dat token niet meer werkt

Daarna pas alle schermen en dashboardflows aansluiten.

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
We gaan de Next.js frontend bouwen/refactoren naar de veilige Supabase RPC-flow.
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
3. Lees `docs/auth-foundation.md` en `docs/rpc-flow-contract.md`.
4. Maak daarna een korte implementatieplanning voor de verticale slice:
   survey start -> profiel opslaan -> tool opslaan -> use case/context/account opslaan -> afronden.
5. Pas nog niets aan voordat je hebt bevestigd welke app/package de Next.js frontend bevat of moet bevatten.

Belangrijke randvoorwaarden:
- Gebruik `@supabase/ssr` voor Next.js App Router.
- Gebruik geen `service_role` in frontend/client code.
- Gebruik geen directe inserts/updates vanuit anon naar survey-tabellen.
- Bewaar `run_id` en `submission_token` alleen als respondent-flow state; token is na completion ongeldig.
- Scoringfunctie `calculate_v8_score(uuid)` is nog een skeleton; bouw daar niet op alsof scoring al productie-af is.
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

