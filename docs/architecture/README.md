# Architecture Canon

> Status: canoniek (gepromoveerd uit founder-draft, 2026-07-08) - implementatieconflicten worden beslecht door repo-ADRs en de code zelf.

Deze map bevat de canonieke product- en informatiearchitectuur voor Digidactics, SAI/Shadow AI Scan en RouteAI. Desktopdocumenten en losse founder-drafts zijn werkcontext totdat hun inhoud hier is gepromoveerd.

## Kernrichting

RouteAI wordt beschreven als een gedeeld domeinmodel met meerdere workflows/views. Shadow AI Scan, RouteAI, Learning en AISA zijn geen losse datamodellen. Ze lezen en schrijven naar dezelfde conceptuele kern:

- Organization
- Actor
- AIResource
- UseCase
- Capability
- Credential
- Decision
- Evidence

Shadow AI Scan is intake/discovery. RouteAI is governance, lifecycle, decisioning en evidence. Learning levert capability/credential delivery. AISA levert menselijke/teamgerichte evidence-input, maar schrijft nooit zelf governance-state.

## Documentkaart

| Document | Functie |
|---|---|
| `shared-domain-model.md` | Canoniek domeinmodel en entiteiten |
| `product-map.md` | Producten als workflows/views over hetzelfde model |
| `evidence-foundation-principles.md` | Evidence Foundation principes, deployment-disclaimer en SAI pilot-minimum |
| `model-library-typekaart.md` | AIResource, Typekaart, org-catalogus en signal inbox |
| `capability-credential-learning.md` | Capability, Credential, Learning en AISA-interventies |
| `../adr/architecture-decision-register.md` | N-genummerde productarchitectuurbesluiten |
| `../roadmap/agentic-governance.md` | Agentic governance als future roadmap |
| `../roadmap/ai-rijbewijs-voor-agents.md` | Roadmap-reference voor agent credentials |
| `../reference/architecture-review-2026-07.md` | Gecombineerde review en acceptatierecord |

## Huidige scope

De huidige architectuurscope is conceptueel en product-architectonisch:

- gedeeld domeinmodel vastleggen;
- productgrenzen verduidelijken;
- Evidence Foundation positioneren;
- Model Library / Typekaart herformuleren rond AIResource;
- Learning, credential en capability als gedeelde laag beschrijven;
- agentic governance voorbereiden zonder te bouwen.

## Niet bouwen vanuit deze set

Deze map is geen live implementatieplan. Bouw hieruit nu niet:

- live Supabase migraties;
- productie-databasewijzigingen;
- agent identities, delegation of agent credentials;
- blockchain of tokenized evidence;
- automatische legal/compliance goedkeuring;
- technische enforcement zoals proxy, netwerkblokkade of browsermonitoring;
- aparte datamodellen per productlijn.

Deze canon vervangt de eerdere `docs/platform-information-architecture-gap.md` wanneer die via een aparte PR arriveert; die note is historische brug, geen canon.

## Rangorde

Repo-ADRs en de code zelf beslechten implementatieconflicten. Deze architectuurcanon beslecht productarchitectuur. Bij twijfel wordt het conflict zichtbaar gemaakt en niet stil opgelost.
