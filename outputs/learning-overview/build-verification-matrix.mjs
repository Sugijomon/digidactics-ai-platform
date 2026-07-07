import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs/learning-overview");
const outputPath = path.join(outputDir, "routeai-verificatiematrix-ai-curriculum.xlsx");
const generatedAt = new Date();

const sourceRows = [
  {
    sourceId: "SRC-EU-AIACT-NL",
    title: "EUR-Lex: Verordening (EU) 2024/1689, NL tekst",
    type: "Primaire juridische bron",
    url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=nl",
    checkedOn: "2026-05-29",
    relevantFor: "Article 4, definities provider/deployer, AI-geletterdheid, GPAI, sandbox",
    reliability: "Hoog",
    note: "Gebruik als basis voor huidige geldende tekst zolang Omnibus niet formeel is aangenomen/gepubliceerd.",
  },
  {
    sourceId: "SRC-EC-QA",
    title: "European Commission: AI Literacy Questions & Answers",
    type: "Officiele guidance / Q&A",
    url: "https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers",
    checkedOn: "2026-05-29",
    relevantFor: "Minimuminhoud AI literacy, other persons, documentatie, enforcement, Article 4",
    reliability: "Hoog",
    note: "Ondersteunt risicogebaseerde training, interne records en doelgroepdifferentiatie.",
  },
  {
    sourceId: "SRC-EP-OMNIBUS",
    title: "European Parliament: AI Act simplification deal",
    type: "Officiele persinformatie voorlopig akkoord",
    url: "https://www.europarl.europa.eu/news/en/press-room/20260427IPR42011/",
    checkedOn: "2026-05-29",
    relevantFor: "Voorlopige high-risk deadlines, watermarking, nudifier/CSAM-ban",
    reliability: "Hoog, maar voorlopig",
    note: "Nog niet hetzelfde als formeel aangenomen wettekst.",
  },
  {
    sourceId: "SRC-COUNCIL-OMNIBUS",
    title: "Council of the EU: AI simplification provisional agreement",
    type: "Officiele persinformatie voorlopig akkoord",
    url: "https://www.consilium.europa.eu/en/press/press-releases/2026/05/07/artificial-intelligence-council-and-parliament-agree-to-simplify-and-streamline-rules/",
    checkedOn: "2026-05-29",
    relevantFor: "Voorlopige Omnibus-status, high-risk data, volgende stappen",
    reliability: "Hoog, maar voorlopig",
    note: "Bevestigt dat formele adoptie en juridisch-linguistische revisie nog volgen.",
  },
  {
    sourceId: "SRC-RIJK-TOEZICHT",
    title: "Rijksoverheid: toezicht op Europese AI-regels",
    type: "Nederlandse overheidsbron",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/04/20/kabinet-zet-stap-met-toezicht-op-europese-ai-regels",
    checkedOn: "2026-05-29",
    relevantFor: "Voorgenomen toezichtstructuur, AP/RDI coordinerende rol, consultatie",
    reliability: "Hoog, maar wetsvoorstel/consultatie",
    note: "Niet als definitief toezichtmodel formuleren tot wetgeving is afgerond.",
  },
  {
    sourceId: "SRC-UAIV",
    title: "Internetconsultatie: Uitvoeringswet AI-verordening",
    type: "Conceptwet / consultatie",
    url: "https://www.internetconsultatie.nl/uaiv",
    checkedOn: "2026-05-29",
    relevantFor: "Nederlandse uitvoering, operatorrollen, markttoezicht",
    reliability: "Hoog voor conceptstatus",
    note: "Consultatie liep tot 2026-06-01; monitor opvolgende Kamerstukken.",
  },
];

