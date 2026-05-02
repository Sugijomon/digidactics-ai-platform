# Shadow AI Scan / SAI

Productoverzicht en startdocument voor de Shadow AI Scan binnen het Digidactics AI Platform.

## Metadata

| Veld | Inhoud |
|---|---|
| Productnaam | Shadow AI Scan / SAI |
| Doel | Werkgerelateerd AI-gebruik veilig en anoniem inventariseren, risico- en governancepatronen zichtbaar maken en DPO-triage ondersteunen. |
| Voor wie | Productowner, architect, DPO, ontwikkelaar, implementatiepartner. |
| Leidend voor | Productpositionering, scope, documenthierarchie en implementatiegrenzen. |
| Niet leidend voor | Exacte database-DDL, detailformules, juridische eindkwalificaties of UI-pixelperfectie. |
| Status | Bijgewerkt voor de nieuwe Next.js/Supabase-platformrepo en SAI V8.1. |

## 1. Wat de Shadow AI Scan is

De Shadow AI Scan is de eerste productmodule van het bredere Digidactics AI Platform / RouteAI. De scan brengt werkgerelateerd AI-gebruik in kaart zonder individuele handhaving als doel.

De scan inventariseert:

- welke AI-tools medewerkers gebruiken;
- waarvoor zij die tools gebruiken;
- binnen welk vakgebied zij actief zijn;
- met welk accounttype tools worden gebruikt;
- welke datatypen worden verwerkt;
- waar governance-, exposure-, review- en interventiesignalen ontstaan.

De scan is geen juridische eindbeoordeling en geen technische enforcementlaag. De scan levert bestuurlijke urgentie, DPO-triage en input voor betere governance.

## 2. Waarheidshierarchie

Voor implementatie geldt deze volgorde:

1. `docs/survey-flow-spec.md` is leidend voor surveyflow, vraagvolgorde, exitpad en medewerkerervaring.
2. `docs/database-model.md` is leidend voor het beoogde SAI-datamodel en naamgeving.
3. `Shadow_AI_Scan_Scoring_V8_1.docx` en `docs/risk-engine-spec.md` zijn leidend voor scorelogica, boosts, reviewtriggers en auditability.
4. `docs/architecture.md` en `B3_SCAN_ARCHITECTUUR_UPDATED.md` zijn leidend voor technische architectuur, auth, RLS en migratiekeuzes.
5. Dashboard HTML en `Dashboard output.md` zijn leidend als ontwerp- en outputreferentie voor het DPO-dashboard.
6. Lovable-exports en oude RouteAI-code zijn referentiecontext, geen implementatiefundament.

Als oude Lovable-code of oude databasevelden conflicteren met SAI V8.1, het nieuwe datamodel of de repo-documentatie, dan volgen we de nieuwe documentatie.

Documentatieregel:

- ieder document heeft een primaire functie;
- ieder inhoudelijk onderwerp heeft een leidende bron;
- bij wijzigingen wordt eerst de leidende bron bijgewerkt en daarna alleen de documenten die daarnaar verwijzen.

Daarmee voorkomen we dat surveyflow, datamodel, scorelogica, dashboardoutput en platformarchitectuur onbedoeld meerdere waarheden krijgen.

## 3. Productprincipe

Het kernprincipe blijft:

> Eerst zicht op feitelijk gebruik, daarna gerichte governance.

Daaruit volgen vier keuzes:

- de scan is neutraal en disclosure-gericht;
- awareness wordt in de flow verweven, niet als losse training ervoor gezet;
- survey-inhoud wordt niet gebruikt voor individuele handhaving;
- deelname, reminders en participatie worden via een aparte privacyveilige laag gevolgd.

## 4. Wat de scan nadrukkelijk niet is

De Shadow AI Scan is niet:

- een juridisch eindoordeel;
- een individueel handhavingsinstrument;
- een automatische sanctiemachine;
- een netwerkmonitor of blokkadelaag;
- een volledige AI literacy- of LMS-module;
- een vervanging van RouteAI als breder governanceplatform.

RouteAI blijft de vervolglaag voor use-casebeoordeling, compliance passport, model/tool library, training, beleid en structurele borging.

