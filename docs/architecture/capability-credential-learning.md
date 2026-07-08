# Capability, Credential en Learning

> Status: canoniek (gepromoveerd uit founder-draft, 2026-07-08) - implementatieconflicten worden beslecht door repo-ADRs en de code zelf.

**Status:** Canoniek.  
**Doel:** Learning, AI-rijbewijs, micro-learning en AISA verbinden met Capability en Credential.  
**Relatie:** Bouwt op `shared-domain-model.md`; levert input aan `product-map.md` en `evidence-foundation-principles.md`.

## Kernbesluit

Learning levert capabilities en credentials. Het is geen losse LMS-silo. AISA versnelt capabilityontwikkeling via menselijke/teaminterventies. Credentials leveren bewijs, maar geven niet automatisch toestemming voor elke use-case.

Eigenaarschap: credentials en gates zijn platformbezit (Capability-context); Learning rendert en levert. Vandaag wonen assessment-inhoud en examen fysiek in Learning-content, en dat blijft zo tot de post-pilot extractie (item-bank). Nieuwe koppelingen worden intussen in de eigenaarschapstaal gebouwd, niet andersom.

## Capability

Capability beschrijft wat een Actor aantoonbaar begrijpt of kan toepassen. Voorbeelden:

- basis AI-literacy;
- prompt/context engineering;
- verantwoord gebruik van persoonsgegevens;
- human-in-the-loop uitvoering;
- HR-AI oversight;
- teamafspraken rond AI-workflows.

Capability kan ontstaan uit online learning, micro-learning, examen, AISA-sessie, praktijkopdracht of DPO-bevestigde interventie.

## Credential

Een Credential is formeel bewijs binnen het systeem. Het AI-rijbewijs blijft de belangrijkste huidige credential:

- intern;
- auditeerbaar;
- gekoppeld aan examversie;
- niet handmatig toegekend;
- geen extern diploma;
- geen algemene toestemming voor alle AI-gebruik.

Credential evidence moet verwijzen naar actor, examversie, timestamp, organisatiebeleid en eventuele herexamenstatus.

## Micro-learning

Micro-learnings zijn contextuele gedragsinstructies. Ze zijn geen credential. Ze kunnen wel Evidence opleveren dat een Actor specifieke instructies kreeg bij een UseCase.

Voor Oranje/hoog-risico routes blijft het oude principe bruikbaar: voltooiing van relevante micro-learning en DPO-review kunnen samen een activatievoorwaarde vormen. Dit is governance rond een UseCase, geen nieuw diploma.

## Learning Library

De oude documenten over `lessons`, `learning_library`, `archetype_ml_map` en `assessment_ml_completions` blijven nuttige bron. In de nieuwe taal:

- `lessons` = contentdrager;
- `learning_library` = catalogus van learning resources;
- mapping naar archetypes = Capability-interventie;
- completion = Evidence;
- examen = Credential-event.

## AISA

AISA is een interventielaag. Het versnelt capability in teams via workshops, sprints, social learning en praktijkopdrachten. AISA-output kan Evidence worden wanneer zij concreet en herleidbaar is:

- sessie gehouden;
- teamafspraak vastgesteld;
- use-case geoefend;
- oversightproces ontworpen;
- HR compliance checklist doorlopen;
- deelnemer of team behaalt capability milestone.

AISA is niet de bron van governancebesluiten. RouteAI blijft de plaats waar Decisions en Evidence canoniek samenkomen.

## Huidige scope

- AI-rijbewijs als interne credential.
- Micro-learning als gedragsinstructie.
- Capability als verbindende laag tussen Learning en AISA.
- Evidence voor completion, credential en interventie.

## Niet bouwen

- Geen externe certificering claimen.
- Geen vaste vervaldatum voor credentials zonder organisatiebesluit.
- Geen Geel/Oranje licenties bovenop het rijbewijs.
- Geen automatische use-case toestemming op basis van capability level.
- Geen agent-credentialing in huidige scope.

## Open vragen

- Welke AISA-output wordt gestandaardiseerd als Capability Evidence?
- Welke capability levels zijn nodig voor pilot, en welke zijn alleen post-pilot?
- Wanneer vereist een changed policy herexamen versus micro-learning update?