const verificationRows = [
  {
    id: "V01",
    point: "Definitieve juridische status Digital Omnibus en exacte tekstwijziging Article 4",
    priority: "Hoog",
    currentFinding:
      "Er is een voorlopig akkoord; de huidige EUR-Lex tekst van Article 4 blijft leidend totdat formele adoptie/publicatie rond is.",
    sourceIds: "SRC-EU-AIACT-NL, SRC-EC-QA, SRC-EP-OMNIBUS, SRC-COUNCIL-OMNIBUS",
    status: "Review nodig",
    implementNow: "Gedeeltelijk",
    nowAction:
      "Voeg statuslabels toe: 'huidige geldende tekst' versus 'voorlopig akkoord'. Vermijd harde claims over gewijzigde Article 4-tekst.",
    needs: "Juridische review na formele publicatie in EUR-Lex.",
    owner: "Legal/compliance",
    curriculumImpact: "Beperkt tekstkader in Literacy P4/P15 en curriculumrapport.",
    repoImpact: "Bronnenregister + legal status badge in rapport/content.",
  },
  {
    id: "V02",
    point: "Exacte deadlines voor Annex III/high-risk verplichtingen na formele publicatie",
    priority: "Hoog",
    currentFinding:
      "Voorlopig akkoord noemt 2 december 2027 voor stand-alone high-risk use cases en 2 augustus 2028 voor product-embedded high-risk AI.",
    sourceIds: "SRC-EP-OMNIBUS, SRC-COUNCIL-OMNIBUS",
    status: "Voorlopig geverifieerd",
    implementNow: "Ja, met disclaimer",
    nowAction:
      "Gebruik deadlines als 'voorlopig akkoord d.d. 7 mei 2026' in tijdlijn en Mastery planning. Zet follow-up reminder voor formele publicatie.",
    needs: "Definitieve datumcheck bij formele verordening.",
    owner: "Compliance/product owner",
    curriculumImpact: "AI Act tijdlijn en Mastery roadmap.",
    repoImpact: "Contentmetadata: last_verified_at + provisional flag.",
  },
  {
    id: "V03",
    point: "Juridische duiding non-consensuele intieme beelden/nudifier-bepalingen",
    priority: "Hoog",
    currentFinding:
      "Voorlopig akkoord bevat verbod op AI-systemen voor CSAM en intieme/sexueel expliciete weergave van identificeerbare personen zonder toestemming.",
    sourceIds: "SRC-EP-OMNIBUS, SRC-COUNCIL-OMNIBUS",
    status: "Voorlopig geverifieerd",
    implementNow: "Ja, veilig geformuleerd",
    nowAction:
      "Behoud eenvoudige rode vlag: nooit maken, vragen, gebruiken of verspreiden; stop en escaleer. Geen wetsartikelclaim of grafische details.",
    needs: "Juridische eindredactie na formele tekst en afstemming met privacy/HR-beleid.",
    owner: "Legal + DPO",
    curriculumImpact: "Literacy P5 rode vlag, toetsvraag en escalatiebeleid.",
    repoImpact: "Al contentmatig toegevoegd; later bronstatus uitbreiden.",
  },
  {
    id: "V04",
    point: "Definitieve Nederlandse toezichthoudersverdeling na consultatie Uitvoeringswet AI-verordening",
    priority: "Middel",
    currentFinding:
      "Voorgenomen model: tien bestaande toezichthouders; AP voor restgebieden; AP en RDI coordinerend. Consultatie liep tot 1 juni 2026.",
    sourceIds: "SRC-RIJK-TOEZICHT, SRC-UAIV",
    status: "Concept geverifieerd",
    implementNow: "Ja, met conceptlabel",
    nowAction:
      "Neem op als 'voorgenomen Nederlands toezichtmodel' en leg uit dat organisaties hun sectorspecifieke toezichthouder moeten checken.",
    needs: "Update na definitieve wet/Kamerbehandeling.",
    owner: "Compliance",
    curriculumImpact: "Mastery governance en Evidence Dossier context.",
    repoImpact: "Rapporttekst + bronstatus; geen harde cursusgate.",
  },
  {
    id: "V05",
    point: "Privacy/DPO-review op data-matrix, promptsanering, HR-cases en toolscope",
    priority: "Hoog",
    currentFinding:
      "Review is inhoudelijk noodzakelijk, maar kan voorbereid worden met een vaste DPO-checklist en export van relevante lespagina's.",
    sourceIds: "SRC-EU-AIACT-NL, SRC-EC-QA",
    status: "Interne review nodig",
    implementNow: "Ja",
    nowAction:
      "Maak DPO-reviewchecklist en markeer HR/privacy/toolscope-blocks als review_required. Verzamel vragen en beslispunten per pagina.",
    needs: "Formele DPO/FG of privacy officer akkoord.",
    owner: "DPO/privacy officer",
    curriculumImpact: "Data-matrix, promptsanering, HR- en financecases.",
    repoImpact: "Reviewmetadata, admin filter, exportlijst.",
  },
  {
    id: "V06",
    point: "B1/B2 taalniveau per module en doelgroep",
    priority: "Middel",
    currentFinding:
      "Didactische keuze, geen juridische blokkade. Voor NL MKB is B1/B2 per doelgroep haalbaar en direct te toetsen.",
    sourceIds: "Interne didactische norm",
    status: "Implementatieklaar",
    implementNow: "Ja",
    nowAction:
      "Voer taalniveau-pass uit: Literacy B1+, Proficiency B1/B2, Mastery B2. Voeg checklist toe aan contentreview.",
    needs: "Pilotfeedback van gemiddelde MKB-cursisten.",
    owner: "Didactiek/content",
    curriculumImpact: "Alle modules, vooral toetsvragen en case-instructies.",
    repoImpact: "Content QA checklist + copy pass.",
  },
  {
    id: "V07",
    point: "Proficiency rolpadkeuze: verplicht versus optioneel",
    priority: "Hoog",
    currentFinding:
      "Rolpaden kunnen nu als leerrouteconfiguratie worden ingericht zonder juridische afhankelijkheid.",
    sourceIds: "SRC-EC-QA",
    status: "Implementatieklaar",
    implementNow: "Ja",
    nowAction:
      "Definieer kernpad verplicht voor iedereen en rolpadblokken optioneel/verplicht per doelgroep: HR/Finance hogere reviewzwaarte.",
    needs: "Productbesluit over doelgroepselectie en dashboardweergave.",
    owner: "Product owner + didactiek",
    curriculumImpact: "Proficiency studieduur, slagingskans en relevantie.",
    repoImpact: "Course config: required_for_role, optional_role_path, role tags.",
  },
  {
    id: "V08",
    point: "Rubrics voor SWAC, fout-asymmetrie, Mastery governance-case en FRIA/QMS-artefacten",
    priority: "Hoog",
    currentFinding:
      "Rubrics kunnen als concept direct worden toegevoegd en later gekalibreerd met voorbeeldantwoorden.",
    sourceIds: "SRC-EC-QA, SRC-EU-AIACT-NL",
    status: "Implementatieklaar",
    implementNow: "Ja",
    nowAction:
      "Maak 4 conceptrubrics met hard-fail criteria, voldoende/sterk-niveau en reviewer guidance. Test met 10 voorbeeldantwoorden.",
    needs: "Kalibratiesessie met inhoudsdeskundige/reviewer.",
    owner: "Didactiek + reviewer lead",
    curriculumImpact: "Betere cesuur en hogere betrouwbaarheid assessment.",
    repoImpact: "Rubric JSON in blocks + admin review UI.",
  },
  {
    id: "V09",
    point: "Evidence Dossier export: velden, bewaartermijnen, auditrechten en admin dashboard",
    priority: "Hoog",
    currentFinding:
      "Velden/export kunnen nu als draft worden ontworpen; bewaartermijnen en rechten vragen privacy/juridisch akkoord.",
    sourceIds: "SRC-EC-QA",
    status: "Gedeeltelijk implementatieklaar",
    implementNow: "Gedeeltelijk",
    nowAction:
      "Maak exportveldenspecificatie en admin-overzicht: deelnemer, cursusversie, attempts, score, reviewstatus, certificaatstatus, last_verified.",
    needs: "DPO-besluit over bewaartermijn, inzage, verwijdering en auditrechten.",
    owner: "Product + DPO + engineering",
    curriculumImpact: "Aantoonbaarheid zonder overtoetsing.",
    repoImpact: "Exportfunctie, admin dashboard, datamodel review.",
  },
  {
    id: "V10",
    point: "SQL/app-pariteit voor certificeringschecks en access gates",
    priority: "Hoog",
    currentFinding:
      "Technisch direct testbaar: app-logica en databasefuncties moeten dezelfde eligibility/access-uitkomst geven.",
    sourceIds: "Interne technische kwaliteitsborging",
    status: "Implementatieklaar",
    implementNow: "Ja",
    nowAction:
      "Voeg parity tests toe voor learner attempts, competency gates, certificate eligibility en capability access.",
    needs: "Testdata fixtures en keuze waar single source of truth ligt.",
    owner: "Engineering",
    curriculumImpact: "Betrouwbare certificaatuitgifte en gating.",
    repoImpact: "Unit/integration tests + SQL fixture audit.",
  },
];

