# Decision register

> Status: canoniek (gepromoveerd uit founder-draft, 2026-07-08) - implementatieconflicten worden beslecht door repo-ADRs en de code zelf.

**Status:** Canoniek besluitregister voor de nieuwe architectuurset.  
**Doel:** Vastleggen welke kernbesluiten nu leidend zijn.  
**Relatie:** Ondersteunt de architectuurcanon in `../architecture/` en de roadmapnotities in `../roadmap/`.

Rangorde: repo-ADRs (`ADR-EF-*` en opvolgers) en de code zelf beslechten implementatieconflicten; dit register beslecht productarchitectuur. Bij conflict over implementatie wint de repo.

## Canonieke besluiten

| ID | Besluit | Rationale | Status |
|---|---|---|---|
| ADR-N01 | RouteAI gebruikt een gedeeld domeinmodel. | Voorkomt product-silo's en dubbele waarheid. | Canoniek |
| ADR-N02 | SAI, RAI, Learning en AISA zijn workflows/views over hetzelfde model. | Producten verschillen in workflow, niet in kernentiteiten. | Canoniek |
| ADR-N03 | AIResource vervangt "Tool" als kernbegrip. | AI kan model, platform, workflow, interne app of later agent zijn. | Canoniek |
| ADR-N04 | Risico zit primair in UseCase-context, niet in AIResource-labels. | GPAI/toolstatus informeert, maar bepaalt niet automatisch de route. | Canoniek |
| ADR-N05 | Evidence Foundation is append-only en tamper-evident, niet blockchain. | Auditbaarheid zonder overengineering of marketingclaim. | Canoniek |
| ADR-N06 | Passport is een view/export, niet de bronlaag. | Evidence en Decisions moeten onder het Passport liggen. | Canoniek |
| ADR-N07 | Typekaart-versies zijn immutable rows. | Oude Decisions moeten reproduceerbaar blijven na updates. | Canoniek |
| ADR-N08 | Signal inbox scheidt detectie van publicatie. | Automatische signalen zijn geen compliancebesluiten. | Canoniek |
| ADR-N09 | org_catalog_entry is een echte org-level aggregate. | Organisaties nemen eigen besluiten op basis van Typekaart-versies. | Canoniek |
| ADR-N10 | Gevoelige AIResource/Typekaart wijzigingen vereisen HITL legal/compliance review. | Automatische detectie mag gevoelige governance niet vervangen. | Canoniek |
| ADR-N11 | AI-rijbewijs is interne Credential, geen externe certificering. | Auditwaarde komt uit bewijs, versie en governance-integratie. | Canoniek |
| ADR-N12 | Micro-learning is gedragsinstructie, geen Credential. | Voorkomt extra schijnlicenties en houdt governance schaalbaar. | Canoniek |
| ADR-N13 | AISA is capability-interventie, geen aparte governancebron. | Menselijke interventies leveren Evidence/Capability input voor RouteAI. | Canoniek |
| ADR-N14 | Agentic governance is roadmap, niet huidige scope. | Architectuur voorbereiden zonder nu agents, delegation of agent credentials te bouwen. | Canoniek |
| ADR-N15 | Geen live Supabase plan of productie-migraties vanuit deze documentenset. | Deze map is architectuurreconciliatie, geen implementatiescript. | Canoniek |
| ADR-N16 | Agent heeft later een dubbel gezicht: AIResource en Actor. | Het AIResource-gezicht beschrijft het gedeployde systeem; het Actor-gezicht beschrijft de principal die onder Delegation handelt. | Canoniek roadmapbesluit |
| ADR-N17 | Geen automatische conflictresolutie op juridische velden. | Tegenstrijdige juridische signalen gaan naar HITL-review; een mens publiceert met rationale. | Canoniek |
| ADR-N18 | Pinnen betekent verwijzen naar een immutabele versie. | Governance-relevante verwijzingen worden reproduceerbaar doordat updates nieuwe versies maken. | Canoniek |

