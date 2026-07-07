# RouteAI AI Curriculum Design 2026

Geintegreerd theoretisch ontwerp voor AI Literacy, AI Proficiency en AI Mastery.

Versie: 2026.1 ontwerpupdate
Datum: 2026-05-29
Status: didactisch ontwerp, nog geen juridische eindredactie

## 1. Doel en uitgangspunten

Dit rapport brengt de drie curriculum maps samen in een didactisch totaalontwerp:

- AI Literacy: foundation voor alle medewerkers en externen die namens de organisatie met AI-systemen werken.
- AI Proficiency: intermediate voor frequente AI-gebruikers in operationele rollen.
- AI Mastery: advanced voor proceseigenaren, teamleads, AI-ambassadeurs, compliance/privacy/security en technische of governance-verantwoordelijke rollen.

Het ontwerp is bedoeld om drie doelen tegelijk te dienen:

1. Leren: medewerkers begrijpen en oefenen verantwoord AI-gebruik.
2. Gedrag: deelnemers passen dataminimalisatie, outputcontrole, human oversight en escalatie toe.
3. Aantoonbaarheid: de organisatie kan laten zien welke maatregelen zijn genomen, welke deelnemers hebben meegedaan, welke evidence is vastgelegd en waar review nodig was.

De balans blijft bewust MKB-proof: kort genoeg om haalbaar te blijven, concreet genoeg om gedrag te veranderen, en aantoonbaar genoeg voor een compliance-dossier.

## 2. Juridische en beleidsmatige basis

### 2.1 Vaststaande basis

- EU AI Act Article 4 is van toepassing sinds 2 februari 2025. De Europese Commissie beschrijft dat organisaties maatregelen moeten nemen om AI literacy bij personeel en andere relevante personen te waarborgen, rekening houdend met rol, context, risico en doelgroep.
- De Commissie-Q&A benadrukt dat aanbieders en gebruiksverantwoordelijken hun rol, het type AI-systeem, risico en betrokken personen moeten meewegen.
- In Nederland is de Uitvoeringswet AI-verordening op 20 april 2026 in internetconsultatie gebracht. De consultatie noemt onder meer AP, RDI en andere sectorale toezichthouders.
- RDI en AP krijgen in het Nederlandse voorstel een coordinerende rol in het toezichtstelsel en rond AI regulatory sandboxes.

Bronnen:

- European Commission, AI Literacy Questions & Answers: https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers
- European Commission, AI talent, skills and literacy: https://digital-strategy.ec.europa.eu/en/policies/ai-talent-skills-and-literacy
- Rijksoverheid, Uitvoeringswet AI-verordening consultatie: https://www.rijksoverheid.nl/actueel/nieuws/2026/04/20/kabinet-zet-stap-met-toezicht-op-europese-ai-regels
- Internetconsultatie Uitvoeringswet AI-verordening: https://www.internetconsultatie.nl/uaiv
- RDI, toezicht op AI: https://www.rdi.nl/actueel/nieuws/2026/04/20/toezicht-ai-balans-veiligheid-en-innovatie

### 2.2 Voorzichtig opnemen

Gemini noemt Digital Omnibus-wijzigingen, verschoven deadlines en een verschuiving van resultaatsverplichting naar inspanningsverplichting. Die richting past bij gepubliceerde informatie over vereenvoudiging, maar in cursuscontent moet dit voorzichtig worden geformuleerd totdat de tekst formeel is aangenomen en gepubliceerd.

Ontwerpformulering:

> Het curriculum ondersteunt organisaties bij het aantoonbaar nemen van proportionele AI-literacy maatregelen. Waar wetgeving of guidance verandert, wordt het curriculum versioneerbaar bijgewerkt.

Niet opnemen als harde tekst zonder juridische review:

- "Article 4 is definitief veranderd in een inspanningsverplichting."
- Exacte nieuwe deadlines uit Digital Omnibus als definitief.
- Nieuwe verboden of uitstelbepalingen zonder formele EU-publicatie.

## 3. Leerlijnarchitectuur