const implementRows = verificationRows
  .filter((row) => row.implementNow.startsWith("Ja") || row.implementNow === "Gedeeltelijk")
  .map((row) => ({
    id: row.id,
    implementatie: row.nowAction,
    waarde: valueFor(row.id),
    effort: effortFor(row.id),
    risk: riskFor(row.id),
    recommendedSprint: sprintFor(row.id),
    doneWhen: doneWhenFor(row.id),
  }));

const reviewRows = verificationRows
  .filter((row) => row.status.includes("Review") || row.needs.toLowerCase().includes("review") || row.needs.toLowerCase().includes("dpo"))
  .map((row) => ({
    id: row.id,
    punt: row.point,
    reviewOwner: row.owner,
    reviewQuestion: reviewQuestionFor(row.id),
    neededEvidence: row.sourceIds,
    decisionNeeded: row.needs,
  }));

const summaryRows = [
  ["RouteAI AI-curriculum verificatiematrix", ""],
  ["Gegenereerd op", generatedAt],
  ["Doel", "Verificeren welke onzekere punten bronbaar, implementeerbaar of review-afhankelijk zijn."],
  ["Totaal verificatiepunten", verificationRows.length],
  ["Nu implementeerbaar", verificationRows.filter((row) => row.implementNow.startsWith("Ja")).length],
  ["Gedeeltelijk implementeerbaar", verificationRows.filter((row) => row.implementNow === "Gedeeltelijk").length],
  ["Review nodig", reviewRows.length],
  ["Belangrijkste advies", "Implementeer nu bronstatus, rubrics, rolpadconfig, DPO-checklist, Evidence Dossier spec en parity tests; houd definitieve juridische claims op review."],
];

