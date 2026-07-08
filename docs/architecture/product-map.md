# Productmap: SAI, RAI, Learning en AISA

> Status: canoniek (gepromoveerd uit founder-draft, 2026-07-08) - implementatieconflicten worden beslecht door repo-ADRs en de code zelf.

**Status:** Canoniek productarchitectuurdocument.  
**Doel:** Producten positioneren als workflows/views over het gedeelde domeinmodel.  
**Relatie:** Gebruikt `shared-domain-model.md`; voedt roadmap en besluitregister.

## Kernbesluit

SAI, RAI/RouteAI, Learning en AISA zijn geen aparte datasilo's:

- SAI = intake/discovery
- RAI/RouteAI = governance, lifecycle, decisioning en evidence
- Learning = capability/credential delivery
- AISA = menselijke/teaminterventie die capability versnelt

## SAI: intake en discovery

SAI ontdekt bestaande AIResources, UseCases en organisatierisico's. De oude Shadow AI Scan blijft waardevol als productontwerp: amnestievenster, waarde teruggeven aan medewerkers, menselijke DPO-gate en geen automatische doorstroom.

SAI schrijft of suggereert:

- nieuwe AIResources;
- UseCase-context;
- signalen voor catalogusreview;
- eerste Evidence rond discovery;
- mogelijke learning/capability gaps.

SAI beslist niet automatisch dat iets toegestaan is. SAI maakt zichtbaar.

Promotie van SAI naar governance is altijd een Decision. Survey-vocabulaire, ref-tabellen en vraagteksten lekken niet door naar het gedeelde domeinmodel.

## RAI / RouteAI: governance en lifecycle

RouteAI is de governance-laag. Het beheert beslissingen, catalogusstatus, reviewritme, assessments, oversight, Accountability Passport en evidence.

RAI/RouteAI gebruikt:

- AIResource metadata uit Model Library/Typekaart;
- UseCase context uit SAI of handmatige intake;
- Capability/Credential status uit Learning;
- Evidence als auditlaag.

RouteAI is policy en audit, geen technische enforcementlaag.

## Learning: capability en credential delivery

Learning levert kennis, instructies, micro-learnings, examens en credentials. Het AI-rijbewijs blijft een interne, auditeerbare credential. Micro-learnings zijn contextuele gedragsinstructies, geen credential.

Learning schrijft:

- Capability evidence;
- Credential evidence;
- module- en examversies;
- voltooiingen en herexamenstatus op aggregatieniveau.

## AISA: interventie en versnelling

AISA is geen apart compliance-systeem. AISA is een menselijk/teamgericht interventieproduct dat capability versnelt. Het levert workshops, sprints, teamleren, HR compliance interventies en casuistiek.

AISA levert evidence-input: sessies, teamafspraken en interventies worden door een accountable mens in RouteAI geregistreerd. AISA schrijft nooit zelf governance-state.

AISA kan aanleiding geven tot:

- nieuwe UseCases;
- nieuwe AIResources;
- betere oversightprocessen;
- Capability verbeteringen;
- Evidence uit sessies, besluiten of teamafspraken.

## Huidige scope

- Productgrenzen scherp trekken.
- Data als gedeeld domeinmodel beschrijven.
- Doorstroom altijd menselijk en expliciet houden.
- AISA-positionering koppelen aan capability, niet aan aparte datalaag.

## Naamgeving

Extern: Shadow AI Scan en RouteAI. SAI/RAI zijn interne codes (repo, architectuur). Learning en AISA zijn geen zelfstandige datamerken.

## Niet bouwen

- Geen automatische SAI -> RAI migratie zonder DPO/org_admin Decision.
- Geen aparte AISA-database als governancebron.
- Geen learning-gating buiten vastgestelde credential- en assessmentflows.
- Geen enforcement door netwerkmonitoring, browserplugin of proxy.

## Open vragen

- Welke SAI-output wordt in pilot formeel Evidence en welke blijft rapportage?
- Welke AISA-interventies krijgen een gestandaardiseerde Evidence-vorm?