| Niveau | Course code | Doelgroep | Hoofdfocus | Duuradvies | Cesuur |
|---|---|---|---|---|---|
| AI Literacy | RAI-AILIT-01 | Alle medewerkers, directie, externen namens organisatie | Basisbegrip, data, risico, outputcontrole, human oversight | 2,5-3,25 uur + assessment | 75% totaal, C4/C6 >= 80% |
| AI Proficiency | RAI-AIPRO-01 | Frequente AI-gebruikers per rol/afdeling | Taakframing, prompting, SWAC, fout-asymmetrie, rolcases | 6-12 uur modulair, of 4-6 uur kernroute | 75% totaal, P4/P7 >= 80% |
| AI Mastery | RAI-AIMAS-01 | Proceseigenaren, AI leads, IT, compliance, privacy, security | Compliance engineering, HRAIS, governance, logging, oversight by design | 20-30 uur volledige route, of 6-8 uur governance kernroute | 80% totaal, M3/M8 >= 80% |

### 3.1 Didactisch model

De leerlijn gebruikt vier lagen:

1. Conceptueel begrip: wat is AI, wat zijn risico's, welke rollen bestaan?
2. Werkcontext: hoe raakt AI mijn taak, data, klant, collega of besluit?
3. Evidence: scenario, checklist, case_lab, short_answer, quiz of review.
4. Transfer: protocol, taakbrief, SWAC-check, log, escalatiepad of governance-artefact.

### 3.2 Gedragsprincipes door alle modules

- AI-output is concept, geen besluit.
- Data eerst, prompt daarna.
- Bij impact op mensen geldt menselijk toezicht.
- Bij onzekerheid: stop, check, escaleer of leg vast.
- Verifieren moet makkelijker worden gemaakt dan blind overnemen.
- Training telt pas als maatregel wanneer deelname, versie, evidence en reviewstatus aantoonbaar zijn.

## 4. Evidence Dossier

Het Evidence Dossier is de organisatorische ruggengraat van Article 4-aantoonbaarheid.

Minimaal vastleggen:

- Cursusversie, publicatiedatum en curriculumwijzigingen.
- Deelnemer, rol, afdeling, org_id, externe/interne status.
- Deelname en voortgang per pagina.
- Attempts per evidence block.
- Scores, reviewstatus en reviewer-notities.
- Certificaten, geldigheid, vervaldatum en hercertificeringsmoment.
- Remediatieadvies bij onvoldoende of review nodig.
- Matrix van competenties naar evidence.
- Export voor audit of intern compliance-overleg.

Aanbevolen dossierlagen:

| Laag | Voorbeeld |
|---|---|
| Participation evidence | enrollment, page_progress, timestamps |
| Competency evidence | C1-C8/P1-P8/M1-M8 status per deelnemer |
| Assessment evidence | quizscore, scenario-resultaat, case review |
| Governance evidence | curriculumversie, reviewer, beleidslink, update-log |
| Access evidence | certificaatstatus voor `routeai_usecase_check` |

## 5. Module 1: AI Literacy

### 5.1 Cursusprofiel

| Veld | Waarde |
|---|---|
| Titel | AI Literacy Foundation |
| Niveau | Foundation |
| Doelgroep | Alle medewerkers, directieleden en externe contractanten die AI gebruiken namens de organisatie |
| Voorkennis | Geen |
| Duur | 2,5-3,25 uur inclusief assessment |
| Verplicht | Ja voor iedereen die AI-systemen gebruikt of ermee in aanraking komt namens de organisatie |
| Eindresultaat | Begrijpt AI-basis, rol van organisatie, grenzen, privacy, outputcontrole, escalatie en human oversight |
| Certificaat | Intern RouteAI AI Literacy/Foundation bewijs |
| Geldigheid | 12-18 maanden, of eerder bij grote wets-, tool- of beleidswijziging |

### 5.2 Ontwerpoptimalisaties uit Gemini

Toevoegen aan Literacy:

- Provider/deployer-rolherkenning.
- Externen/freelancers expliciet als doelgroep.
- Baseline digitale vaardigheid en laagdrempelige route.
- Cognitive offloading: AI-output als concept, niet als besluit.
- Verboden praktijken actualiseren met veilige rode-vlagkaart voor non-consensuele intieme beelden en misleidende/deepfake-achtige content, zonder grafische details.
- Evidence dossier uitleg: waarom deelname en evidence worden bewaard.

### 5.3 Structuur en content