await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const summarySheet = workbook.worksheets.add("Samenvatting");
const matrixSheet = workbook.worksheets.add("Verificatiematrix");
const implementSheet = workbook.worksheets.add("Nu implementeren");
const reviewSheet = workbook.worksheets.add("Review backlog");
const sourcesSheet = workbook.worksheets.add("Bronnen");

summarySheet.getRangeByIndexes(0, 0, summaryRows.length, 2).values = summaryRows;
writeObjects(matrixSheet, verificationRows, [
  ["id", "ID"],
  ["point", "Punt"],
  ["priority", "Prioriteit"],
  ["currentFinding", "Huidige bevinding"],
  ["sourceIds", "Bronnen"],
  ["status", "Status"],
  ["implementNow", "Nu implementeren?"],
  ["nowAction", "Actie nu"],
  ["needs", "Nog nodig"],
  ["owner", "Owner"],
  ["curriculumImpact", "Curriculum impact"],
  ["repoImpact", "Repo/app impact"],
]);
writeObjects(implementSheet, implementRows, [
  ["id", "ID"],
  ["implementatie", "Implementatiepunt"],
  ["waarde", "Waarde"],
  ["effort", "Inspanning"],
  ["risk", "Risico"],
  ["recommendedSprint", "Aanbevolen sprint"],
  ["doneWhen", "Done when"],
]);
writeObjects(reviewSheet, reviewRows, [
  ["id", "ID"],
  ["punt", "Punt"],
  ["reviewOwner", "Review owner"],
  ["reviewQuestion", "Reviewvraag"],
  ["neededEvidence", "Bron/evidence"],
  ["decisionNeeded", "Besluit nodig"],
]);
writeObjects(sourcesSheet, sourceRows, [
  ["sourceId", "Bron ID"],
  ["title", "Titel"],
  ["type", "Type"],
  ["url", "URL"],
  ["checkedOn", "Geraadpleegd"],
  ["relevantFor", "Relevant voor"],
  ["reliability", "Betrouwbaarheid"],
  ["note", "Notitie"],
]);

