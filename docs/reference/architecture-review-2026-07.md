# Review — Nieuwe Architectuurset (00–09) × Fable-updates, samen gelezen

> Status: reference-only (gepromoveerd uit founder-draft, 2026-07-08) - dit document verklaart waarom de canon is aangepast; productarchitectuur staat in `docs/architecture/` en `docs/adr/`.

**Reviewer-rol:** senior product/informatie-architectuur. Geen implementatie: geen SQL, geen migraties, geen schema's.
**Gegrond in repo-realiteit (geverifieerd vandaag):** `main` @ `724df24` (PR #3 ongemerged, ready-for-review @ `a30b80b`); Evidence Foundation als **gestackte draft-PR** @ `941f214` — de review-findings van eerder zijn daarin verwerkt (actor-envelope kent nu `agent`, pins zijn definer-rights en INSERT-only, classification-veld toegevoegd). Dit feit is beslissend voor spanning #1 hieronder.

---

## Executive verdict

**De twee sets zijn geen concurrenten — ze zijn dezelfde architectuur op twee hoogtes, en dat is de sterkste validatie die je kunt krijgen.** De 00–09-set is de canonieke, rustige formulering (entiteiten, besluiten, grenzen); de Fable-set is de onderbouwing eronder (waarom, waar het botst met code, wat het kost als je het niet doet). Onafhankelijk kwamen beide uit op dezelfde acht entiteiten, dezelfde eigenaarschapsregels, dezelfde do-not-build-lijst. Het werk dat nu resteert is geen architectuurwerk maar **redactiewerk**: vier spanningen expliciet beslechten (waarvan één schijnbaar), zes documenten promoveren naar repo-docs, en de pilot-minimum-evidenceset voor SAI vastleggen als *discipline* in plaats van als bouw. De set is klaar om canoniek te worden zodra §Conflicten is verwerkt.

## Key strengths

1. **Convergentie op de kern.** Beide sets: acht entiteiten woordelijk gelijk; risico in de UseCase, niet in het label (ADR-N04 = "het licht hangt boven het kruispunt"); Passport = projectie (N06); tamper-evident-geen-blockchain (N05); immutabele Typekaart-versies + signal inbox + org_catalog_entry (N07–N09, letterlijk de drie structurele correcties uit de Typekaart-review); micro-learning ≠ credential (N12); AISA = interventie, geen governancebron (N13); agentic = roadmap met open deur (N14). Dit is geen toeval maar bewijs dat het model uit het probleem volgt.
2. **De 00–09-set is procedureel volwassen:** besluitregister met rationale, bronreconciliatie die 45 oude docs classificeert, expliciete niet-bouwen-lijsten per document, open founder-vragen benoemd in plaats van weggemoffeld. Precies wat een canonieke set hoort te doen.
3. **De amnestie-lijn is overal consistent doorgevoerd** — geen automatische SAI→RAI doorstroom, geen enforcement, geen monitoring. Het meest kwetsbare merkprincipe is nu structureel beschermd op vier plekken (02, productkaart, metafoorregel 1, oogst-⚠️).
4. **De reconciliatie (07) is eerlijk.** C5/C6/C8/C15 actief, de rest gedeeltelijk vervangen of historisch — dit voorkomt dat toekomstige sessies (mens of LLM) tegen verouderde canon bouwen.

## Key risks / blind spots

1. **De set kent haar eigen repo niet goed genoeg.** 03 zegt "geen live `platform_event_ledger` migratie" alsof de ledger een idee is — maar hij *bestaat* als gereviewde, gecorrigeerde gestackte draft-PR. Een canoniek document dat de code-realiteit ontkent, overtreedt jullie eigen conflictregel (repo = implementatiewaarheid). Herformuleer: *"dit document autoriseert geen deployment; deployment volgt het PR/staging-proces van de repo."*
2. **AIResource is het meest overladen begrip** (model, tool, platform, variant, interne app, workflow, *toekomstige agent*). Zonder granulariteitsuitspraak wordt dit de nieuwe "Tool"-verwarring. Zie Conflicten (e) voor de uitspraak die nu vastgelegd moet worden.
3. **Capability vermengt "kan" en "mag".** 01 definieert het als "aantoonbaar kan of mag uitvoeren" — precies de vermenging die "Niveau ≠ toestemming" (oogst) verbiedt. Eén zin repareert het: Capability = benoembare, gate-bare kwalificatie; toestemming is altijd Capability × UseCase-Decision; vaardigheids*niveaus* zijn Competency (post-pilot).
4. **Twee besluitregisters zonder rangorde.** Repo `docs/adr/ADR-EF-*` en Desktop `ADR-N*`. Regel nodig: repo-ADRs regeren implementatie; N-register regeert productarchitectuur tot promotie; bij conflict wint de repo voor code.
5. **Kleine commerciële inconsistentie:** productkaart noemt SAI "moment-opname, geen doorlopende dienst", terwijl D4 doorlopende Survey-abonnementen en het APK-ritme verkoopt. Fix in de productkaart: *periodiek* (APK), niet eenmalig.

## Conflicten en spanningen tussen de sets

**(a) "Geen migraties nu" vs. Fable's "onomkeerbaar bewijsverlies" — schijnconflict, mits je drie dingen scheidt.** (1) De Desktop-set mag geen migraties *origineren* — correct, gehandhaafd. (2) De Evidence Foundation is al code, in een eigen PR met eigen gates; de beslissing om hem te landen is een repo-beslissing die deze set niet hoeft te nemen. (3) De "elke dag zonder ledger is verlies"-claim was platform-breed; **voor de SAI-pilot is het verliesoppervlak smaller**: survey-antwoorden zijn al immutabele snapshots, `audit_events` bestaat. Wat voor SAI wél dagelijks bloedt: DPO-besluiten zonder verplichte rationale, en besluiten zonder versie-stempel (scoring/beslislogica-versie). Dat is pilot-minimum (§ hieronder) — grotendeels discipline, geen bouw. Herformuleer beide kanten: 03 erkent de bestaande PR; de Fable-claim wordt gescoped per product.

**(b) UseCase-lifecycle vs. huidige survey-tabellen.** Geen richtingconflict, wel een verleiding. Pilot-minimum is *twee* toestanden: `disclosed` (survey) → `getrieerd` (DPO-Decision). De volledige state-machine (assessed→approved→monitored→retired) is fase-C-intent. Bewaak twee anti-regels uit het domeinmodel die 02 nog niet expliciet maakt: survey-vocabulaire blijft achter de intake-grens (promotie = expliciete Decision), en de latere koppeling survey-toolnamen → AIResource is een *suggestietabel*, geen harde FK.

**(c) Actor/agent-gereedheid vs. human-only identiteit.** Geen conflict; beide sets zeggen hetzelfde. Het enige dat nú moet: de goedkope deur-open-houders zijn in de EF-PR inmiddels aanwezig (geverifieerd: `agent` in de envelope, classification-veld). Wat nog ontbreekt in beide sets is de uitspraak die 06's beste open vraag beantwoordt ("wanneer is iets AIResource en wanneer Actor?"): **een agent is beide** — een AIResource-gezicht (het gedeployde systeem, Typekaart-pinbaar) en een Actor-gezicht (de principal die onder Delegation handelt). Leg dit nu vast als ADR-N16; het is één alinea en het ont-risqueert de latere refactor meer dan wat ook.

**(d) Learning als delivery vs. Capability bezit assessments.** Echt verschil, juiste uitkomst: **beide waar, verschillende tijden.** Vandaag (en in de pilot) wonen assessments fysiek in Learning-content — dat is de code. De eigenaarschaps*taal* moet nu al kloppen (credentials/gates = platform-Capability; content/rendering = Learning; 05 zegt dit bijna), maar de fysieke extractie (item-bank, AssessmentDefinition) is post-pilot fase B. Niet nu refactoren; wel nu opschrijven wie eigenaar is, zodat niemand ondertussen nieuwe koppelingen de verkeerde kant op bouwt.

**(e) Typekaart-immutabiliteit vs. huidige tool/model-structuren.** Richting is uniform; de spanning is retro-actief. Uitspraak: immutabiliteit geldt vanaf Model Library fase 1 (post-pilot); bestaande SAI-tabellen worden *niet* hernoemd of verbouwd omdat ADR-N03 "AIResource vervangt Tool" zegt — dat besluit is taal en toekomstig schema, geen renaming-opdracht voor live-adjacente code vóór een pilot. Benoem dit expliciet in 04, anders is N03 een scope-creep-generator. Granulariteitsuitspraak voor de open vraag in 04: drie niveaus — identiteit (model/resource) · versie (typekaart_version) · org-adoptie (org_catalog_entry); een deployment-variant is een versie-attribuut, geen eigen identiteit.

## Pilot-minimum beslissingen (SAI, dag één — zonder platform-rebuild)

1. **Rationale verplicht op elk DPO/triage-besluit** — verplicht in het proces vanaf dag één, ook als het veld technisch optioneel is. Dit is het enige item waar uitstel écht onomkeerbaar verlies is (een besluit zonder waarom is kennis die nooit meer terugkomt). Inclusief de rationale-conventie: geen bijzondere persoonsgegevens of derden-PII in rationale-tekst.
2. **Versie-stempel op elk besluit:** welke scoring/beslislogica-versie en survey-versie golden. Bestaat grotendeels (v8 scoring-config is geversioneerd); maak het een acceptatiecriterium, geen aanname.
3. **Minimale eventlijst** (via bestaand `audit_events`, geen nieuwe infra): survey voltooid · gescoord · DPO-besluit · export gegenereerd. Meer niet.
4. **Exports dragen versie + verificatiedatum** (zorgplicht-anker; sluit aan op de false-certainty-guardrails).
5. **Immutabele survey-snapshots** — bestaat al; expliciet benoemen als pilot-garantie zodat het niet per ongeluk sneuvelt.
Alles daarbuiten (volledige ledger op SAI-paden, hash-chaining, lifecycle-states voorbij disclosed/getrieerd, Typekaart, capability-events) kan wachten of landt via de bestaande PR-stack wanneer die zijn gates passeert.

## Post-pilot roadmap-items (volgorde bevestigd, met twee aanscherpingen)

Fase 1–4 van 09 zijn juist. Aanscherpingen: (1) geef **Fase 5 (agentic review) een concrete trigger** — eerste klantvraag om een agent te governen, óf het moment dat jullie eigen distillatie-agent gebouwd wordt — anders drijft "later" eeuwig; (2) voeg aan fase-2-specificatie de twee registerwaardige principes uit de Typekaart-review toe: *juridische velden resolven nooit automatisch bij bronconflict* en *pinnen = verwijzing naar een immutabele versie* als universeel patroon (geldt voor content, examens, Typekaarten én toekomstige agent-credentials).

## Expliciete do-not-build-lijst (samengevoegd, 90 dagen)

Agent-identiteiten, Delegation, PDP, agent-credentials · PolicyVersion-as-data en Risk-Engine-herbouw · assessment-item-bank-extractie · UseCase-state-machine voorbij disclosed/getrieerd · Model Library fase 1 (tabellen, curator-UI, adapters, RSS) · OrgUnit/teamstructuur · Maturity Levels · knowledge-distillatie · benchmarks · hernoemen van live-adjacente tabellen o.b.v. ADR-N03 · brand-code-renames vóór een natuurlijk migratiemoment · elke vorm van monitoring/enforcement · blockchain · aparte AISA-datalaag. (De Fable-IA-aanbeveling "emit deze week events vanaf ~10 write-paths" is voor Learning al gerealiseerd via de EF-PR en wordt voor SAI beperkt tot de minimale eventlijst hierboven — breder instrumenteren is nu scope-creep.)

## Aanbevolen promotie naar repo-docs (de slotmatrix)

| Nu naar repo-docs promoveren | Founder-draft (Desktop) houden | Post-pilot implementatiekandidaat | Niet bouwen / hard uitstellen |
|---|---|---|---|
| `01` domeinmodel — met de Capability-zin (kan≠mag) en ADR-N16 (agent = Actor-gezicht + AIResource-gezicht) | `07` reconciliatie (eigen advies volgen: migratiecontext) | Assessment-extractie naar Capability-context (fase B) | Agent-schema's, Delegation, PDP |
| `02` productmap — plus de twee anti-regels uit (b) en de AISA-precisering: AISA levert evidence-*input*, geregistreerd door een accountable mens in RouteAI; AISA schrijft nooit zelf governance-state | `09` roadmap (na founder-review, per eigen noot) | UseCase-lifecycle-aggregate (fase C) | PolicyVersion nu; Risk-Engine-herbouw |
| `03` Evidence-principes — geherformuleerd t.o.v. de bestaande EF-draft-PR (autoriseert geen deployment; verwijst naar PR-proces) | Metafoorkader, productkaart-NL, oogst, GTM-stukken (merk/strategie, geen repo-architectuur; productkaart wél fixen: SAI = periodiek) | Model Library fase 1 (kleinste batch uit de Typekaart-review) | Adapters/EU-API-integratie vóór 2027-spec |
| `04` + `08` — register als `docs/adr/`-set incl. N16, de no-auto-resolve-regel en de rangorde-regel repo-ADRs > N-register voor code | Fable-reviews (IA/EF/ML) als referentie-artefacten, geen canon | Capability-generalisatie; daarna pas Actor-polymorfie (de ene invasieve refactor, vlak vóór agent-werk) | OrgUnit, Maturity Levels, benchmarks, distillatie — tot Evidence + OrgUnit bestaan |
| `05` — met de eigenaarschapszin uit (d) · `06` + AI-rijbewijs-agents-note als `docs/roadmap/` | | SAI→AIResource *suggestie*-mapping | Monitoring/enforcement in welke vorm dan ook |

**Slotzin:** promoot de zes documenten met de genoemde redactieslagen, sluit founder-vraag 1 (extern: *Shadow AI Scan* en *RouteAI*; SAI/RAI blijven interne codes — de productkaart besliste dit feitelijk al), en behandel de Evidence Foundation-PR als wat hij is: geen architectuurvraag meer, maar een deployment-vraag met een eigen, al lopend, gate-proces. Daarmee is de architectuurfase af — en dat is de bedoeling van een architectuurfase.