| Code | Pagina | Type | Tijd | Kerncontent | Evidence |
|---|---|---|---|---|---|
| P1 | Welkom en wat is AI? | content | 10 min | AI-basis, menselijke factor, AI-output als concept, nulmeting | progress_check |
| P2 | Wat telt als AI in jouw werkcontext? | content | 10-12 min | AI herkennen in tools, wel/geen AI schema, classificatie-scenario | checklist, scenario |
| P3 | Jouw startpunt | question/content | 8-10 min | Eigen rol, digitale vaardigheid, externe/interne context, taakselectie | reflection, short_answer |
| P4 | De EU AI Act in gewone taal | content | 12-15 min | Article 4, rollen provider/deployer, Article 5, risicopiramide, tijdlijn | kennischeck optioneel |
| P5 | Verboden, hoog-risico en transparantie | content | 15-18 min | Rode vlaggen, hoog-risico, transparantie, non-consensuele intieme beelden/deepfake rode vlag | reflection, scenario, quiz_ms |
| P6 | Privacy, AVG, klantdata | content | 12-13 min | Data-matrix, AVG-principes, herleidbaarheid, goedgekeurde tools | checklist, quiz_tf |
| P7 | Veilig prompten en toolgrenzen | content | 10-13 min | Veilig prompten, toolstatus, dataminimalisatie, conceptoutput | slide_deck, MCQ, reflection |
| P8 | Scenario: mag dit in de prompt? | case gate | 8-11 min | Klantdata, toolkeuze, promptsanering, escalatie | scenario, short_answer |
| P9 | AI kan overtuigend fout zitten | video/content | 10 min | Hallucinatie, bias, plausible output, cognitive offloading | progress_check, quiz_tf |
| P10 | Output controleren voor gebruik | content | 12 min | 6-stappen controlelus, rode vlaggen, concept vs besluit | checklist |
| P11 | Mijn controleprotocol | question | 8-10 min | Persoonlijke werkafspraken, stopknoppen, escalatie | reflection, short_answer |
| P12 | Human oversight en menselijke eindverantwoordelijkheid | content | 15 min | HITL/HOTL/HIC, toezichtscenario, beslisvraag | scenario optioneel |
| P13 | Praktijkcase GroeiKompas BV | case gate | 15-20 min | Klantservice, HR, personeelssignalering, risicoclassificatie | case_lab, short_answer |
| P14 | Rolgerichte mini-cases per afdeling | optional | 7-15 min | HR, finance, marketing, support, operations | reflection optioneel |
| P15 | Assessment en AI-rijbewijs | assessment gate | 20-25 min | Summatieve mix van kennis, scenario, short answer en essay | quiz, short_answer, essay |

### 5.4 Competenties C1-C8

| Code | Competentie | Kern | Drempel | Kritisch |
|---|---|---|---|---|
| C1 | AI herkennen | Basisbegrip en onderscheid automatisering/AI | 75% | Nee |
| C2 | Context begrijpen | AI in eigen werkcontext herkennen | 75% | Nee |
| C3 | Risico en rolbewustzijn | Risiconiveaus, provider/deployer, rode vlaggen | 75% | Nee |
| C4 | Data en privacy | Dataminimalisatie, herleidbaarheid, toolscope | 80% | Ja |
| C5 | Outputcontrole | Feit-, bron-, toon-, bias- en impactcheck | 75% | Nee |
| C6 | Human oversight | HITL/HOTL/HIC toepassen, mens beslist | 80% | Ja |
| C7 | Taakselectie | AI passend/proportioneel inzetten | 75% | Nee |
| C8 | Escalatie en bewijs | Stoppen, escaleren en vastleggen | 75% | Nee |

Advies: C8 niet als losse harde blocker gebruiken in Literacy. C8 telt mee via P8, P11, P13 en P15, maar C4 en C6 blijven de echte kritische blokkers.

### 5.5 Toetsingskader

Slagingscriteria:

1. 14 verplichte pagina's voltooid.
2. P8 scenario-gate gehaald.
3. P13 case_lab voldoende of goedgekeurd.
4. P15 assessment >= 75%.
5. C4 privacy/data >= 80%.
6. C6 human oversight >= 80%.
7. Geen openstaande manual review op required evidence.