styleSummary(summarySheet, summaryRows.length);
styleTable(matrixSheet, "A1:L" + rowCount(verificationRows));
styleTable(implementSheet, "A1:G" + rowCount(implementRows));
styleTable(reviewSheet, "A1:F" + rowCount(reviewRows));
styleTable(sourcesSheet, "A1:H" + rowCount(sourceRows));

matrixSheet.tables.add("A1:L" + rowCount(verificationRows), true, "VerificationMatrix");
implementSheet.tables.add("A1:G" + rowCount(implementRows), true, "NowImplement");
reviewSheet.tables.add("A1:F" + rowCount(reviewRows), true, "ReviewBacklog");
sourcesSheet.tables.add("A1:H" + rowCount(sourceRows), true, "Sources");

for (const sheet of workbook.worksheets.items) {
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(1);
  sheet.getUsedRange().format.wrapText = true;
  sheet.getUsedRange().format.autofitRows();
}

summarySheet.getRange("A:A").format.columnWidth = 34;
summarySheet.getRange("B:B").format.columnWidth = 96;
matrixSheet.getRange("A:A").format.columnWidth = 9;
matrixSheet.getRange("B:B").format.columnWidth = 54;
matrixSheet.getRange("C:G").format.columnWidth = 20;
matrixSheet.getRange("D:D").format.columnWidth = 58;
matrixSheet.getRange("H:I").format.columnWidth = 62;
matrixSheet.getRange("J:J").format.columnWidth = 24;
matrixSheet.getRange("K:L").format.columnWidth = 44;
implementSheet.getRange("A:A").format.columnWidth = 9;
implementSheet.getRange("B:B").format.columnWidth = 72;
implementSheet.getRange("C:G").format.columnWidth = 34;
reviewSheet.getRange("A:A").format.columnWidth = 9;
reviewSheet.getRange("B:D").format.columnWidth = 58;
reviewSheet.getRange("E:F").format.columnWidth = 52;
sourcesSheet.getRange("A:C").format.columnWidth = 26;
sourcesSheet.getRange("D:D").format.columnWidth = 74;
sourcesSheet.getRange("E:E").format.columnWidth = 18;
sourcesSheet.getRange("F:H").format.columnWidth = 48;

summarySheet.getRange("A2:B2").format.numberFormat = "yyyy-mm-dd hh:mm";

await workbook.inspect({
  kind: "table",
  range: "Verificatiematrix!A1:L11",
  include: "values",
  tableMaxRows: 12,
  tableMaxCols: 12,
  maxChars: 12000,
});
await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  maxChars: 2000,
});
await workbook.render({ sheetName: "Samenvatting", autoCrop: "all", scale: 1, format: "png" });
await workbook.render({ sheetName: "Nu implementeren", range: "A1:G12", scale: 1, format: "png" });

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

console.log(outputPath);
console.log(
  JSON.stringify({
    verificationPoints: verificationRows.length,
    implementNow: verificationRows.filter((row) => row.implementNow.startsWith("Ja")).length,
    partial: verificationRows.filter((row) => row.implementNow === "Gedeeltelijk").length,
    reviewItems: reviewRows.length,
  }),
);

function writeObjects(sheet, rows, columns) {
  const header = columns.map(([, label]) => label);
  const values = rows.map((row) => columns.map(([key]) => row[key] ?? ""));
  sheet.getRangeByIndexes(0, 0, Math.max(values.length + 1, 2), columns.length).values = [
    header,
    ...(values.length ? values : [columns.map(() => "")]),
  ];
}

function styleSummary(sheet, rows) {
  sheet.getRange("A1:B1").format = {
    fill: "#002B36",
    font: { bold: true, color: "#FFFFFF", size: 14 },
    wrapText: true,
  };
  sheet.getRange("A2:A" + rows).format.font = { bold: true, color: "#13201D" };
  sheet.getRange("A1:B" + rows).format.borders = {
    insideHorizontal: { style: "Continuous", color: "#D9E2E7" },
  };
  sheet.getRange("A1:B" + rows).format.font = { color: "#13201D" };
  sheet.getRange("A1:B1").format.font = { bold: true, color: "#FFFFFF", size: 14 };
}

