# AI-Foto Scan Data Gap Analyse

Status: werkdocument, opgesteld op basis van de AI-Foto herontwerpdocumenten en de huidige SAI / Shadow AI Scan V8.1 specificatie. Eerste technische doorvertaling gestart in `supabase/migrations/20260803120000_add_ai_foto_scan_variant.sql`.

## Doel

Dit document beantwoordt twee vragen:

1. Welke data zou de medewerkersscan binnen AI-Foto moeten opleveren?
2. Hoe verhoudt die gewenste output zich tot de vragen, opslag en output van de huidige Shadow AI Scan?

De analyse gaat over product- en datamodelpassing. Dit document wijzigt geen scoringlogica, Supabase schema of juridische interpretatie.

## Gebruikte bronnen

AI-Foto bronnen:

- `D:/AI-Foto_Productanalyse_v2.1.md`
- `D:/AI-Foto_Productdelta_v1_0.md`
- `D:/AI-Foto_Productkaart_Klant_v1.2.md`
- `D:/AI-Foto_Delivery_Blueprint_v1_3.md`
- `D:/AI-Foto_Fase_2_Handleiding_Inventariseren_v0.1.md`
- `D:/AI-Foto_Fase_2_Reverse_Engineering_Aandachtspunten_Vaardigheden_v0.1.md`
- `D:/AI-Foto_Intakechecklist_v2.0.md`
- `D:/AI-Foto_Integrale_Consistentiecheck_Scan_Drie_Kaarten_v0.2.md`

Huidige SAI bronnen:

- `docs/survey-flow-spec.md`
- `docs/database-model.md`
- `docs/risk-engine-spec.md`
- `references/source-docs/sai/survey/vragen-antwoorden-overzicht-V8.md`
- `apps/sai/lib/sai-survey/options.ts`
- `packages/domain/src/risk-engine.ts`
- `supabase/migrations/20260504110000_v8_1_target_schema.sql`

## Kernconclusie

De huidige scan is sterk als Shadow AI Scan: zij vindt breed AI-gebruik, tools, use-cases, accounttypen, datagebruik, frequentie, policy awareness, vaardighedenbeeld, supportbehoefte en scoring-/reviewtriggers.

Voor AI-Foto is dat een goede basis, maar niet genoeg als directe voeding voor de drie kaarten en besluitagenda. AI-Foto vraagt om een analyseerbare eenheid:

```txt
segment + tool/functie + concrete toepassing + data + account/omgeving + outputbestemming + menselijke controle + mensimpact + waarde + vaardigheids- en aandachtssignalen
```

De huidige scan slaat veel elementen los van elkaar op. Daardoor kan de analyse vaak wel zeggen dat een respondent of groep bepaalde tools, data, accounts en controlepatronen noemt, maar niet altijd dat die elementen bij dezelfde concrete toepassing horen.

De belangrijkste productwijziging is daarom niet een volledig nieuwe scan, maar een verdiepingslaag: laat respondenten na de brede toolinventaris maximaal een primaire, en eventueel een tweede, concrete toepassing kiezen en leg daar de AI-Foto velden aan vast.

## Wat AI-Foto Uit De Scan Nodig Heeft

AI-Foto gebruikt de scan niet als zelfstandig eindrapport, maar als een bron in triangulatie met management-/rolinterviews, systeeminput en deskresearch. De scan moet vooral breedte, patronen, spreiding en verdiepingskandidaten leveren.

| AI-Foto outputgebied | Benodigde scandata | Reden |
|---|---|---|
| AI-gebruikslandschap | Rolgroep/segment, gebruiksfrequentie, tools, ingebouwde functies, use-cases, accounttype, datacategorieen, extensies, agents/koppelingen | Laat zien waar en waarvoor AI wordt gebruikt, inclusief formeel en informeel gebruik. |
| Tool-toepassing-data-context-impactmatrix | Concrete toepassing, taak/procescontext, data, account/omgeving, outputbestemming, controle, mensimpact | Centrale analyse-eenheid van AI-Foto. Nodig om signalen niet los van hun werkcontext te interpreteren. |
| Waardekaart | Type waarde, begunstigde, frequentie per toepassing, netto-effect, controle-/herstelwerk, voorbeeld/bewijsindicatie, deelbaarheid, voorwaarden | Waarde moet meer zijn dan motivatie. AI-Foto moet kunnen onderscheiden tussen gesteld, aannemelijk en aangetoond. |
| Aandachtspuntenkaart | Feitelijke waarneming, signaalcategorie, data/account/output/controle/mensimpact, ontbrekende feiten, bijna-missers, transparantie, eigenaarschap/escalatie | De kaart geeft operationele routes, geen juridische eindkwalificaties. Survey levert kandidaten en spreiding. |
| Vaardighedenkaart | Rolgroep, toepassing, veilig gegevensgebruik, outputcontrole, hallucinatie/bias-herkenning, transparantie, menselijk toezicht/afwijken, leveranciersbewustzijn, escaleren bij twijfel, supportbehoefte | De kaart is een behoeftebeeld, geen competentietoets. Zelfscore alleen is onvoldoende. |
| Kandidaat-AI-inventaris | Tool/functie, toepassing, eigenaar onbekend/bekend, leveranciers-/systeeminformatie onbekend, data en outputdoorwerking, reviewreden | Eerste registerbasis, geen juridisch compleet AI-register. |
| Management-werkvloerverschil | Medewerkerspatronen die vergelijkbaar zijn met formele tool-/systeemlijsten en managementverwachtingen | Het verschil tussen formeel beeld en werkpraktijk is een kernuitkomst. |
| Besluit- en eigenaarschapsagenda | Prioritaire kandidaten, open feitenvragen, tijdelijke voorzorgssignalen, supportbehoeften | De scan bereidt besluitpunten voor; eigenaar, termijn en definitieve route komen uit analyse en sessie. |
| Medewerkersterugkoppeling | Geaggregeerde patronen, supportbehoeften, zorgen, sterke praktijken, beperkingen door respons/segmentatie | Terugkoppeling moet vertrouwelijk en geaggregeerd blijven. |