Assessment P15:

| Vraagtype | Aantal | Weging | Doel |
|---|---:|---:|---|
| quiz_mc | 5 | 20% | Begrippen, rollen, risicocategorieen |
| quiz_ms | 2 | 20% | Rode vlaggen, privacy, oversight |
| quiz_tf | 3 | 15% | Misvattingen en basischecks |
| short_answer | 2 | 20% | Datagrens en escalatie toepassen |
| quiz_essay | 1 | 25% | Integrale casus: risico, data, toezicht, eindadvies |

### 5.6 Didactische media

| Pagina | Media | Doel |
|---|---|---|
| P1 | Korte animatie "AI-output is concept" | Cognitive offloading vroeg adresseren |
| P2 | Wel/geen AI classificatie | Actieve herkenning |
| P4 | Risicopiramide + AI Act tijdlijn | Wetgeving scanbaar maken |
| P5 | Rode-vlag cards | Verboden/hoog-risico herkennen |
| P6 | Privacy data-matrix | Concreet datagedrag |
| P7 | Veilig prompten slide deck | Promptgrenzen oefenen |
| P8 | Vertakt scenario | Gate voor privacygedrag |
| P10 | Controlelus timeline | Routinevorming |
| P12 | HITL/HOTL/HIC tabs | Oversightbegrippen toepassen |
| P13 | Case lab | Transfer naar praktijksituatie |

## 6. Module 2: AI Proficiency

### 6.1 Cursusprofiel

| Veld | Waarde |
|---|---|
| Titel | AI Proficiency |
| Niveau | Intermediate |
| Doelgroep | Frequente AI-gebruikers in HR, finance, marketing, support, operations, administratie en analyse |
| Voorkennis | AI Literacy behaald |
| Duur | 6-12 uur modulair; kernroute 4-6 uur mogelijk |
| Eindresultaat | Deelnemer past AI veilig, doelgericht, controleerbaar en rolgericht toe |
| Certificaat | Intern RouteAI AI Proficiency bewijs |
| Geldigheid | 12 maanden of bij rol/toolwijziging |

### 6.2 Ontwerpoptimalisaties uit Gemini

Toevoegen aan Proficiency:

- Rolspecifieke pathways per afdeling.
- Fout-asymmetrie: risico = waarschijnlijkheid x impact.
- SWAC-methodologie: Source, Workflow, Accuracy, Compliance.
- Human complementarity: AI versterkt menselijk kritisch denken, creativiteit en probleemoplossing.
- Conversational prompting als iteratieve dialoog, niet alleen eenmalige prompt.
- Workflowsjablonen waardoor verifieren makkelijker is dan niet verifieren.

### 6.3 Structuur en content

| Code | Pagina | Type | Tijd | Kerncontent | Evidence |
|---|---|---|---|---|---|
| P01 | Van AI-tool naar werktaak | content | 15 min | AI als taakondersteuning, menselijke expertise | progress_check |
| P02 | Use-case framing | content | 30 min | Taakbrief, doel, data, impact, controle, use-case framing slides | scenario, reflection |
| P03 | Prompting met context en criteria | content | 35 min | Conversational prompting, promptanatomie, criteria, anti-patronen | short_answer |
| P04 | Output verifieren en verbeteren | content/question | 35 min | SWAC, verificatietijdlijn, hallucinatie, broncheck | scenario, quiz_mc |
| P05 | Data classificeren en minimaliseren | content | 30 min | Dataclassificatie 2x2, promptsanering, toolscope | checklist |
| P06 | Toolkeuze en promptsanering | content gate | 30 min | Tooltype, accounttype, dataretentie, HR/klant-scenario's | scenario gate, reflection |
| P07 | Rolgerichte cases: klantcontact, sales, marketing | case/content | 30 min | Afdelingspad klant/extern | case/accordion |
| P08 | Rolcases: administratie, HR, finance, operations | case | 30 min | Afdelingspad intern/impact | case_lab, short_answer |
| P09 | Oversight, escalatie en documentatie | content gate | 40 min | HITL/HOTL/HIC in eigen taak, log, escalatie | scenario gate, checklist |
| P10 | Praktijkcase operations-medewerker | case | 30-35 min | Complete taakcyclus | case_lab, short_answer |
| P11 | Reflectie en terugblik | question | 15 min | Transfer, eindmeting, persoonlijke routines | reflection, progress_check |
| P12 | Proficiency assessment | assessment | 30-40 min | Summatieve toets en review | quiz, short_answer |