## 5. V8.1-scorearchitectuur in een zin

De scan rekent niet met een enkel oud risicogetal. V8.1 splitst de uitkomst in:

- `shadow_score`: governance-afwijking op basis van organisatiebeleid/toolstatus;
- `exposure_score`: blootstelling vanuit toepassing, context, account, datatype, frequentie en technische versnellers;
- `priority_score`: DPO-triage op basis van shadow, exposure, toxic boost en reviewtriggers.

Een goedgekeurde tool kan dus `shadow_score = 0` hebben en toch een hoge `exposure_score` of reviewtrigger krijgen, bijvoorbeeld bij gevoelige data.

## 6. Governance-lagen

Deze lagen moeten gescheiden blijven:

- `org_policy_status`: organisatiebesluit over gebruik, beheerd in Tool Inventaris / DPO-dashboard;
- `eu_ai_act_flag`: indicatief signaal voor DPO-review, geen juridisch eindlabel.

SAI gebruikt geen aparte `catalog_beheerstatus`. Voor scoring is de organisatie-toolstatus leidend. Bij geen match geldt een nieuw ontdekte of niet-beoordeelde tool als governancekloof in behandeling. Toekomstige RouteAI Model Library-statussen blijven aparte curatie- en typekaartmetadata, niet de SAI-scorelaag.

## 7. Wat de scan oplevert

Voor DPO en organisatie:

- toolinventaris;
- shadow- en exposure-hotspots;
- toxic combinations;
- DPO-triage en reviewlijsten;
- awareness- en policy-readiness-signalen;
- innovatie- en ondersteuningsbehoeften;
- input voor interventies, beleid, training en veilige alternatieven.

Voor medewerkers:

- een veilige manier om feitelijk AI-gebruik zichtbaar te maken;
- korte, relevante uitleg over veilig gebruik tijdens de scan;
- indirect betere ondersteuning, tooling en beleid.

De scan toont geen individuele risicoscore aan medewerkers. Terugkoppeling aan medewerkers of organisatiebrede publicatie hoort bij DPO-communicatie en de latere Rapportage-module.

## 8. Implementatiecontext

De nieuwe implementatie wordt gebouwd in de `digidactics-ai-platform` repo:

- Next.js App Router;
- TypeScript;
- Tailwind/shadcn-ui;
- Supabase Auth/Postgres/RLS;
- GitHub als source of truth;
- Vercel voor deployments;
- SAI als eerste echte app binnen een lean monorepo.

Lovable blijft alleen migratie- en referentiecontext. Oude SAI-tabellen, oude scorelogica en oude UI-componenten mogen niet automatisch als basis worden overgenomen.

## 9. Eerste implementatiedoel

De eerste productiefase is een schone SAI-basis:

1. repo- en documentatiefundament afronden;
2. Supabase schema en RLS voorbereiden;
3. auth, rollen, organisaties en uitnodigingen correct aansluiten;
4. surveyflow bouwen op basis van de HTML-referentie en `docs/survey-flow-spec.md`;
5. score-engine server-side of gedeeld in `packages/domain` implementeren;
6. DPO-dashboard light bouwen op basis van de goedgekeurde HTML-referenties.

## 10. Besluiten

Vastgelegd voor de nieuwe bouw:

- oude Lovable-testdata niet migreren naar het nieuwe SAI-model;
- bestaande auth, organisaties, profielen en rollen waar mogelijk wel behouden/importeren;
- geen structurele `/shadow-survey-v2` route bouwen;
- geen individuele medewerkerterugkoppeling vanuit de scan;
- publiek scoreboard / organisatiebrede rapportage later bepalen bij de Rapportage-module;
- `work_domain_code` / vakgebied gebruiken in plaats van afdeling als primaire surveyvraag.

## 11. Samenvatting

De Shadow AI Scan is de compacte intake- en triagemodule voor Shadow AI binnen het bredere Digidactics AI Platform. SAI moet commercieel eenvoudig blijven, maar technisch op dezelfde fundering staan als RouteAI: gedeelde auth, gedeeld datamodel, gedeelde risk-engine en gedeelde governanceconcepten.

Einde document.