## Huidige Scan: Vragen En Potentiele Output

| Huidig scherm / data | Huidige vragen of opslag | Potentiele output nu | Dekking voor AI-Foto |
|---|---|---|---|
| Werkplek / vakgebied | `department_code` in huidige schema, productterm in docs is Vakgebied | Segmentatie naar rolgroep/vakgebied | Bruikbaar, maar kleine segmenten moeten worden samengevoegd. |
| Frequentie | `ai_frequency_code` | Algemene AI-gebruiksfrequentie en exit path bij geen gebruik | Bruikbaar voor breedte; onvoldoende omdat frequentie niet per toepassing is gekoppeld. |
| Motivatie | `survey_motivation` | Tijdwinst, kwaliteit, complexe taken, inspiratie, experimenteren | Goed als waardesignaal; geen bewijs van waarde of netto-effect. |
| Geen AI-gebruik | `no_ai_reason_code` | Reden voor niet-gebruik | Bruikbaar voor vaardighedenkaart en adoptiebeeld. |
| Toolpicker | `survey_tool`, tool catalog/discovery | Gekozen tools, nieuwe/onbekende tools, org policy snapshot | Sterk voor AI-gebruikslandschap en kandidaat-inventaris. |
| Use-cases per tool | `survey_tool_use_case` | Brede toepassing per tool | Goede basis, maar te grof voor AI-Foto kaartregels. |
| Context per use-case | `survey_tool_use_case_context` | Contextcodes zoals intern, klantgericht, beslisondersteuning, personenbesluit, HR, kritisch systeem | Zeer relevant, maar nu vooral code-/diagnostisch gericht en niet breed genoeg toegepast als concreet use-case-record. |
| Datatype | `survey_data_type` | Data sensitivity boost en datapatronen | Sterk als algemeen signaal; onvoldoende als niet bekend is welke data bij welke tool/toepassing hoort. |
| Data awareness | `data_awareness_code` | Privacy-/databewustzijn | Bruikbaar voor vaardighedenkaart en governance-inzicht. |
| Anonimisering | `anonymization_behavior_code` | Zelfgerapporteerd veilig gegevensgedrag | Bruikbaar maar te algemeen; moet concreter worden dan "anonimiseren". |
| Accountmatrix | `survey_tool_account` | Accounttype per tool | Goed; moet voor AI-Foto gekoppeld worden aan toepassing, data en output. |
| Browserextensies | `browser_extension_usage_code` | Extension signal en exposure boost | Goed als aandachtspunt; mist geraakt systeem/data. |
| Agents/automatisering | `automation_usage_code`, agentic boost/triggers | Agentic/automation signalen, reviewtriggers | Goed voor risicoprofiel; AI-Foto vraagt aanvullende context over gekoppelde systemen en outputdoorwerking. |
| Policy awareness | `ai_policy_awareness_code` | Bekendheid met spelregels | Goed eerste signaal; niet genoeg om handelingsvaardigheid te beoordelen. |
| Toolvoorkeur | `survey_tool_preference_reason` | Snelheid, functionaliteit, kwaliteit, gemak, samenwerking | Waarde- en business-case-signaal; niet per toepassing of bewijsniveau. |
| AI skill level | `ai_skill_level_code` | Zelfinschatting beginner-gemiddeld-gevorderd-expert | Alleen gebruiken als perceptie/segmentatie, niet als competentiebewijs. |
| Output handling | `processing_output_code` | Direct overnemen, handmatig controleren, ruwe opzet | Relevant, maar te algemeen. AI-Foto heeft outputbestemming, controle en afwijkingsruimte per toepassing nodig. |
| Zorg | `survey_top_concern` | Privacy, accuratesse, kosten, leercurve, geen zorgen | Bruikbaar als perceptie en interviewselectie, geen feitelijke aandachtspuntregel. |
| Toekomstkansen | `future_usecases_text` | Open tekst over werkzaamheden voor AI-ondersteuning | Nuttig voor innovatie/roadmap, maar kan richting aparte kansenscan schuiven. Vrije tekst vraagt herleidbaarheidscontrole. |
| Supportbehoefte | `survey_support_need` | Beleid, voorbeelden, training, oefenen, licenties, technisch advies | Sterk voor Vaardighedenkaart; beter als gekoppeld aan concrete toepassing/rolgroep. |
| Ambassadeur opt-in | `survey_run_ambassador_opt_in` | Vrijwillige contactroute | Bruikbaar voor interviews/AI-kopgroep, mits technisch gescheiden van inhoudelijke antwoorden. |
| Risicoscores | `risk_result`, `risk_result_tool` | Shadow, exposure, priority, tiers, reviewtriggers | Goed voor SAI/DPO triage. AI-Foto moet deze niet presenteren als juridische classificatie of enige lens. |
| Reviewqueue | `dpo_review_items` | Open DPO-review op triggers | Bruikbaar als aandachtssignaal, maar AI-Foto vereist broncontext, ontbrekende feiten, route, eigenaar en termijn. |