### 6.4 Rolspecifieke pathways

Kernroute is gelijk, maar P07/P08 en remediatie verschillen per rol.

| Rol | Extra focus | Typische fout-asymmetrie |
|---|---|---|
| HR | Kandidaten, beoordeling, personeelsdata, bias | Lage foutkans kan hoge persoonsimpact hebben |
| Finance | Rapportages, cijfers, fiscale/contractuele claims | Kleine fout kan hoge financiele of compliance-impact hebben |
| Marketing | Claims, merk, doelgroep, AI-content disclosure | Onjuiste claim kan reputatie- of consumentenimpact hebben |
| Support | Klantdata, toon, coulance, escalatie | Onjuiste reactie kan klantrecht of vertrouwen raken |
| Operations | Prioritering, planning, uitzonderingen | Verkeerde prioriteit kan klant/levering/proces raken |

### 6.5 Competenties P1-P8

| Code | Competentie | Kern | Drempel | Kritisch |
|---|---|---|---|---|
| P1 | Kansen in werkprocessen herkennen | AI passend inzetten | 75% | Nee |
| P2 | Use-case framing | Taakbrief met doel, data, criteria | 75% | Nee |
| P3 | Prompting met context en criteria | Iteratieve promptdialoog | 75% | Nee |
| P4 | Veilige omgang met data | Toolscope, dataminimalisatie, promptsanering | 80% | Ja |
| P5 | Outputcontrole en fact-checking | SWAC Source/Accuracy | 75% | Nee |
| P6 | Bias en hallucinatierisico | Misleidende output herkennen | 75% | Nee |
| P7 | Human oversight in eigen werk | Menselijke review, override, besluitgrens | 80% | Ja |
| P8 | Escalatie en documentatie | Log, overdracht, twijfel vastleggen | 75% | Nee |

### 6.6 SWAC-methodologie

SWAC wordt de standaard verificatielaag in Proficiency:

| Stap | Vraag | Evidence |
|---|---|---|
| Source | Waar komt de informatie vandaan? | Broncheck, interne bron, expertvalidatie |
| Workflow | Waar raakt output het werkproces? | Taakbrief, processtap, beslismoment |
| Accuracy | Hoe toets ik juistheid? | Feitcheck, berekening, vergelijking, steekproef |
| Compliance | Past dit bij beleid, privacy, AI Act en sectorregels? | Datagrens, toolscope, review, log |

### 6.7 Fout-asymmetrie

Elke relevante use case wordt ingedeeld:

| Foutkans | Impact | Actie |
|---|---|---|
| Laag | Laag | Normale controle |
| Hoog | Laag | Verbeter prompt/workflow, outputcontrole |
| Laag | Hoog | Strenge review, logging, approver |
| Hoog | Hoog | Stoppen, herontwerpen of escaleren |

### 6.8 Toetsingskader

Slagingscriteria:

1. Alle verplichte pagina's voltooid.
2. P06 toolkeuze/promptsanering gate gehaald.
3. P09 oversight/escalatie gate gehaald.
4. Praktijkcase P10 minimaal niveau 3 op alle rubriccriteria.
5. P12 assessment >= 75%.
6. P4 data >= 80%.
7. P7 human oversight >= 80%.

Assessment P12:

| Vraagtype | Aantal | Weging | Doel |
|---|---:|---:|---|
| quiz_mc | 5 | 25% | Taakframing, prompting, SWAC |
| quiz_ms | 2 | 20% | Data, compliance, verificatie |
| quiz_tf | 3 | 15% | Misvattingen |
| short_answer | 2 | 20% | Bias, escalatie, documentatie |
| praktijkcase P10 | 1 | 20% | Complete taakcyclus |

Rubric praktijkcase:

- Taakframing.
- Veilige datahantering.
- Promptkwaliteit.
- SWAC-outputcontrole.
- Human oversight.
- Documentatie/escalatie.

Hard fail:

