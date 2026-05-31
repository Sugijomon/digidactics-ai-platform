import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { pathToFileURL } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const repoRoot = path.resolve("../../");
const outputDir = path.join(repoRoot, "outputs/learning-overview");
const outputPath = path.join(
  outputDir,
  process.env.LEARNING_OVERVIEW_OUTPUT ?? "digidactics-learning-cursusoverzicht-met-activiteiten.xlsx",
);
const modulePath = path.join(outputDir, "learning-preview-data.generated.mjs");
const generatedAt = new Date();
const blockTypeDictionary = loadBlockTypeDictionary();

const sources = await Promise.all(
  [
    "apps/rai/lib/ai-literacy-foundation-content.ts",
    "apps/rai/lib/ai-proficiency-content.ts",
    "apps/rai/lib/ai-mastery-content.ts",
    "apps/rai/lib/learning-preview-data.ts",
  ].map(async (relativePath) => {
    const source = await fs.readFile(path.join(repoRoot, relativePath), "utf8");
    return stripLocalLearningPreviewImports(source);
  }),
);

const generatedModule = sources
  .map((source) =>
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
        importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      },
    }).outputText,
  )
  .join("\n\n");

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(modulePath, generatedModule, "utf8");

const preview = await import(`${pathToFileURL(modulePath).href}?v=${generatedAt.getTime()}`);
const courses = [
  preview.aiLiteracyPreviewCourse,
  preview.aiProficiencyPreviewCourse,
  preview.aiMasteryPreviewCourse,
].filter(Boolean);

const pageRows = [];
const activityRows = [];

for (const course of courses) {
  for (const topic of course.topics) {
    for (const page of topic.pages) {
      const blocks = page.content?.blocks ?? [];
      const inferred = inferPageRecommendations(course, topic, page, blocks);
      const evidenceBlocks = blocks.filter((block) => inferEvidenceKind(block) !== "none");
      const blockTypes = unique(blocks.map((block) => block.type).filter(Boolean));

      pageRows.push({
        courseCode: course.course_code,
        courseTitle: course.title,
        courseLevel: course.difficulty_level,
        courseRequired: course.required_for_onboarding ? "Verplicht" : "Optioneel",
        passThreshold: course.passing_threshold,
        topicOrder: topic.sequence_order,
        topicCode: topic.topic_code,
        topicTitle: topic.title,
        pageOrder: page.sequence_order,
        pageCode: page.page_code,
        pageTitle: page.title,
        pageType: page.page_type,
        summary: page.summary ?? "",
        minutes: page.estimated_duration_minutes ?? 0,
        required: page.is_required ? "Ja" : "Nee",
        blockCount: blocks.length,
        blockTypes: blockTypes.join(", "),
        currentActivities: summarizeActivities(blocks),
        evidenceActivities: evidenceBlocks.length,
        certificateGate: hasCertificateGate(blocks) ? "Ja" : "Nee",
        competencies: unique(blocks.flatMap((block) => block.competency_codes ?? [])).join(", "),
        contentStatus: blocks.length ? "Ingevuld in preview/player" : "Pagina bestaat, contentblocks nog leeg",
        recommendedFormats: inferred.formats,
        recommendationReason: inferred.reason,
        claudeBrief: inferred.claudeBrief,
        learnerRoute: `/learning/${course.course_code}/${page.page_code}`,
        editorRoute: `/learning/admin/lessons/${page.page_code}?courseCode=${course.course_code}`,
      });

      blocks.forEach((block, blockIndex) => {
        const evidenceKind = inferEvidenceKind(block);
        activityRows.push({
          courseCode: course.course_code,
          courseTitle: course.title,
          topicOrder: topic.sequence_order,
          topicTitle: topic.title,
          pageOrder: page.sequence_order,
          pageCode: page.page_code,
          pageTitle: page.title,
          blockOrder: blockIndex + 1,
          blockId: block.id,
          blockType: block.type,
          activityType: activityLabel(block),
          activityPrompt: blockPrompt(block),
          evidenceKind,
          requiredForCertificate: block.required_for_certificate ? "Ja" : "Nee",
          competencies: (block.competency_codes ?? []).join(", "),
          reviewMode: reviewMode(block, evidenceKind),
          autoGradable: autoGradable(block) ? "Ja" : "Nee",
          contentFormAdvice: blockFormAdvice(block, page),
        });
      });
    }
  }
}