## Belangrijkste Gaten Tussen AI-Foto En Huidige Scan

| Gewenste AI-Foto data | Huidige dekking | Gap |
|---|---|---|
| Concrete toepassing / recente taak | Brede use-case per tool | Te abstract; mist taak, proces en voorbeeld. |
| Een record per toepassing | Data verspreid over run-, tool- en profielniveau | Niet altijd herleidbaar welke data/account/output bij welke toepassing hoort. |
| Frequentie per toepassing | Algemene frequentie per respondent | Geen zicht op welke toepassing dagelijks of incidenteel is. |
| Outputbestemming | Brede use-case en algemene output handling | Mist intern/extern/systeem/advies/persoonsbesluit. |
| Menselijke controle per toepassing | Algemene vraag over output verwerken | Mist wie controleert, wanneer, en met welk mandaat. |
| Afwijkingsruimte | Niet gevraagd | Essentieel voor menselijk toezicht en high-impact toepassingen. |
| Mensimpact | Context deels aanwezig | Niet structureel voor alle toepassingen; nodig voor klanten, medewerkers, kandidaten, belangrijke besluiten. |
| Transparantie | Niet gevraagd | Nodig voor AI-Foto aandachtspunten en vaardigheden. |
| Bijna-missers/fouten | Alleen zorgen over accuratesse/privacy | Geen veilige gesloten signalering van correctie, fout, overleg of incidentroute. |
| Eigenaarschap / aanspreekpunt | Niet gevraagd | Survey kan bekendheid met route meten; formeel eigenaarschap komt uit interviews/deskresearch. |
| Waarde-begunstigde | Niet gevraagd | AI-Foto moet weten voor wie waarde ontstaat en of werk verschuift. |
| Netto-effect | Motivatie en outputcontrole los | Geen beeld van controle-/herstelwerk of negatieve effecten. |
| Bewijsniveau waarde | Niet gevraagd | Survey kan voorbeeld/signaal geven; bewijsniveau moet via triangulatie. |
| Deelbaarheid / opschaalbaarheid | Indirect via samenwerking/support | Niet direct genoeg voor Waardekaart. |
| Vaardigheid als handeling | Zelfscore en supportbehoefte | Mist scenario's rond data, output, bias, transparantie, afwijken en escalatie. |
| Leveranciers-/systeeminformatie | Niet uit medewerkersscan | Terecht via IT/deskresearch; scan kan alleen onzekerheid signaleren. |
| Operationele route 1-4 | Niet gevraagd | Terecht niet door survey bepaald; analyse/sessie bepaalt route. |
| Eigenaar, deadline, bewijsverwachting | Niet gevraagd | Terecht besluitvormingsoutput, geen respondentvraag. |

## Aanbevolen Minimaal Outputrecord

Voor AI-Foto zou de scan minimaal een verdiept record moeten kunnen opleveren voor een primaire toepassing.

```txt
survey_application
  survey_run_id
  segment_code / work_domain_code
  survey_tool_id
  tool_code_or_name
  use_case_code
  application_label_or_task_code
  short_task_description_limited
  application_frequency_code
  account_environment_code
  data_type_codes
  output_destination_code
  output_control_code
  deviation_authority_code
  people_impact_code
  transparency_code
  value_type_codes
  beneficiary_code
  net_effect_code
  control_or_rework_code
  shareability_code
  condition_needed_codes
  near_miss_signal_codes
  escalation_route_awareness_code
  support_need_codes
```