- Onveilige klant-, HR- of gevoelige data-invoer.
- AI-output als definitief besluit gebruiken bij hoge impact.
- Geen bron/accuracy-check bij feitelijke of financiele/juridische claims.

### 6.9 Didactische media

| Pagina | Media | Doel |
|---|---|---|
| P02 | Use-case framing slide deck | Taakbrief aanleren |
| P03 | Conversational prompting split-screen | Iteratie zichtbaar maken |
| P04 | SWAC en verificatietijdlijn | Verificatie operationaliseren |
| P05 | Dataclassificatie matrix | Data-risico herkennen |
| P06 | Toolkeuze/promptsanering scenario deck | Gate voor veilig toolgebruik |
| P07/P08 | Rolcarrousel | Relevantie per afdeling |
| P09 | Oversight/escalatie flow | Besluitgrens oefenen |
| P10 | Praktijkcase canvas | Transfer naar werk |

## 7. Module 3: AI Mastery

### 7.1 Cursusprofiel

| Veld | Waarde |
|---|---|
| Titel | AI Mastery |
| Niveau | Advanced |
| Doelgroep | AI-architecten, data scientists, software engineers, proceseigenaren, compliance/privacy/security, AI-ambassadeurs |
| Voorkennis | AI Literacy verplicht; AI Proficiency aanbevolen |
| Duur | 20-30 uur volledige technische/compliance route; 6-8 uur governance kernroute |
| Eindresultaat | Deelnemer kan AI-use cases, systeemontwerp en governance aantoonbaar compliant organiseren |
| Certificaat | Intern RouteAI AI Mastery bewijs |
| Geldigheid | 12 maanden of bij proces-, tool-, model- of governancewijziging |

### 7.2 Ontwerpoptimalisaties uit Gemini

Mastery moet sterker verschuiven van "technische prestaties" naar "compliance engineering".

Toevoegen:

- Hoog-risico AI-systemen: eisen rond risk management, data governance, technische documentatie, logging, transparantie, human oversight, accuracy/robustness/cybersecurity.
- Artikelen 9-15 als technische ontwerpchecklist voor HRAIS.
- Artikel 27 FRIA-documentatie als governance artefact.
- GPAI downstream integratie en supplier due diligence.
- Stop-knop, override, alert fatigue en meaningful human oversight UI.
- Fraudebestendige logging en audit trails.
- QMS/ISO 42001 als implementatiekader.
- AP/RDI regulatory sandbox als optionele route voor vroege validatie.

### 7.3 Structuur en content

| Code | Pagina | Type | Tijd | Kerncontent | Evidence |
|---|---|---|---|---|---|
| M01 | Van pilots naar AI-portfolio | content | 20 min | Portfolio, prioritering, evidence dossier | reflection |
| M02 | Use-case triage | content | 30 min | Waarde-risico-haalbaarheid, fout-asymmetrie | scenario |
| M03 | Rollen en keten | content | 30 min | Provider, deployer, importer/distributor, owner, vendor | short_answer |
| M04 | Beleid naar procesafspraken | content | 30 min | RACI, policy-to-process, externen, training scope | checklist |
| M05 | Human oversight by design | content gate | 30 min | HITL/HOTL/HIC, override, stopknop, alert fatigue | scenario gate |
| M06 | Override, sampling, vier-ogen | content | 30 min | Samplingplan, review triggers, operator fatigue | reflection |
| M07 | Datagovernance en bias | content | 30 min | Representativiteit, datakwaliteit, bias, Art. 10 | case_lab |
| M08 | Monitoring, logs en incidenten | content | 30 min | Automatische logging, incident flow, audit trail | artifact |
| M09 | Transparantie en betrokkenencommunicatie | content gate | 25 min | Article 50, disclosure, deepfake/synthetische content | scenario, short_answer |
| M10 | Adoptieplan voor MKB-team | case | 25 min | Multidisciplinaire samenwerking | case_lab |
| M11 | Governance-praktijkcase | case gate | 40-50 min | HRAIS/compliance ontwerp, FRIA, QMS, sandbox | case_lab, essay |
| M12 | Mastery assessment | assessment | 40-50 min | Summatieve advanced toets | quiz, short_answer |

### 7.4 Competenties M1-M8

