import type { LessonContent } from "@digidactics/domain/learning";
import type { AiLiteracyTopicSeed } from "./learning-preview-data";

type LessonBlock = LessonContent["blocks"][number];

export interface RichHtmlArtefactPlacement {
  pageCode: string;
  afterBlockId: string;
  block: LessonBlock;
}

export const aiLiteracyRichHtmlPlacements: RichHtmlArtefactPlacement[] = [
  placement("wat-telt-als-ai", "p2-comparison", {
    id: "p2-rich-html-wel-geen-ai-schema",
    title: "Interactief schema: wel of geen AI?",
    fileName: "05-wel-geen-ai-schema.html",
    height: 560,
    caption: "Gebruik dit schema om AI, automatisering en gewone software sneller uit elkaar te houden.",
  }),
  placement("transparantie", "p4-ai-act-timeline", {
    id: "p4-risicopiramide-embed",
    title: "Risicopiramide: klik op een laag",
    fileName: "01-risicopiramide.html",
    height: 380,
    caption: "Klik door de risiconiveaus en koppel ze aan voorbeelden uit de werkcontext.",
  }),
  placement("verboden-vs-toegestaan", "p5-cards", {
    id: "p5-rich-html-verboden-hoog-risico-transparantie",
    title: "Infographic: verboden, hoog risico en transparantie",
    fileName: "07-verboden-hoog-risico-transparantie.html",
    height: 520,
    caption: "Een visuele samenvatting van de drie categorieen die medewerkers in de praktijk moeten herkennen.",
  }),
  placement("privacy-klantdata", "p6-data-matrix", {
    id: "p6-rich-html-privacy-data-matrix",
    title: "Privacy en data: do/don't matrix",
    fileName: "06-privacy-data-matrix.html",
    height: 620,
    caption: "Oefen met datatypes, AVG-principes en wat je wel of niet in AI-tools zet.",
  }),
  placement("prompting-basics-veilig-gebruik", "p7-slides", {
    id: "p7-rich-html-veilig-prompten",
    title: "Slides: veilig prompten",
    fileName: "04-veilig-prompten-slides.html",
    height: 620,
    caption: "Een compacte visuele herhaling van veilige promptgrenzen.",
  }),
  placement("output-controleren", "p10-control-loop-snapshot", {
    id: "p10-rich-html-controlelus",
    title: "Interactieve controlelus voor AI-output",
    fileName: "03-controlelus-tijdlijn.html",
    height: 760,
    caption: "Doorloop de zes stappen waarmee je output controleert voordat je die gebruikt.",
  }),
  placement("human-in-the-loop", "p12-comparison", {
    id: "p12-rich-html-hitl-hotl-hic",
    title: "Tabs: HITL, HOTL en HIC",
    fileName: "02-hitl-hotl-hic.html",
    height: 620,
    caption: "Vergelijk drie vormen van menselijke controle en wanneer ze passend zijn.",
  }),
  placement("human-in-the-loop", "p12-rich-html-hitl-hotl-hic", {
    id: "p12-rich-html-hitl-hotl-hic-vergelijking",
    title: "Vergelijking: human oversight modellen",
    fileName: "02-hitl-hotl-hic-vergelijking.html",
    height: 205,
    caption: "Compact overzicht van het verschil tussen HITL, HOTL en HIC.",
  }),
];

export const aiProficiencyRichHtmlPlacements: RichHtmlArtefactPlacement[] = [
  placement("goede-use-case-slechte-use-case", "p02-use-case-framing-slides", {
    id: "p02-rich-html-use-case-framing",
    title: "Interactieve slides: use-case framing",
    fileName: "11-use-case-framing-slides.html",
    height: 620,
    caption: "Van AI-idee naar taakbrief met doel, data, impact en controle.",
  }),
  placement("prompten-met-context-grenzen-en-kwaliteitseisen", "p03-prompting-slides", {
    id: "p03-rich-html-prompting",
    title: "Interactieve slides: prompting met context",
    fileName: "08-prompting-slides.html",
    height: 620,
    caption: "Vergelijk losse prompts met prompts die context, criteria en grenzen bevatten.",
  }),
  placement("output-controleren-voor-gebruik", "p04-verification-timeline", {
    id: "p04-rich-html-verificatie-tijdlijn",
    title: "Interactieve verificatietijdlijn",
    fileName: "09-verificatie-tijdlijn.html",
    height: 560,
    caption: "Vijf stappen om AI-output te verifieren voordat je die doorzet.",
  }),
  placement("data-veilig-invoeren-of-juist-niet", "p05-data-classification-matrix", {
    id: "p05-rich-html-dataclassificatie",
    title: "Interactieve dataclassificatie-matrix",
    fileName: "10-dataclassificatie-matrix.html",
    height: 560,
    caption: "Plaats data in de juiste categorie voordat je een AI-tool gebruikt.",
  }),
  placement("werken-met-tools-instellingen-en-grenzen", "p06-toolkeuze-promptsanering-slides", {
    id: "p06-rich-html-toolkeuze-promptsanering",
    title: "Slides: toolkeuze en promptsanering",
    fileName: "12-toolkeuze-promptsanering-slides.html",
    height: 620,
    caption: "Maak toolscope en promptsanering concreet voordat je met echte werkdata werkt.",
  }),
];