Vrije tekst moet beperkt blijven, apart worden behandeld en niet in score breakdowns of standaard klantoutputs terechtkomen.

## Voorgestelde Vraaglaag Per Primaire Toepassing

Na toolpicker en use-case selectie:

| Module | Vraagdoel | Voorbeeldvelden |
|---|---|---|
| Selectie primaire toepassing | Welke gekozen toepassing verdiepen we? | tool, use_case, concrete taak, frequentie |
| Waarde | Wat verandert er feitelijk? | type waarde, begunstigde, netto-effect, controle-/herstelwerk, deelbaarheid |
| Data en omgeving | Welke informatie en accountomgeving? | data_type_codes, account_environment_code |
| Output en controle | Waar gaat output heen en wie controleert? | output_destination, output_control, deviation_authority |
| Mensimpact en transparantie | Kan dit mensen/besluiten raken en is AI-gebruik zichtbaar? | people_impact, transparency |
| Bijna-misser en escalatie | Is extra correctie/overleg nodig geweest en weet men waarheen? | near_miss_signal, escalation_route_awareness |
| Vaardigheden | Wat doet iemand bij twijfel? | scenario-antwoorden voor data, output, bias, afwijken, escaleren |
| Ondersteuning | Wat is nodig om dit veilig en nuttig te doen? | support_need per toepassing |

## Taakverdeling: Wat Komt Uit De Scan En Wat Niet?

| Uitkomst | Scan | Interviews / deskresearch | Beslissessie |
|---|---|---|---|
| Breed gebruikslandschap | Primair | Aanvullen met formele tool-/systeemlijst | Valideren op herkenbaarheid |
| Concrete kandidaat-toepassingen | Primair voor signalering | Casus reconstrueren en tegenbewijs zoeken | Prioriteren |
| Waardesignalen | Richting, spreiding, voorbeeld | Bewijs, mechanisme, tegenbewijs, KPI's | Besluiten wat deelbaar/opschaalbaar is |
| Aandachtspunten | Kandidaatsignalen | Feiten, ontbrekende informatie, leveranciers-/systeemcontext | Route, eigenaar, termijn, voorzorg |
| Vaardigheidsbehoeften | Perceptie, gedragssignalen, scenario's | Context, organisatorische condities, bestaande training | Interventies en eigenaar |
| Kandidaat-inventaris | Tool + toepassing + signalen | Formele eigenaar, leverancier, documentatie | Registratie-/reviewbesluit |
| Juridische classificatie / DPIA | Niet doen | Alleen specialistische route voorbereiden | Besluiten over verwijzing |
| 30/60/90-route | Input voor prioriteiten | Feiten en afhankelijkheden | Definitief bepalen |

## Implicaties Voor Product En Backlog

1. Behoud de huidige brede SAI inventaris: zij is waardevol voor tools, gebruik, data, accounts, governance awareness en scoring.
2. Voeg een AI-Foto verdiepingslaag toe rond een primaire concrete toepassing.
3. Koppel data, account, output, controle en mensimpact aan die toepassing, niet alleen aan respondent of tool.
4. Gebruik sociale indicatoren en vaardighedenvragen niet als risicoscorecomponent tenzij de risk-engine spec expliciet wordt aangepast.
5. Houd juridische duiding buiten de survey-output: de scan signaleert, AI-Foto trianguleert, specialisten kwalificeren waar nodig.
6. Scheid ruwe respondentdata, vrije tekst en contactgegevens strikt van klantoutput.
7. Rapporteer segmenten alleen volgens de afgesproken aggregatieregels, met minimumcelgrootte en beperkingen.
8. Positioneer `risk_result` en `dpo_review_items` als triage-input voor de Aandachtspuntenkaart, niet als eindkaart.
9. Maak de drie kaarten geen drie losse vragenlijsten; verzamel eenmalig per toepassing en routeer analytisch naar Waarde, Aandacht en Vaardigheden.

## Eindbeeld

De huidige SAI scan kan AI-Foto al voeden voor een nulmeting en brede signalering, maar alleen als de drie kaarten duidelijk als geaggregeerde, getrianguleerde analyseproducten worden behandeld.

Voor een sterk AI-Foto product is de minimale technische/productmatige aanpassing:

```txt
van: respondent + tools + losse profielsignalen
naar: respondentsegment + concrete toepassing + gekoppelde waarde/aandacht/vaardigheidssignalen
```

Daarmee blijft de scan kort en veilig, terwijl de output veel beter aansluit op het nieuwe product: een gedeeld organisatiebeeld, drie bruikbare kaarten, maximaal vijf besluitpunten en een 30/60/90-route.
