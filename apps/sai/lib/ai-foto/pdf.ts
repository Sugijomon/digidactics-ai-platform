import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { AiFotoExportSnapshot } from "@digidactics/database/ai-foto";

export const AI_FOTO_PDF_VERSION = "ai-foto-a3-v1";
const titles = { waarde: "Waardekaart", aandacht: "Aandachtspuntenkaart", vaardigheid: "Vaardighedenkaart" };
const ink = rgb(0.12, 0.2, 0.24);
const muted = rgb(0.32, 0.39, 0.43);
const accent = rgb(0.05, 0.35, 0.46);

function lines(text: string, font: PDFFont, size: number, width: number) {
  const result: string[] = [];
  // Preserve paragraphs and wrap even an unbroken URL/word; never truncate content.
  for (const paragraph of text.replaceAll("\r", "").replaceAll("\t", " ").split("\n")) {
    let line = "";
    for (const word of paragraph.split(/ +/)) {
      if (font.widthOfTextAtSize(`${line}${line ? " " : ""}${word}`, size) <= width) {
        line += `${line ? " " : ""}${word}`;
      } else {
        if (line) result.push(line);
        line = "";
        for (const character of word) {
          if (font.widthOfTextAtSize(line + character, size) > width) { result.push(line); line = ""; }
          line += character;
        }
      }
    }
    result.push(line);
  }
  return result;
}

/** A3 landscape, one approved item per page, with continuation pages as needed. */
export async function createAiFotoPdf(snapshot: AiFotoExportSnapshot) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(`AI-Foto | ${snapshot.organizationName}`);
  pdf.setAuthor("Digidactics");
  pdf.setSubject(`Goedgekeurde kaartitems | ${snapshot.waveName} | ${snapshot.methodVersion}`);
  pdf.setCreator(AI_FOTO_PDF_VERSION);
  pdf.setCreationDate(new Date(snapshot.generatedAt));

  type Row = { text: string; heading?: boolean };
  function section(label: string, text: string, width: number): Row[] {
    return [{ text: label.toUpperCase(), heading: true }, ...lines(text || "Niet vastgelegd", regular, 13, width).map((text) => ({ text })), { text: "" }];
  }
  function drawRows(page: PDFPage, rows: Row[], x: number, y: number) {
    let count = 0;
    for (const row of rows) {
      if (y < 150) break;
      page.drawText(row.text, { x, y, font: row.heading ? bold : regular, size: row.heading ? 10 : 13, color: row.heading ? accent : ink });
      y -= row.heading ? 22 : 19;
      count++;
    }
    return count;
  }

  try {
    for (const type of ["waarde", "aandacht", "vaardigheid"] as const) {
      for (const item of snapshot.items.filter((item) => item.card_type === type)) {
        const left = [
          ...section("Observatie", item.observation, 650),
          ...section("Interpretatie na review", item.interpretation, 650),
          ...section("Open vragen", item.open_questions?.length ? item.open_questions.map((q) => `• ${q}`).join("\n") : "Geen open vragen vastgelegd.", 650),
        ];
        const right = [
          ...section("Bewijs & bereik", `${item.evidence_level} · ${item.respondent_count} respondenten\nBron: survey-zelfrapportage. Geen onafhankelijke triangulatie.`, 380),
          ...section("Voorzorg / randvoorwaarde", item.precaution ?? "", 380),
          ...section("Vervolgactie", item.follow_up_direction ?? "", 380),
          ...section("Voorgestelde eigenaar", item.proposed_owner_role ?? "", 380),
          ...section("Reviewdatum", item.review_date ?? "Niet gepland", 380),
        ];
        let part = 0;
        do {
          const page = pdf.addPage([1190.551, 841.89]);
          part++;
          page.drawRectangle({ x: 0, y: 735, width: page.getWidth(), height: 107, color: accent });
          page.drawText(`DIGIDACTICS  /  AI-FOTO  /  ${part > 1 ? `VERVOLG ${part}` : "GOEDGEKEURD"}`, { x: 48, y: 804, font: bold, size: 10, color: rgb(0.8, 0.91, 0.95) });
          page.drawText(titles[type], { x: 48, y: 760, font: bold, size: 29, color: rgb(1, 1, 1) });
          let y = 702;
          // Title size adapts to its length; title rows are never silently clipped.
          const titleLines = lines(item.title, bold, 18, 1090);
          if (titleLines.length > 6) throw new Error("De kaarttitel is te lang voor de PDF (maximaal zes regels).");
          for (const title of titleLines) { page.drawText(title, { x: 48, y, font: bold, size: 18, color: ink }); y -= 25; }
          y -= 22;
          left.splice(0, drawRows(page, left, 48, y));
          right.splice(0, drawRows(page, right, 760, y));
          page.drawLine({ start: { x: 727, y: 154 }, end: { x: 727, y: y + 15 }, thickness: 1, color: rgb(0.84, 0.89, 0.91) });
          const sourceRows = [
            `${snapshot.organizationName} | ${snapshot.waveName}`,
            `Bronitem ${item.id} | Scanronde ${snapshot.waveId}`,
            `Goedgekeurd ${item.approved_at} | Export ${snapshot.generatedAt}`,
            `Methode ${snapshot.methodVersion} | Analyse ${snapshot.analysisVersion} | Sjabloon ${AI_FOTO_PDF_VERSION} | Privacygrens n >= ${snapshot.minCellSize}`,
          ];
          let footerY = 115;
          for (const row of sourceRows) {
            for (const line of lines(row, regular, 8, 1090)) {
              if (footerY < 48) throw new Error("De bronvermelding is te lang voor de PDF.");
              page.drawText(line, { x: 48, y: footerY, font: regular, size: 8, color: muted }); footerY -= 11;
            }
          }
          page.drawText("Vertrouwelijk · Signalering en besluitvoorbereiding; geen juridische classificatie, audit of compliancegarantie.", { x: 48, y: 30, font: regular, size: 9, color: muted });
        } while (left.length || right.length);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("cannot encode")) {
      throw new Error("De PDF bevat een teken dat het pilotlettertype niet ondersteunt. Vervang dit teken in een nieuw kaartitem.");
    }
    throw error;
  }
  const pages = pdf.getPages();
  pages.forEach((page, index) => page.drawText(`${index + 1} / ${pages.length}`, { x: 1095, y: 30, font: regular, size: 9, color: muted }));
  return pdf.save();
}
