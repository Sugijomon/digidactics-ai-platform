# Model Library en Typekaart

> Status: canoniek (gepromoveerd uit founder-draft, 2026-07-08) - implementatieconflicten worden beslecht door repo-ADRs en de code zelf.

**Status:** Canoniek herzieningsdocument.  
**Doel:** De oude Model Library / Typekaart architectuur herformuleren rond AIResource, immutable versies en org-level catalogusaggregaten.  
**Relatie:** Gebruikt `shared-domain-model.md` en `evidence-foundation-principles.md`.

## Kernbesluiten

1. AIResource is de kernentiteit, niet "tool" of alleen "model".
2. Typekaart-versies zijn immutable rows.
3. Signal inbox verzamelt detecties en wijzigingssignalen.
4. `org_catalog_entry` is een echte organization-level aggregate.
5. Automatische detectie is toegestaan als signaal, maar gevoelige wijzigingen vereisen human-in-the-loop legal/compliance review.

ADR-N03 is een taal- en toekomstschema-besluit. Het is geen opdracht om bestaande tabellen, kolommen of code te hernoemen. Live en live-adjacente structuren (waaronder de SAI-tabellen) blijven ongewijzigd tot een aparte, post-pilot implementatiespecificatie.

Granulariteit: identiteit (model/resource), versie (typekaart-versie, immutabel) en org-adoptie (org_catalog_entry). Een deployment-variant is een versie-attribuut, geen eigen identiteit.

## AIResource

Een AIResource kan zijn:

- model;
- SaaS AI-tool;
- AI-platform;
- deployment-variant;
- interne applicatie;
- workflow;
- toekomstige agent.

AIResource beschrijft wat technisch of functioneel beschikbaar is. UseCase beschrijft wat de organisatie ermee doet. Risico blijft primair use-case-gebonden.

## Typekaart als versieobject

De Typekaart blijft de gelaagde weergave van AIResource-eigenschappen: standaard view, DPO/CISO deep dive en medewerker-light view.

Nieuw canoniek principe: een Typekaart-update overschrijft geen bestaande Typekaart. Elke gepubliceerde versie is een immutable row. Nieuwe informatie leidt tot een nieuwe versie met:

- version id;
- source set;
- rationale;
- reviewer;
- change class;
- published_at;
- previous_version reference.

MAJOR/MINOR/PATCH blijft bruikbaar als wijzigingsclassificatie, maar mag oude decisions niet herschrijven.

## Signal inbox

De oude adapter-architectuur wordt herijkt als signal inbox. Bronnen zoals vendor cards, EU AI Office signalen, FMTI, RSS, licentiediffs en handmatige meldingen leveren signalen op.

Een signaal is nog geen Typekaart-update. Het is input voor triage:

- auto-low-risk signal;
- curator review;
- legal/compliance HITL review;
- reject/ignore met rationale.

## org_catalog_entry

De org-catalogus is geen simpele join tussen Organization en Typekaart. Het is een aggregate waarin de organisatie een eigen besluit vastlegt:

- welke AIResource is toegestaan of afgewezen;
- onder welke voorwaarden;
- op basis van welke Typekaart-versie;
- welke overrides of restricties gelden;
- wie heeft bevestigd;
- welke Evidence hoort erbij.

Een `org_catalog_entry` verwijst naar een immutable Typekaart-versie. Bij een MAJOR update ontstaat een herbevestigingsvraag, geen stille mutatie.

## Automatische detectie en HITL

Automatische detectie mag helpen bij:

- nieuwe AIResource kandidaten;
- vendor/licentie signalen;
- mogelijke catalogusgaten;
- update-prioritering.

Maar gevoelige wijzigingen vereisen menselijke review, vooral:

- wettelijke of contractuele restricties;
- juridisch dragende bronconflicten, die nooit automatisch worden geresolved of gewogen; beide signalen gaan naar review en een mens publiceert met rationale;
- datasoevereiniteit;
- systemisch risico;
- HR/onderwijs/biometrie;
- provider/deployer grensgebied;
- claims richting klanten of auditors.

## Huidige scope

- Herzien conceptueel model.
- AIResource als kern.
- Immutable Typekaart-versies.
- Signal inbox en org_catalog_entry positioneren.

## SAI touchpoint

De koppeling van survey-toolnamen aan AIResources is een suggestie-relatie, geen harde verwijzing. Survey-vocabulaire blijft achter de intake-grens en wordt pas governance-taal via een expliciete Decision.

## Niet bouwen

- Geen Supabase migratie.
- Geen live adapter.
- Geen automatische legal approval.
- Geen blokkade van medewerkergebruik puur op basis van GPAI-status.
- Geen retroactieve wijziging van oude assessments.

## Open vragen

- Welke Typekaart-velden zijn verplicht voor pilot?
- Welke signalen mogen auto-publish en welke altijd HITL?
- Hoe wordt een org_catalog_entry gesloten, vervangen of herbevestigd?