function styleTable(sheet, rangeAddress) {
  const range = sheet.getRange(rangeAddress);
  const headerAddress = rangeAddress.replace(/:.*$/, ":1");
  sheet.getRange(headerAddress).format = {
    fill: "#002B36",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true,
  };
  range.format.font = { color: "#13201D" };
  range.format.borders = { insideHorizontal: { style: "Continuous", color: "#E3E7EA" } };
}

function rowCount(rows) {
  return Math.max(rows.length + 1, 2);
}

function valueFor(id) {
  return {
    V02: "Voorkomt verouderde AI Act-tijdlijn en geeft Mastery realistische planning.",
    V03: "Sterke veiligheids- en escalatieboodschap zonder juridisch te overclaimen.",
    V04: "Helpt MKB begrijpen waar toezicht mogelijk terechtkomt.",
    V05: "Voorkomt privacyblinde content en versnelt DPO-review.",
    V06: "Verhoogt slagingskans en verlaagt cognitieve belasting.",
    V07: "Maakt Proficiency relevanter en korter per doelgroep.",
    V08: "Maakt assessment betrouwbaarder en eerlijker.",
    V10: "Voorkomt certificaat- en access-gate inconsistenties.",
  }[id] ?? "Maakt onzeker punt beheersbaar zonder onnodig te wachten.";
}

function effortFor(id) {
  return {
    V02: "Laag",
    V03: "Laag",
    V04: "Laag",
    V05: "Middel",
    V06: "Middel",
    V07: "Middel",
    V08: "Middel/hoog",
    V09: "Middel/hoog",
    V10: "Middel",
  }[id] ?? "Middel";
}

function riskFor(id) {
  return {
    V02: "Laag mits provisional label",
    V03: "Laag mits veilige formulering",
    V04: "Laag mits conceptlabel",
    V05: "Middel: privacybesluiten niet invullen zonder DPO",
    V06: "Laag",
    V07: "Laag/middel",
    V08: "Middel: kalibratie nodig",
    V09: "Middel/hoog: bewaartermijnen en rechten vereisen DPO",
    V10: "Laag technisch risico",
  }[id] ?? "Middel";
}

function sprintFor(id) {
  return {
    V02: "Sprint 1: bronstatus en tijdlijn",
    V03: "Sprint 1: rode-vlagcopy en escalatie",
    V04: "Sprint 1: concept toezichtcontext",
    V05: "Sprint 1-2: reviewchecklist en metadata",
    V06: "Sprint 2: taalniveau-pass",
    V07: "Sprint 2: rolpadconfig",
    V08: "Sprint 2: rubric drafts",
    V09: "Sprint 2-3: exportspec + DPO besluitpunten",
    V10: "Sprint 1-2: parity tests",
  }[id] ?? "Sprint 2";
}

function doneWhenFor(id) {
  return {
    V02: "Elke deadline in content heeft bron, status en last-verified datum.",
    V03: "P5/P15 bevatten veilige stop-en-escalatieformulering zonder grafische details.",
    V04: "Nederlandse toezichttekst zegt expliciet 'voorgenomen' of 'concept' waar nodig.",
    V05: "DPO kan per pagina/block akkoord, wijziging of risico noteren.",
    V06: "Elke module heeft taalniveau-doel en contentreview op moeilijke zinnen.",
    V07: "Rolpadblokken hebben role tags en required/optional status.",
    V08: "Rubrics bestaan voor SWAC, fout-asymmetrie, Mastery governance en FRIA/QMS.",
    V09: "Exportveldenset is beschreven en bewaartermijn/rechten staan als DPO-besluitpunt.",
    V10: "Testfixtures tonen gelijke uitkomsten voor app eligibility en SQL/access gates.",
  }[id] ?? "Besluit en implementatie zijn traceerbaar in backlog en content.";
}

function reviewQuestionFor(id) {
  return {
    V01: "Welke Article 4-formulering mag RouteAI gebruiken tot formele Omnibus-publicatie?",
    V03: "Welke veilige juridische formulering rond nudifier/deepfake-misbruik past bij beleid en doelgroep?",
    V05: "Welke data mogen in prompts, examples, reviewlogs en Evidence Dossier staan?",
    V09: "Welke bewaartermijnen, rollen, exportrechten en verwijderrechten gelden voor Evidence Dossier?",
  }[id] ?? "Welke formulering/beslissing is veilig genoeg voor publicatie en implementatie?";
}
