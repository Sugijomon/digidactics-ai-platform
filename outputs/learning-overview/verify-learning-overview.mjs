import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath =
  process.env.LEARNING_OVERVIEW_PATH ??
  "C:/Users/Gebruiker/Documents/New project/digidactics-ai-platform/outputs/learning-overview/digidactics-learning-cursusoverzicht-met-activiteiten.xlsx";
const input = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheets = await workbook.inspect({ kind: "sheet", include: "name", maxChars: 2000 });
const pages = await workbook.inspect({
  kind: "table",
  range: "Lespagina's!A1:X12",
  include: "values",
  tableMaxRows: 12,
  tableMaxCols: 24,
  maxChars: 12000,
});
const activities = await workbook.inspect({
  kind: "table",
  range: "Activiteiten!A1:R12",
  include: "values",
  tableMaxRows: 12,
  tableMaxCols: 18,
  maxChars: 6000,
});
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  maxChars: 2000,
});

console.log(sheets.ndjson);
console.log(pages.ndjson);
console.log(activities.ndjson);
console.log(errors.ndjson);