| Code | Competentie | Kern | Drempel | Kritisch |
|---|---|---|---|---|
| M1 | Waarde-risico-haalbaarheid | Portfolio en triage | 75% | Nee |
| M2 | Governance naar werkprocessen | RACI, controls, procesontwerp | 75% | Nee |
| M3 | Human oversight ontwerpen | Meaningful oversight, stop/override | 80% | Ja |
| M4 | Risicobeoordeling en escalatie | Fout-asymmetrie, incidentflow | 75% | Nee |
| M5 | Data, bias en monitoring | Datagovernance, bias, monitoring | 75% | Nee |
| M6 | Leveranciers en GPAI | Provider/deployer, supplier due diligence | 75% | Nee |
| M7 | Transparantie en communicatie | Article 50, betrokkenen, disclosure | 75% | Nee |
| M8 | Evidence, audit trail en review | Logging, FRIA, QMS, audit pack | 80% | Ja |

### 7.5 Compliance engineering bouwstenen

| Bouwsteen | Ontwerpvragen | Artefact |
|---|---|---|
| Risk management system | Welke risico's ontstaan, wie reviewt, hoe wordt geactualiseerd? | Risk register, control plan |
| Data governance | Is data representatief, actueel, relevant en legaal bruikbaar? | Data sheet, bias review |
| Technical documentation | Kan het systeem, doel en gebruik worden uitgelegd? | Tech dossier |
| Logging | Wat wordt automatisch en fraudebestendig vastgelegd? | Log schema, retention policy |
| Human oversight UI | Kan de mens begrijpen, ingrijpen, stoppen en overriden? | Oversight design, stop-knop |
| Accuracy/robustness/security | Hoe worden prestatie en kwetsbaarheid getest? | Testplan, monitoring dashboard |
| FRIA | Welke grondrechtenimpact bestaat en hoe wordt gemitigeerd? | FRIA input pack |
| GPAI chain | Welke modelinformatie, beperkingen en vendor claims zijn nodig? | Supplier due diligence |
| QMS | Hoe is governance ingebed in beleid, rollen en wijzigingen? | QMS control map |
| Sandbox | Wanneer is vroege afstemming met AP/RDI nuttig? | Sandbox intake memo |

### 7.6 Toetsingskader

Slagingscriteria:

1. Alle verplichte pagina's voltooid.
2. M05 human oversight by design gate gehaald.
3. M09 transparency/disclosure gate gehaald.
4. M11 governance-case minimaal niveau 3 op alle rubriccriteria.
5. M12 assessment >= 80%.
6. M3 human oversight design >= 80%.
7. M8 evidence/audit trail >= 80%.

Assessment M12:

| Vraagtype | Aantal | Weging | Doel |
|---|---:|---:|---|
| quiz_mc | 5 | 25% | Rollen, HRAIS eisen, governance |
| quiz_ms | 2 | 20% | Controls, logs, data governance |
| quiz_tf | 3 | 15% | Misvattingen en compliance boundaries |
| short_answer | 2 | 20% | Incident/escalatie en supplier/GPAI |
| governance-case M11 | 1 | 20% | Integraal compliance ontwerp |

Rubric governance-case:

- Risicotriage en scope.
- Governance-ontwerp en RACI.
- Human oversight by design.
- Data governance en bias mitigation.
- Logging, evidence en audit trail.
- Transparantie/FRIA/supplier due diligence.
- Implementatieplan en reviewcyclus.

Hard fail:

- Geen echte menselijke override bij hoge impact.
- Geen log/audit trail voor kritieke beslissingen.
- Hoog-risico of HR-use case behandelen als gewone prompttaak.
- Vendor/GPAI claims blind overnemen zonder due diligence.

### 7.7 Didactische media

| Pagina | Media | Doel |
|---|---|---|
| M02 | Fout-asymmetrie matrix | Risico beslisbaar maken |
| M03 | Ketenrollen schema | Provider/deployer/GPAI/supplier duidelijk maken |
| M05 | Oversight architecture blueprint | Stop-knop en override zichtbaar maken |
| M07 | Data governance canvas | Bias en representativiteit concretiseren |
| M08 | Log-to-incident timeline | Monitoring en audit trail oefenen |
| M11 | Compliance engineering systeemdiagram | HRAIS controls als bouwstenen |
| M11 | FRIA/QMS checklist | Governance-artefacten oefenen |
| M12 | Case-based assessment dashboard | Review transparant maken |