const courseRows = courses.map((course) => {
  const pages = preview.getCoursePages(course);
  const blocks = pages.flatMap((page) => page.content?.blocks ?? []);
  return {
    courseCode: course.course_code,
    courseTitle: course.title,
    subtitle: course.subtitle ?? "",
    description: course.description ?? "",
    level: course.difficulty_level,
    required: course.required_for_onboarding ? "Verplicht" : "Optioneel",
    passThreshold: course.passing_threshold,
    topicCount: course.topics.length,
    pageCount: pages.length,
    filledPages: pages.filter((page) => (page.content?.blocks ?? []).length > 0).length,
    activityCount: blocks.length,
    evidenceCount: blocks.filter((block) => inferEvidenceKind(block) !== "none").length,
    totalMinutes: pages.reduce((sum, page) => sum + (page.estimated_duration_minutes ?? 0), 0),
    learnerRoute: `/learning/${course.course_code}`,
    previewRoute: "/learning/preview",
  };
});

const blockTypeRows = Object.entries(blockTypeDictionary)
  .map(([blockType, meta]) => {
    const count = activityRows.filter((row) => row.blockType === blockType).length;
    return {
      blockType,
      currentCount: count,
      learnerActivity: meta.learnerActivity,
      bestUse: meta.bestUse,
      recommendedMedia: meta.recommendedMedia,
      claudeInstruction: meta.claudeInstruction,
    };
  })
  .sort((left, right) => left.blockType.localeCompare(right.blockType));

const pageTitleCounts = countBy(pageRows, (row) => normalize(row.pageTitle));
const pageCodeCounts = countBy(pageRows, (row) => row.pageCode);
const possibleDuplicateRows = pageRows
  .filter((row) => pageTitleCounts.get(normalize(row.pageTitle)) > 1 || pageCodeCounts.get(row.pageCode) > 1)
  .map((row) => ({
    duplicateReason: [
      pageTitleCounts.get(normalize(row.pageTitle)) > 1 ? "zelfde titel" : "",
      pageCodeCounts.get(row.pageCode) > 1 ? "zelfde page_code" : "",
    ]
      .filter(Boolean)
      .join(" + "),
    courseCode: row.courseCode,
    courseTitle: row.courseTitle,
    topicTitle: row.topicTitle,
    pageCode: row.pageCode,
    pageTitle: row.pageTitle,
    learnerRoute: row.learnerRoute,
    recommendation:
      row.courseCode === "ai-literacy-foundation"
        ? "Bronpagina. Controleer of hergebruik in vervolgcursussen gewenst is."
        : "Hergebruikte of overlappende pagina. Maak de vervolgcursusvariant rolspecifieker of link terug naar AI Literacy.",
  }));

const mobileRows = [
  {
    onderwerp: "Kan ik mobiel testen?",
    antwoord:
      "Ja, de leeromgeving heeft learner routes en responsive cursus/player-schermen. Vanaf een echte telefoon moet de dev server wel op 0.0.0.0 luisteren.",
    actie:
      "Start bijvoorbeeld op een vrije poort: npm --workspace @digidactics/rai run dev -- --hostname 0.0.0.0 --port 3011",
  },
  {
    onderwerp: "Mobiele URL",
    antwoord:
      "Gebruik op dezelfde Wi-Fi het IPv4-adres van deze laptop. Vandaag gevonden: http://10.106.119.47:3011/learning als je de server op 3011 start.",
    actie: "Als je netwerk wisselt, haal het adres opnieuw op met ipconfig of Get-NetIPAddress.",
  },
  {
    onderwerp: "Huidige serverstatus",
    antwoord:
      "Tijdens deze export luisterden poorten 3000 en 3010 alleen op 127.0.0.1. Dat is lokaal op de laptop, niet bereikbaar vanaf de telefoon.",
    actie: "Stop de bestaande lokale server als je per se 3010 wilt gebruiken, of gebruik 3011 zoals hierboven.",
  },
  {
    onderwerp: "Cursist-flow",
    antwoord:
      "Cursusoverzicht en player zijn beschikbaar via /learning, /learning/[courseCode] en /learning/[courseCode]/[pageCode].",
    actie:
      "Voor voortgang, pogingen en certificaatbewijs moet je ingelogd zijn en moet Supabase/env correct staan.",
  },
  {
    onderwerp: "Snelle preview",
    antwoord:
      "/learning/preview toont de previewstructuur met onderwerpen en pagina's en is handig voor contentcontrole.",
    actie: "Gebruik deze route om eerst te checken of alle pagina's zichtbaar zijn.",
  },
];