export const aiMasteryRichHtmlPlacements: RichHtmlArtefactPlacement[] = [
  placement("use-case-triage-op-waarde-risico-en-haalbaarheid", "m02-triage-matrix", {
    id: "m02-rich-html-triage-matrix",
    title: "Interactieve triage 2x2 matrix",
    fileName: "13-triage-matrix.html",
    height: 650,
    caption: "Gebruik waarde en risico om use cases te prioriteren, beperken of stoppen.",
  }),
  placement("rollen-gebruiker-deployer-provider-owner", "m03-chain-flow", {
    id: "m03-rich-html-ketendiagram-rollen",
    title: "Ketendiagram: rollen en informatiestroom",
    fileName: "14-ketendiagram-rollen.html",
    height: 620,
    caption: "Zie hoe gebruiker, deployer, provider en eigenaar elkaar in de keten raken.",
  }),
  placement("override-sampling-vier-ogen-en-stopcriteria", "m06-control-interventions-timeline", {
    id: "m06-rich-html-controle-interventies",
    title: "Tijdlijn: controle-interventies",
    fileName: "16-controle-interventies-tijdlijn.html",
    height: 600,
    caption: "Kies passende interventies zoals override, sampling, vier-ogen en stopcriteria.",
  }),
  placement("datakwaliteit-representativiteit-en-bias", "m07-cards", {
    id: "m07-rich-html-datakwaliteit-bias",
    title: "Kaarten: datakwaliteit, bias en monitoring",
    fileName: "18-datakwaliteit-bias-kaarten.html",
    height: 600,
    caption: "Vier kwaliteitsvragen voor data, representativiteit, bias en monitoring.",
  }),
  placement("monitoring-logs-en-incidenten", "m08-timeline", {
    id: "m08-rich-html-monitoringcyclus",
    title: "Interactieve monitoringcyclus",
    fileName: "15-monitoringcyclus-tijdlijn.html",
    height: 580,
    caption: "Van logging naar signalen, incidenten, review en verbetering.",
  }),
  placement("transparantie-en-betrokkenencommunicatie", "m09-disclosure-slides", {
    id: "m09-rich-html-disclosure",
    title: "Slides: transparantie en disclosure",
    fileName: "17-disclosure-slides.html",
    height: 620,
    caption: "Oefen wanneer betrokkenen uitleg, melding of extra bescherming nodig hebben.",
  }),
];

export function withRichHtmlArtefacts(
  topics: AiLiteracyTopicSeed[],
  placements: RichHtmlArtefactPlacement[],
): AiLiteracyTopicSeed[] {
  return topics.map((topic) => ({
    ...topic,
    pages: topic.pages.map((page) => {
      const pagePlacements = placements.filter((item) => item.pageCode === page.code);
      if (pagePlacements.length === 0) return page;

      const blocks = [...page.blocks];
      const existingIds = new Set(blocks.map((block) => block.id));

      for (const item of pagePlacements) {
        if (existingIds.has(item.block.id)) continue;

        const afterIndex = blocks.findIndex((block) => block.id === item.afterBlockId);
        const insertIndex = afterIndex >= 0 ? afterIndex + 1 : blocks.length;
        blocks.splice(insertIndex, 0, item.block);
        existingIds.add(item.block.id);
      }

      return { ...page, blocks };
    }),
  }));
}

function placement(
  pageCode: string,
  afterBlockId: string,
  {
    caption,
    fileName,
    height,
    id,
    title,
  }: {
    caption: string;
    fileName: string;
    height: number;
    id: string;
    title: string;
  },
): RichHtmlArtefactPlacement {
  return {
    afterBlockId,
    pageCode,
    block: {
      id,
      type: "iframe",
      title,
      url: `/learning/artefacts/${fileName}`,
      height,
      caption,
      provider: "Digidactics HTML",
      allow_fullscreen: true,
      evidence_kind: "none",
      required_for_certificate: false,
      source_status: "internal_standard",
    },
  };
}