## 8. Gamification en leerstimulans

Gebruik lichte, professionele gamification:

- Competentiebadges per module.
- "Aangetoond", "nog oefenen", "review nodig" status.
- Certificaat-preview met ontbrekende evidence.
- Remediatielinks naar pagina's bij lage competentiescore.
- Rolpad-keuze in Proficiency.
- Bonusbadge voor optionele Literacy P14.
- Evidence-scorekaart voor Proficiency/Mastery.

Niet doen:

- Leaderboards tussen medewerkers.
- Punteninflatie of spelshow-achtige beloningen.
- Te veel harde gates in Literacy.
- Langere toetsen zonder feedback/herstelpad.

## 9. Wat uit Gemini nu kan worden geintegreerd

Direct integreren in ontwerp en later content:

1. Provider/deployer-rolherkenning in Literacy P4/P3.
2. Externen/freelancers expliciet noemen in doelgroep en evidence dossier.
3. Cognitive offloading vroeg in P1/P9/P10.
4. "AI-output is concept, geen besluit" als rode draad.
5. Evidence Dossier als compliance-verhaal en platformfeature.
6. SWAC-methodologie in Proficiency P04/P05/P06.
7. Fout-asymmetrie matrix in Proficiency en Mastery.
8. Rolspecifieke Proficiency pathways.
9. Mastery als compliance engineering route.
10. Human oversight by design inclusief stop-knop, override, alert fatigue.
11. Logging, audit trail en reviewcyclus in Mastery.
12. Multidisciplinaire samenwerking als leerdoel in Mastery.
13. Regulatory sandbox als optionele advanced route, met voorbehoud dat toepassing per organisatie verschilt.

## 10. Wat verdere specificatie of review nodig heeft

Juridische specificatie nodig:

1. Definitieve Digital Omnibus-tekst en status van Article 4-wijzigingen.
2. Exacte deadlines voor hoog-risico AI-systemen na formele publicatie.
3. Toevoeging/interpretatie van "nudifiers" of non-consensuele intieme beelden als verboden praktijk of afzonderlijke verplichting.
4. Nederlandse toezichthoudersverdeling na afronding consultatie Uitvoeringswet AI-verordening.
5. Rol van AP/RDI sandbox in praktische MKB-processen.

Privacy/DPO-review nodig:

1. Privacy data-matrix: formuleringen rond "mag wel".
2. Toolkeuze en promptsanering: wanneer klantdata in goedgekeurde workspace mag.
3. HR-cases en personeelsmonitoring.
4. Anonimisering versus pseudonimisering.
5. Bewaartermijnen en audit-export voor evidence dossier.

Didactische specificatie nodig:

1. B1/B2 taalniveau per module.
2. Rolpad-keuze en verplichte/optionele Proficiency onderdelen.
3. Remediatieflow bij onvoldoende C4/C6/P4/P7/M3/M8.
4. Rubricniveau's voor manual review.
5. Maximaal aantal herkansingen en hertraject.

Technische specificatie nodig:

1. Normalisatie van competency codes voor Proficiency en Mastery.
2. Evidence dossier export en admin dashboard.
3. Versioning van cursuscontent en certificaten.
4. SQL-pariteit voor certificeringschecks waar direct database-RPC's blijven bestaan.
5. Role-based learning paths in learner UI.

## 11. Aanbevolen volgende stappen

1. Valideer juridisch de bronstatus rond Digital Omnibus en Nederlandse uitvoeringswet.
2. Zet AI Literacy ontwerp bij naar: 75% totaal, C4/C6 80%, C8 niet als losse blocker.
3. Voeg provider/deployer en externen expliciet toe aan Literacy P3/P4.
4. Voeg SWAC en fout-asymmetrie toe aan Proficiency P04/P05/P06.
5. Herontwerp Proficiency als kernroute + rolpaden.
6. Schrijf Mastery om naar compliance engineering met HRAIS, FRIA, logging, QMS en GPAI due diligence.
7. Maak Evidence Dossier als aparte productfunctie en export.
8. Laat DPO/juridisch reviewen voordat privacy-, HR- en verbodencases als definitieve toetsitems gelden.