const summaryRows = [
  ["Metriek", "Waarde"],
  ["Aantal cursussen", courses.length],
  ["Aantal onderwerpen", courses.reduce((sum, course) => sum + course.topics.length, 0)],
  ["Aantal lespagina's", pageRows.length],
  ["Ingevulde lespagina's", pageRows.filter((row) => row.blockCount > 0).length],
  ["Content blocks / activiteiten", activityRows.length],
  ["Evidence activiteiten", activityRows.filter((row) => row.evidenceKind !== "none").length],
  ["Totale geschatte minuten", pageRows.reduce((sum, row) => sum + row.minutes, 0)],
  ["Mogelijke dubbelingen / overlegpunten", possibleDuplicateRows.length],
  ["Gegenereerd op", generatedAt],
  ["Bron", "apps/rai/lib/*content.ts + apps/rai/lib/learning-preview-data.ts"],
];

const workbook = Workbook.create();
const summarySheet = workbook.worksheets.add("Samenvatting");
const mobileSheet = workbook.worksheets.add("Mobiel testen");
const coursesSheet = workbook.worksheets.add("Cursussen");
const pagesSheet = workbook.worksheets.add("Lespagina's");
const activitiesSheet = workbook.worksheets.add("Activiteiten");
const formatsSheet = workbook.worksheets.add("Contentvormen");
const duplicatesSheet = workbook.worksheets.add("Dubbelingen");

summarySheet.getRangeByIndexes(0, 0, summaryRows.length, 2).values = summaryRows;
writeObjects(mobileSheet, mobileRows, [
  ["onderwerp", "Onderwerp"],
  ["antwoord", "Antwoord"],
  ["actie", "Actie / teststap"],
]);
writeObjects(coursesSheet, courseRows, [
  ["courseCode", "Cursuscode"],
  ["courseTitle", "Cursus"],
  ["subtitle", "Subtitel"],
  ["description", "Omschrijving"],
  ["level", "Niveau"],
  ["required", "Verplicht"],
  ["passThreshold", "Norm %"],
  ["topicCount", "Onderwerpen"],
  ["pageCount", "Lespagina's"],
  ["filledPages", "Ingevulde pagina's"],
  ["activityCount", "Activiteiten"],
  ["evidenceCount", "Evidence activiteiten"],
  ["totalMinutes", "Minuten"],
  ["learnerRoute", "Cursusroute"],
  ["previewRoute", "Previewroute"],
]);
writeObjects(pagesSheet, pageRows, [
  ["courseCode", "Cursuscode"],
  ["courseTitle", "Cursus"],
  ["courseLevel", "Niveau"],
  ["topicOrder", "Onderwerp volgorde"],
  ["topicTitle", "Onderwerp"],
  ["pageOrder", "Pagina volgorde"],
  ["pageCode", "Page code"],
  ["pageTitle", "Lespagina"],
  ["pageType", "Type"],
  ["summary", "Samenvatting"],
  ["minutes", "Minuten"],
  ["required", "Verplicht"],
  ["blockCount", "Blocks"],
  ["blockTypes", "Blocktypes"],
  ["currentActivities", "Huidige lesactiviteiten"],
  ["evidenceActivities", "Evidence count"],
  ["certificateGate", "Certificaat gate"],
  ["competencies", "Competenties"],
  ["contentStatus", "Contentstatus"],
  ["recommendedFormats", "Aanbevolen contentvormen"],
  ["recommendationReason", "Waarom"],
  ["claudeBrief", "Claude brief"],
  ["learnerRoute", "Learner route"],
  ["editorRoute", "Editor route"],
]);
writeObjects(activitiesSheet, activityRows, [
  ["courseCode", "Cursuscode"],
  ["courseTitle", "Cursus"],
  ["topicOrder", "Onderwerp volgorde"],
  ["topicTitle", "Onderwerp"],
  ["pageOrder", "Pagina volgorde"],
  ["pageCode", "Page code"],
  ["pageTitle", "Lespagina"],
  ["blockOrder", "Block volgorde"],
  ["blockId", "Block id"],
  ["blockType", "Blocktype"],
  ["activityType", "Lesactiviteit"],
  ["activityPrompt", "Inhoud / opdracht"],
  ["evidenceKind", "Evidence kind"],
  ["requiredForCertificate", "Verplicht voor certificaat"],
  ["competencies", "Competenties"],
  ["reviewMode", "Reviewmodus"],
  ["autoGradable", "Automatisch te beoordelen"],
  ["contentFormAdvice", "Contentvorm advies"],
]);
writeObjects(formatsSheet, blockTypeRows, [
  ["blockType", "Blocktype / contentvorm"],
  ["currentCount", "Huidig aantal"],
  ["learnerActivity", "Leeractiviteit"],
  ["bestUse", "Beste inzet"],
  ["recommendedMedia", "Media-aanvulling"],
  ["claudeInstruction", "Vraag aan Claude"],
]);
writeObjects(duplicatesSheet, possibleDuplicateRows, [
  ["duplicateReason", "Reden"],
  ["courseCode", "Cursuscode"],
  ["courseTitle", "Cursus"],
  ["topicTitle", "Onderwerp"],
  ["pageCode", "Page code"],
  ["pageTitle", "Lespagina"],
  ["learnerRoute", "Route"],
  ["recommendation", "Advies / overlegpunt"],
]);