## ADR-verduidelijkingen

**ADR-N01 (herbevestigd) - Gedeeld domeinmodel als architectuurtaal.** De acht entiteiten (Organization, Actor, AIResource, UseCase, Capability, Credential, Decision, Evidence) zijn de canonieke taal voor alle producten en documentatie. Producten zijn workflows/views over dit model. Dit besluit betreft taal en ontwerp; het autoriseert geen schema- of codewijziging.

**ADR-N03 (aangescherpt) - AIResource-terminologie.** "AIResource" vervangt "Tool" als kernbegrip in alle nieuwe documentatie en toekomstige ontwerpen, met granulariteit identiteit, versie en org-adoptie. Dit is een taalbesluit: geen hernoeming van bestaande tabellen, kolommen of code, en geen wijziging aan live of live-adjacente structuren voor een aparte post-pilot specificatie.

**ADR-N05/N06 (uitgebreid) - Evidence Foundation.** Het platform kent drie lagen: record (muteerbare actuele staat), evidence (append-only, tamper-evident, geen blockchain) en intelligence (afgeleid, herbouwbaar, wordt nooit gemigreerd). Passport en dashboards zijn projecties over evidence. De implementatie bestaat als gestackte draft-PR met eigen gates; architectuurdocumenten autoriseren geen deployment. Voor de SAI-pilot geldt het pilot-minimum uit `docs/architecture/evidence-foundation-principles.md`.

**ADR-N14/N16 - Agentic governance blijft roadmap; het dubbele gezicht.** Er worden nu geen agent-identiteiten, delegaties, PDP of agent-credentials gebouwd. Vastgelegd wordt wel: een agent heeft later twee gezichten - een AIResource-gezicht (het gedeployde systeem: model, versie, configuratie; Typekaart-pinbaar) en een Actor-gezicht (de principal die onder Delegation handelt, met eigen credentials en eventgeschiedenis).

**ADR-N15 (aangescherpt) - Geen productie-migraties vanuit architectuurdocumenten.** Geen enkel document in `docs/architecture/` of founder-drafts autoriseert productie-migraties, db-pushes of branch-merges. Deployment volgt uitsluitend het PR-/staging-gateproces van de repo.

**ADR-N17 - Geen automatische conflictresolutie op juridische velden.** Bij tegenstrijdige bronnen over juridisch dragende Typekaart-velden (GPAI, restricties, soevereiniteit, verboden) wordt nooit automatisch geresolved; beide signalen gaan naar HITL-review en een mens publiceert met rationale.

**ADR-N18 - Pinnen = verwijzen naar een immutabele versie.** Elke governance-relevante verwijzing (credential naar examversie, besluit naar beslislogica-versie, org-goedkeuring naar Typekaart-versie, later agent-credential naar modelversie) wijst naar een immutabele, gepubliceerde versie. Updates creeren nieuwe versies; ze herschrijven nooit waar eerder naar verwezen is.

## Expliciet niet bouwen

- Agent Actor implementatie.
- Delegation.
- AI-rijbewijs voor agents.
- Blockchain evidence.
- Productie-migraties.
- Nieuwe Supabase tabellen.
- Automatische legal/compliance approval.
- Technische enforcement via proxy, browserplugin of netwerkmonitoring.

## Open founder-beslissingen

1. Gesloten: extern blijven Shadow AI Scan en RouteAI leidend; SAI/RAI zijn interne codes (repo, architectuur).
2. Pilot-minimum: welke AIResource-velden moeten absoluut aanwezig zijn?
3. Evidence-minimum: welke events moeten vanaf pilot append-only zijn?
4. AISA: welke interventie-output wordt formeel Capability Evidence?
5. Typekaart: welke signalen mogen zonder legal review worden gepubliceerd?
6. Passport: welke detailniveaus zijn intern zichtbaar versus audit/export?
7. Post-pilot: wanneer wordt agentic governance opnieuw beoordeeld?
