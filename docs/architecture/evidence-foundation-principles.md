# Evidence Foundation

> Status: canoniek (gepromoveerd uit founder-draft, 2026-07-08) - implementatieconflicten worden beslecht door repo-ADRs en de code zelf.

**Dit document autoriseert geen deployment.** De Evidence Foundation bestaat als gereviewde, gestackte draft-PR in deze repository met een eigen review- en staging-gateproces. Dit document beschrijft de principes; of en wanneer de implementatie live gaat, wordt uitsluitend besloten in dat PR-proces - nooit vanuit architectuurdocumentatie.

**Status:** Canoniek architectuurdocument.  
**Doel:** De append-only bewijslaag definieren die Decisions, versies en rationale auditbaar maakt.  
**Relatie:** Ondersteunt alle domeinen; vooral `shared-domain-model.md`, `model-library-typekaart.md`, `capability-credential-learning.md` en `../adr/architecture-decision-register.md`.

## Kernbesluit

Evidence Foundation is de append-only bewijslaag van RouteAI. Het is tamper-evident, maar geen blockchain.

De laag bestaat conceptueel uit:

- `platform_event_ledger`;
- version pinning;
- decision rationale;
- evidence references;
- actor en timestamp;
- hash/chain-achtige integriteitscontrole waar passend.

## Drie lagen

De Evidence Foundation onderscheidt drie lagen:

- record plane: muteerbare actuele staat;
- evidence plane: append-only vastlegging van wat gebeurde;
- future intelligence plane: afgeleid en herbouwbaar, nooit gemigreerd.

## Wat Evidence is

Evidence is een vastlegging dat een relevante gebeurtenis of beslissing heeft plaatsgevonden. Voorbeelden:

- AIResource ontdekt;
- Typekaart-versie gepubliceerd;
- org_catalog_entry bevestigd;
- UseCase assessment aangemaakt;
- Decision genomen;
- DPO-review uitgevoerd;
- AI-rijbewijs verdiend;
- micro-learning voltooid;
- AISA-sessie gehouden;
- policy of reviewritme aangepast.

Evidence is niet hetzelfde als het Passport. Het Passport is een view/export over Evidence, Decisions en domeindata.

## Version pinning

Elke Decision moet kunnen tonen welke versies golden op het moment van besluitvorming:

- Typekaart-versie;
- beslislogica-versie;
- survey-versie;
- learning module-versie;
- examversie;
- policyversie;
- eventueel model/output-contractversie.

Dit voorkomt dat latere updates oude beslissingen herschrijven.

## Decision rationale

Een Decision zonder rationale is onvoldoende auditbaar. Rationale bevat minimaal:

- waarom deze route/status is gekozen;
- welke input gebruikt is;
- welke onzekerheden golden;
- welke actor of systeem de beslissing nam;
- welke menselijke review nodig was of heeft plaatsgevonden.

## Tamper-evident, niet blockchain

De Evidence Foundation moet manipulatiedetectie ondersteunen. Dat betekent append-only events, immutable snapshots en waar nodig hash chaining of vergelijkbare controles.

Dit is bewust geen blockchain:

- geen token;
- geen distributed ledger;
- geen externe consensuslaag;
- geen marketingclaim over onveranderlijkheid.

Het doel is verdedigbare auditbaarheid, niet cryptografisch spektakel.

## Huidige scope

- Conceptueel eventmodel.
- Append-only als principe.
- Evidence als bron voor Passport, dashboards en audits.
- Version pinning verplicht maken voor governance-relevante Decisions.

## Niet bouwen

- Geen deployment-besluiten vanuit dit document; de bestaande implementatie-PR volgt zijn eigen gates (staging rehearsal, ledger-repair-procedure, expliciete founder-go).
- Geen productie-eventbus.
- Geen blockchain.
- Geen automatische juridische bewijsconclusies.
- Geen mutatie van oude documenten of bestaande databaseschema's.

## Pilot-minimum (SAI)

Deze discipline geldt vanaf dag een voor de SAI-pilot, als procesafspraak en acceptatiecriterium, niet als opdracht om nu nieuwe tabellen te bouwen:

1. DPO-rationale verplicht op elk triage-/reviewbesluit: waarom deze uitkomst, welke input, wie besliste, wanneer. Geen bijzondere persoonsgegevens of derden-PII in rationale-tekst.
2. Versie-stempel op elk besluit: geldende scoring-/beslislogica-versie en survey-versie worden bij het besluit vastgelegd.
3. Minimale eventlijst via het bestaande auditmechanisme: survey voltooid, survey gescoord, DPO-besluit geregistreerd, export gegenereerd.
4. Export-metadata: elke export draagt de gebruikte versies en de verificatiedatum ("Laatste controle"), plus de standaarddisclaimer (geregistreerd != juridisch toegestaan).
5. Immutabele survey-snapshots blijven gegarandeerd.

Kan wachten tot post-pilot: volledige ledger op SAI-paden, hash-chaining voor SAI-events, UseCase-states voorbij disclosed/getrieerd, Typekaart-alles, capability/credential-events aan SAI-zijde en elke nieuwe tabel.

## Open vragen

- Welke eventtypes zijn pilot-minimum?
- Welke events zijn SYSTEM_ONLY?
- Welke evidence mag worden gecorrigeerd via compensating event in plaats van update?
- Welke exports tonen evidence detail versus aggregatie?