styleSummary(summarySheet);
styleTable(mobileSheet, "A1:C" + tableRowCount(mobileRows));
styleTable(coursesSheet, "A1:O" + tableRowCount(courseRows));
styleTable(pagesSheet, "A1:X" + tableRowCount(pageRows));
styleTable(activitiesSheet, "A1:R" + tableRowCount(activityRows));
styleTable(formatsSheet, "A1:F" + tableRowCount(blockTypeRows));
styleTable(duplicatesSheet, "A1:H" + tableRowCount(possibleDuplicateRows));

mobileSheet.tables.add("A1:C" + tableRowCount(mobileRows), true, "MobielTestenTable");
coursesSheet.tables.add("A1:O" + tableRowCount(courseRows), true, "CursussenTable");
pagesSheet.tables.add("A1:X" + tableRowCount(pageRows), true, "LespaginasTable");
activitiesSheet.tables.add("A1:R" + tableRowCount(activityRows), true, "ActiviteitenTable");
formatsSheet.tables.add("A1:F" + tableRowCount(blockTypeRows), true, "ContentvormenTable");
duplicatesSheet.tables.add("A1:H" + tableRowCount(possibleDuplicateRows), true, "DubbelingenTable");

for (const sheet of workbook.worksheets.items) {
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(1);
  sheet.getUsedRange().format.autofitColumns();
  sheet.getUsedRange().format.autofitRows();
}

summarySheet.getRange("A:A").format.columnWidth = 34;
summarySheet.getRange("B:B").format.columnWidth = 78;
mobileSheet.getRange("A:A").format.columnWidth = 28;
mobileSheet.getRange("B:C").format.columnWidth = 70;
coursesSheet.getRange("C:D").format.columnWidth = 64;
pagesSheet.getRange("J:J").format.columnWidth = 60;
pagesSheet.getRange("O:V").format.columnWidth = 54;
pagesSheet.getRange("W:X").format.columnWidth = 50;
activitiesSheet.getRange("L:L").format.columnWidth = 68;
activitiesSheet.getRange("R:R").format.columnWidth = 58;
formatsSheet.getRange("D:F").format.columnWidth = 64;
duplicatesSheet.getRange("H:H").format.columnWidth = 64;

for (const sheet of [mobileSheet, coursesSheet, pagesSheet, activitiesSheet, formatsSheet, duplicatesSheet]) {
  sheet.getUsedRange().format.wrapText = true;
}

if (process.env.LEARNING_OVERVIEW_RENDER === "1") {
  await workbook.render({ sheetName: "Samenvatting", autoCrop: "all", scale: 1, format: "png" });
  await workbook.render({ sheetName: "Lespagina's", range: "A1:X20", scale: 1, format: "png" });
}
await workbook.inspect({
  kind: "table",
  range: "Lespagina's!A1:X12",
  include: "values",
  tableMaxRows: 12,
  tableMaxCols: 24,
  maxChars: 12000,
});
await workbook.inspect({
  kind: "table",
  range: "Activiteiten!A1:R12",
  include: "values",
  tableMaxRows: 12,
  tableMaxCols: 18,
  maxChars: 12000,
});
await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  maxChars: 2000,
});

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
console.log(
  JSON.stringify({
    courses: courseRows.length,
    topics: courses.reduce((sum, course) => sum + course.topics.length, 0),
    pages: pageRows.length,
    activities: activityRows.length,
    evidenceActivities: activityRows.filter((row) => row.evidenceKind !== "none").length,
    outputPath,
  }),
);

function stripLocalLearningPreviewImports(source) {
  return source
    .replace(/^import type .*?;\r?\n/gm, "")
    .replace(/^import \{ aiLiteracyFoundationTopicSeeds \} from "\.\/ai-literacy-foundation-content";\r?\n/gm, "")
    .replace(/^import \{ aiMasteryCourseTopicSeeds \} from "\.\/ai-mastery-content";\r?\n/gm, "")
    .replace(/^import \{ aiProficiencyCourseTopicSeeds \} from "\.\/ai-proficiency-content";\r?\n/gm, "");
}

function writeObjects(sheet, rows, columns) {
  const header = columns.map(([, label]) => label);
  const values = rows.map((row) => columns.map(([key]) => row[key] ?? ""));
  sheet.getRangeByIndexes(0, 0, Math.max(values.length + 1, 2), columns.length).values = [
    header,
    ...(values.length ? values : [columns.map(() => "")]),
  ];
}

function styleSummary(sheet) {
  sheet.getRange("A1:B1").format = headerFormat();
  sheet.getRange("A1:B" + summaryRows.length).format.font = { color: "#13201D" };
  sheet.getRange("A1:B" + summaryRows.length).format.borders = {
    insideHorizontal: { style: "Continuous", color: "#D9E2E7" },
  };
  sheet.getRange("A10:B10").format.numberFormat = "yyyy-mm-dd hh:mm";
  sheet.getRange("A:A").format.font = { bold: true, color: "#13201D" };
  sheet.getRange("B:B").format.wrapText = true;
}

function styleTable(sheet, rangeAddress) {
  const range = sheet.getRange(rangeAddress);
  const headerAddress = rangeAddress.replace(/:.*$/, ":1");
  sheet.getRange(headerAddress).format = headerFormat();
  range.format.font = { color: "#13201D" };
  range.format.borders = { insideHorizontal: { style: "Continuous", color: "#E3E7EA" } };
}

function headerFormat() {
  return {
    fill: "#002B36",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true,
  };
}

function tableRowCount(rows) {
  return Math.max(rows.length + 1, 2);
}

function summarizeActivities(blocks) {
  if (!blocks.length) {
    return "Nog geen content blocks; ontwerp minimaal uitleg, oefening en check.";
  }

  return unique(blocks.map(activityLabel)).join(" | ");
}

function activityLabel(block) {
  return blockTypeDictionary[block.type]?.learnerActivity ?? `Werk met ${block.type}`;
}

function blockPrompt(block) {
  return truncate(
    block.title ??
      block.text ??
      block.question ??
      block.prompt ??
      block.situation ??
      block.markdown ??
      block.description ??
      block.subtitle ??
      block.quote ??
      "",
    360,
  );
}

function inferEvidenceKind(block) {
  if (block.evidence_kind) return block.evidence_kind;
  if (block.type?.startsWith("quiz_")) return "quiz";
  if (block.type === "scenario") return "scenario";
  if (block.type === "reflection" || block.type === "short_answer") return "reflection";
  if (block.type === "case_lab") return "case_lab";
  if (block.type === "progress_check") return "self_check";
  return "none";
}

function hasCertificateGate(blocks) {
  return blocks.some((block) => Boolean(block.required_for_certificate));
}

function reviewMode(block, evidenceKind) {
  if (block.manual_review_required) return "Handmatige review";
  if (["reflection", "case_lab", "assessment"].includes(evidenceKind)) return "Review of steekproef aanbevolen";
  if (autoGradable(block)) return "Automatisch";
  return "Geen review";
}

function autoGradable(block) {
  return ["quiz_multiple_choice", "quiz_multiple_select", "quiz_true_false", "scenario", "progress_check", "checklist"].includes(
    block.type,
  );
}

function blockFormAdvice(block, page) {
  if (block.type === "paragraph" && String(block.markdown ?? "").length > 500) {
    return "Knip lange uitleg op met knowledge cards, callout of korte slide deck.";
  }
  if (block.type === "hero") return "Combineer eventueel met korte introductievideo of praktijkbeeld.";
  if (block.type === "scenario") return "Sterk als branching scenario; voeg eventueel audio/rolcontext toe.";
  if (block.type === "case_lab") return "Sterk als werkblad of uploadbare template; reviewrubric toevoegen.";
  if (block.type === "reflection" || block.type === "short_answer") return "Behoud als bewijsactiviteit; voeg voorbeeldantwoord of rubric toe.";
  if (block.type === "download") return "Koppel aan concreet invulbaar templatebestand.";
  if (page.page_type === "assessment") return "Bewaar sober; alleen media toevoegen als het de casuscontext verduidelijkt.";
  return blockTypeDictionary[block.type]?.recommendedMedia ?? "Geen extra vorm nodig.";
}

function inferPageRecommendations(course, topic, page, blocks) {
  const types = new Set(blocks.map((block) => block.type));
  const evidenceCount = blocks.filter((block) => inferEvidenceKind(block) !== "none").length;

  if (!blocks.length) {
    return {
      formats: "Uitlegblok + scenario/check + korte reflectie; eventueel microvideo of slide deck",
      reason: "De pagina bestaat al in de cursusstructuur, maar heeft nog geen content blocks.",
      claudeBrief: `Ontwerp content voor ${course.title} > ${topic.title} > ${page.title}. Maak 3-5 blocks: korte uitleg, praktijkvoorbeeld, learner activiteit en check.`,
    };
  }

  if (page.page_type === "assessment" || page.title.toLowerCase().includes("assessment")) {
    return {
      formats: "Scenario, short answer, reflection, quiz; eventueel case pack/download",
      reason: "Assessmentpagina's moeten bewijs opleveren en niet alleen content tonen.",
      claudeBrief: `Versterk ${page.title} met toetsbare scenario's, rubric en evidence-items. Houd media ondersteunend.`,
    };
  }

  if (page.page_type === "case" || types.has("case_lab")) {
    return {
      formats: "Case lab, invulbaar werkblad, beslisboom, optionele korte video-intro",
      reason: "Casepagina's werken beter met concrete rolcontext en zichtbaar bewijs.",
      claudeBrief: `Maak de case op ${page.title} rijker met rol, data, dilemma, beslismomenten en reviewrubric.`,
    };
  }

  if (types.has("timeline")) {
    return {
      formats: "Slide deck of infographic naast timeline",
      reason: "Proces- en wetgevingsvolgorde vraagt visuele verankering.",
      claudeBrief: `Stel een compact slide deck voor dat de stappen op ${page.title} visueel maakt.`,
    };
  }

  if (types.has("comparison") && !types.has("scenario")) {
    return {
      formats: "Scenario-sortering of drag/drop classificatie naast vergelijking",
      reason: "Vergelijken wordt sterker als de cursist daarna zelf classificeert.",
      claudeBrief: `Voeg een korte oefening toe waarin de cursist voorbeelden classificeert voor ${page.title}.`,
    };
  }

  if (evidenceCount === 0) {
    return {
      formats: "Progress check, quizvraag of korte reflectie",
      reason: "De pagina heeft nu vooral consumptiecontent; voeg laagdrempelige verwerking toe.",
      claudeBrief: `Bedenk een lichte learner activiteit voor ${page.title} die begrip of toepassing controleert.`,
    };
  }

  if (types.has("reflection") || types.has("short_answer")) {
    return {
      formats: "Voorbeeldantwoord, rubric, eventueel downloadbaar protocol",
      reason: "Reflectie levert bewijs op; rubric maakt beoordeling en consistentie sterker.",
      claudeBrief: `Maak voor ${page.title} een rubric en 1-2 voorbeeldantwoorden zonder het antwoord voor te zeggen.`,
    };
  }

  return {
    formats: "Korte microvideo of visuele samenvatting waar dit begrip versnelt",
    reason: "De pagina heeft al activiteit; media alleen toevoegen waar het scanbaarheid of praktijktransfer verbetert.",
    claudeBrief: `Beoordeel of ${page.title} baat heeft bij video, slide deck of infographic. Prioriteer alleen duidelijke leerwinst.`,
  };
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function countBy(rows, getKey) {
  const counts = new Map();
  for (const row of rows) {
    const key = getKey(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function truncate(value, maxLength) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function loadBlockTypeDictionary() {
  return {
  accordion: {
    learnerActivity: "Voorbeelden of FAQ openklappen",
    bestUse: "Voor afdelingsvoorbeelden, uitzonderingen en extra uitleg zonder de pagina zwaar te maken.",
    recommendedMedia: "Kan worden aangevuld met korte praktijkkaart of screenshot.",
    claudeInstruction: "Stel 3-6 concrete accordion-items voor met herkenbare werksituaties.",
  },
  audio: {
    learnerActivity: "Audiofragment beluisteren",
    bestUse: "Alleen zinvol voor interviews, telefoonscripts of coaching.",
    recommendedMedia: "Transcript verplicht voor toegankelijkheid.",
    claudeInstruction: "Maak audio alleen als het gedrag, toon of gesprekssituatie toevoegt.",
  },
  callout: {
    learnerActivity: "Belangrijke waarschuwing of tip lezen",
    bestUse: "Voor rode vlaggen, policygrenzen en waarschuwingen.",
    recommendedMedia: "Geen extra media nodig; hou tekst kort.",
    claudeInstruction: "Formuleer callouts als concrete do/don't of rode vlag.",
  },
  case_lab: {
    learnerActivity: "Praktijkcase analyseren",
    bestUse: "Voor toepassing, portfolio-evidence en beoordeling door reviewer.",
    recommendedMedia: "Invulbaar werkblad, rubric of voorbeeldcase.",
    claudeInstruction: "Ontwerp een case met context, rol, data, risico, keuze en rubric.",
  },
  checklist: {
    learnerActivity: "Checklist nalopen",
    bestUse: "Voor veilig prompten, dataregels, outputcontrole en governance minimumsets.",
    recommendedMedia: "Downloadbaar protocol of printbare 1-pager.",
    claudeInstruction: "Maak de checklist concreet, observeerbaar en niet langer dan 7 items.",
  },
  comparison: {
    learnerActivity: "Twee opties vergelijken",
    bestUse: "Voor wel/niet, laag/hoog risico, automatisering/AI en geschikt/ongeschikt.",
    recommendedMedia: "Kan sterker met classificatie-oefening of infographic.",
    claudeInstruction: "Voeg voorbeelden toe die cursisten zelf kunnen sorteren.",
  },
  download: {
    learnerActivity: "Template of hulpmiddel openen",
    bestUse: "Voor promptcanvas, toolinventaris, RACI, DPIA-light of reviewprotocol.",
    recommendedMedia: "Maak een echte download of duidelijke placeholder.",
    claudeInstruction: "Specificeer velden van het template en wanneer het gebruikt wordt.",
  },
  embed_h5p: {
    learnerActivity: "Interactieve H5P-oefening doen",
    bestUse: "Voor drag/drop, hotspot, branching scenario en interactieve video.",
    recommendedMedia: "Gebruik bij classificatie en scenario's met veel voorbeelden.",
    claudeInstruction: "Beschrijf het H5P-type, items, feedback en scorelogica.",
  },
  heading: {
    learnerActivity: "Sectie scannen",
    bestUse: "Voor structuur en scanbaarheid.",
    recommendedMedia: "Geen extra media nodig.",
    claudeInstruction: "Maak headings kort, taakgericht en inhoudelijk.",
  },
  hero: {
    learnerActivity: "Pagina-intro orienteren",
    bestUse: "Voor leerdoel, belang en context van de pagina.",
    recommendedMedia: "Korte introvideo of realistische praktijkvisual kan helpen.",
    claudeInstruction: "Schrijf een concrete intro zonder marketingtaal.",
  },
  iframe: {
    learnerActivity: "Externe bron of tool gebruiken",
    bestUse: "Voor embedded simulaties, policyviewer of externe interactieve tools.",
    recommendedMedia: "Alleen gebruiken met stabiele bron en privacycheck.",
    claudeInstruction: "Geef doel, fallbacklink en privacy/toegankelijkheidsnotitie.",
  },
  image: {
    learnerActivity: "Infographic bekijken",
    bestUse: "Voor flows, risicoladders, dataclassificatie en oversightmodellen.",
    recommendedMedia: "Alt-tekst en caption verplicht.",
    claudeInstruction: "Beschrijf exact welke infographic nodig is en welke labels erop moeten.",
  },
  key_takeaways: {
    learnerActivity: "Kernpunten onthouden",
    bestUse: "Voor afsluiting of samenvatting van een pagina.",
    recommendedMedia: "Geen extra media nodig; eventueel omzetten naar flashcards.",
    claudeInstruction: "Maak maximaal 3-5 kernpunten in gedragsgerichte taal.",
  },
  knowledge_cards: {
    learnerActivity: "Kenniskaarten doornemen",
    bestUse: "Voor begrippen, rollen, promptonderdelen en governance-elementen.",
    recommendedMedia: "Kan als mini-slide deck of flipcards.",
    claudeInstruction: "Maak cards kort, parallel opgebouwd en met voorbeelden.",
  },
  paragraph: {
    learnerActivity: "Korte uitleg lezen",
    bestUse: "Voor noodzakelijke context, definities en uitleg.",
    recommendedMedia: "Vervang lange paragrafen door cards, callouts of slide deck.",
    claudeInstruction: "Herschrijf uitleg compact en koppel aan een voorbeeld.",
  },
  progress_check: {
    learnerActivity: "Zelfinschatting doen",
    bestUse: "Voor beginmeting, confidence check en transfer naar werkpraktijk.",
    recommendedMedia: "Koppel eventueel aan reflectie of vervolgtip.",
    claudeInstruction: "Maak een heldere schaalvraag met praktische labels.",
  },
  quiz_essay: {
    learnerActivity: "Open toetsantwoord schrijven",
    bestUse: "Voor eindbewijs of casusbeoordeling.",
    recommendedMedia: "Rubric en reviewer guidance toevoegen.",
    claudeInstruction: "Maak beoordelingscriteria en hard-fail signalen.",
  },
  quiz_multiple_choice: {
    learnerActivity: "Meerkeuzevraag beantwoorden",
    bestUse: "Voor begrip, misconcepties en korte kennistoets.",
    recommendedMedia: "Feedback per optie versterkt leren.",
    claudeInstruction: "Maak plausibele afleiders en leg feedback uit.",
  },
  quiz_multiple_select: {
    learnerActivity: "Meerdere juiste opties kiezen",
    bestUse: "Voor rode vlaggen, signalen en checklistkennis.",
    recommendedMedia: "Gebruik niet te veel opties op mobiel.",
    claudeInstruction: "Maak correct_option_ids en korte feedback.",
  },
  quiz_true_false: {
    learnerActivity: "Waar/onwaar check doen",
    bestUse: "Voor mythes en snelle misconceptie-check.",
    recommendedMedia: "Gebruik sparend; kan oppervlakkig worden.",
    claudeInstruction: "Maak statements die echt onderscheidend zijn.",
  },
  reflection: {
    learnerActivity: "Reflectie invullen",
    bestUse: "Voor rolcontext, persoonlijke toepassing en portfolio-evidence.",
    recommendedMedia: "Rubric, voorbeeldantwoord of protocoltemplate.",
    claudeInstruction: "Maak reflectievragen concreet en koppel aan competenties.",
  },
  scenario: {
    learnerActivity: "Scenario-keuze maken",
    bestUse: "Voor dilemma's, escalatie, verboden gebruik en outputcontrole.",
    recommendedMedia: "Branching scenario, H5P of korte video-intro.",
    claudeInstruction: "Ontwerp keuzes met consequenties en aanbevolen gedrag.",
  },
  section_header: {
    learnerActivity: "Sectie openen",
    bestUse: "Voor paginadelen in langere lessen.",
    recommendedMedia: "Geen extra media nodig.",
    claudeInstruction: "Gebruik alleen als het de navigatie verbetert.",
  },
  section_heading: {
    learnerActivity: "Sectie openen",
    bestUse: "Legacy heading; vervangen door heading of section_header.",
    recommendedMedia: "Geen extra media nodig.",
    claudeInstruction: "Moderniseer naar heading of section_header.",
  },
  short_answer: {
    learnerActivity: "Kort antwoord formuleren",
    bestUse: "Voor bewijs van begrip in eigen woorden.",
    recommendedMedia: "Rubric of voorbeeldantwoord toevoegen.",
    claudeInstruction: "Maak de vraag toetsbaar en geef guidance.",
  },
  slide_deck: {
    learnerActivity: "Slides bekijken",
    bestUse: "Voor processen, wetgeving, frameworks en visuele samenvattingen.",
    recommendedMedia: "Gebruik 4-8 slides met interactie waar mogelijk.",
    claudeInstruction: "Maak een compacte slide-outline met notities en interactie.",
  },
  timeline: {
    learnerActivity: "Proces of tijdlijn volgen",
    bestUse: "Voor AI Act deadlines, governance gates en procesflows.",
    recommendedMedia: "Infographic of slide deck.",
    claudeInstruction: "Maak stappen eenduidig, genummerd en actiegericht.",
  },
  video: {
    learnerActivity: "Video bekijken",
    bestUse: "Voor introductie, demonstratie, gesprekssituaties en complexe processen.",
    recommendedMedia: "Transcript, hoofdstukken en korte lengte.",
    claudeInstruction: "Maak een videoscript van 60-120 seconden met leerdoel en call to action.",
  },
  };
}
