import type { LessonContent } from "@digidactics/domain/learning";
import { aiLiteracyFoundationTopicSeeds } from "./ai-literacy-foundation-content";
import { aiMasteryCourseTopicSeeds } from "./ai-mastery-content";
import { aiProficiencyCourseTopicSeeds } from "./ai-proficiency-content";

export interface LearningCourseView {
  id: string;
  course_code: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  difficulty_level: string;
  required_for_onboarding: boolean;
  passing_threshold: number;
  topics: LearningTopicView[];
  pages: LearningPageView[];
}

export interface LearningEnrollmentView {
  id: string;
  status: "not_started" | "in_progress" | "completed" | "expired";
  progress_percentage: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface LearningProgressView {
  lesson_id?: string;
  page_id?: string;
  status: "not_started" | "in_progress" | "completed";
  progress_percentage: number;
  completed_block_ids: string[];
  completed_at: string | null;
}

export interface LearningAttemptAnswerView {
  block_type: string;
  value: string | string[];
}

export interface LearningAttemptView {
  page_id: string;
  status: "started" | "submitted" | "graded";
  attempt_number: number;
  answers: Record<string, LearningAttemptAnswerView>;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  passed: boolean | null;
  manual_review_required: boolean;
  submitted_at: string | null;
}

export interface LearnerStateView {
  isAuthenticated: boolean;
  orgId: string | null;
  enrollment: LearningEnrollmentView | null;
  accessCheck: LearningAccessCheckView | null;
  progressByLessonId: Record<string, LearningProgressView>;
  progressByPageId: Record<string, LearningProgressView>;
  attemptsByPageId: Record<string, LearningAttemptView>;
}

export interface LearningAccessCheckView {
  can_access: boolean;
  capability_code: string;
  required_certification_code: string | null;
  certification_status:
    | "active"
    | "expired"
    | "revoked"
    | "superseded"
    | "missing"
    | "not_configured"
    | "missing_profile_org";
  required_course_id: string | null;
  required_course_code: string | null;
  certification_id: string | null;
  expires_at: string | null;
}

export interface LearningTopicView {
  id: string;
  topic_code: string;
  title: string;
  summary: string | null;
  sequence_order: number;
  is_required: boolean;
  pages: LearningPageView[];
}

export interface LearningPageView {
  id: string;
  page_code: string;
  topic_id: string;
  title: string;
  summary: string | null;
  page_type: string;
  status?: string;
  estimated_duration_minutes: number | null;
  sequence_order: number;
  is_required: boolean;
  content: LessonContent;
}

export interface LearningLessonView {
  id: string;
  lesson_code: string;
  title: string;
  summary: string | null;
  lesson_type: string;
  estimated_duration_minutes: number | null;
  sequence_order: number;
  is_required: boolean;
  content: LessonContent;
}

export interface AiLiteracyTopicSeed {
  code: string;
  title: string;
  summary: string;
  pages: PageSeed[];
}

export interface PageSeed {
  code: string;
  title: string;
  summary: string;
  type: string;
  minutes: number;
  is_required?: boolean;
  blocks: LessonContent["blocks"];
}

interface TopicSeed {
  code: string;
  title: string;
  summary: string;
  pages: PageSeed[];
}

export const aiLiteracyPageCodeRenames: Record<string, string> = {
  "aisa-regulatory-anchor": "regulatory-anchor",
  "aisa-l1-what-counts-as-ai": "wat-telt-als-ai",
  "aisa-l1-genai-gpai": "genai",
  "generatieve-ai-gpai": "genai",
  "generative-ai-gpai": "genai",
  "aisa-l2-risk-levels": "ai-risiconiveaus",
  "aisa-l2-workplace-examples": "praktijkvoorbeelden",
  "aisa-l2-prohibited-allowed": "verboden-vs-toegestaan",
  "aisa-l3-transparency": "transparantie",
  "aisa-l3-human-in-the-loop": "human-in-the-loop",
  "aisa-l3-bias-data": "bias-en-data",
  "aisa-l3-safe-prompting": "prompting-basics-veilig-gebruik",
  "aisa-assessment": "scenario-gebaseerde-toetsing",
  "aisa-outputs-evidence": "outputs-en-bewijsstukken",
  "aisa-versioned-credential": "versioned-compliance-credential",
  "aisa-positioning": "positionering",
};

const legacyAiLiteracyPageCodes = Object.fromEntries(
  Object.entries(aiLiteracyPageCodeRenames).map(([legacyCode, currentCode]) => [currentCode, legacyCode]),
) as Record<string, string>;

export function normalizeAiLiteracyPageCode(pageCode: string) {
  return aiLiteracyPageCodeRenames[pageCode] ?? pageCode;
}

export function getLegacyAiLiteracyPageCode(pageCode: string) {
  return legacyAiLiteracyPageCodes[pageCode] ?? pageCode;
}

const topicSeeds: TopicSeed[] = aiLiteracyFoundationTopicSeeds;

function findAiLiteracyPageSeed(pageCode: string): PageSeed {
  const page = topicSeeds.flatMap((topic) => topic.pages).find((item) => item.code === pageCode);

  if (!page) {
    throw new Error(`AI Literacy preview page not found: ${pageCode}`);
  }

  return page;
}

function reuseAiLiteracyPage(pageCode: string): PageSeed {
  const page = findAiLiteracyPageSeed(pageCode);

  return {
    ...page,
    blocks: page.blocks,
  };
}

export const aiLiteracyTopicSeeds: AiLiteracyTopicSeed[] = topicSeeds;

export const aiLiteracyPreviewCourse: LearningCourseView = {
  id: "preview-ai-literacy-foundation",
  course_code: "ai-literacy-foundation",
  title: "AI Literacy (foundation)",
  subtitle: "AI-rijbewijs voor verantwoord gebruik",
  description:
    "Praktische AI-geletterdheid voor Nederlandse MKB-medewerkers, gekoppeld aan EU AI Act Article 4, privacy, outputcontrole, human oversight en escalatie.",
  difficulty_level: "foundation",
  required_for_onboarding: true,
  passing_threshold: 80,
  topics: topicSeeds.map((topic, topicIndex) => {
    const topicId = `preview-topic-${topic.code}`;

    return {
      id: topicId,
      topic_code: topic.code,
      title: topic.title,
      summary: topic.summary,
      sequence_order: topicIndex + 1,
      is_required: true,
      pages: topic.pages.map((page, pageIndex) => ({
        id: `preview-page-${page.code}`,
        page_code: page.code,
        topic_id: topicId,
        title: page.title,
        summary: page.summary,
        page_type: page.type,
        estimated_duration_minutes: page.minutes,
        sequence_order: pageIndex + 1,
        is_required: page.is_required ?? true,
        content: {
          version: 1,
          blocks: page.blocks,
        },
      })),
    };
  }),
  pages: [],
};

const aiProficiencyTopicSeeds: TopicSeed[] = [
  {
    code: "proficiency-foundation-bridge",
    title: "Introductie",
    summary: "Basisbegrippen uit het AI-rijbewijs die ook als opstap voor AI Proficiency beschikbaar blijven.",
    pages: [
      reuseAiLiteracyPage("genai"),
    ],
  },
  {
    code: "proficiency-responsible-use",
    title: "Voortgang",
    summary: "Verdiepende verantwoord-gebruik onderwerpen die in sommige browserstates al onder AI Proficiency zichtbaar waren.",
    pages: [
      reuseAiLiteracyPage("transparantie"),
      reuseAiLiteracyPage("verboden-vs-toegestaan"),
      reuseAiLiteracyPage("praktijkvoorbeelden"),
    ],
  },
  {
    code: "proficiency-practice",
    title: "AI toepassen in je werk",
    summary: "Kies de juiste AI-aanpak, formuleer een goede taak en herken wanneer je beter niet automatiseert.",
    pages: [
      {
        code: "werkproces-analyseren",
        title: "Werkproces analyseren",
        summary: "Bepaal waar AI echt waarde toevoegt en waar menselijk oordeel leidend blijft.",
        type: "content",
        minutes: 18,
        blocks: [
          {
            id: "werkproces-intro",
            type: "paragraph",
            markdown:
              "Begin niet met een tool, maar met het werkproces. AI is vooral nuttig bij taken met herhaling, veel informatie, een duidelijke kwaliteitsnorm en ruimte voor menselijke controle.",
          },
          {
            id: "werkproces-checklist",
            type: "checklist",
            title: "AI-kans beoordelen",
            items: [
              "De taak heeft een duidelijk doel en herkenbare output.",
              "Er is voldoende context beschikbaar zonder gevoelige data te delen.",
              "Een medewerker kan de output beoordelen voordat die wordt gebruikt.",
              "De impact op klanten, collega's of besluiten is laag tot beheersbaar.",
            ],
          },
          {
            id: "werkproces-callout",
            type: "callout",
            tone: "info",
            markdown:
              "Gebruik AI niet om verantwoordelijkheid te verplaatsen. Jij blijft eigenaar van de keuze om output wel of niet te gebruiken.",
          },
        ],
      },
      {
        code: "taak-naar-prompt",
        title: "Van taak naar goede prompt",
        summary: "Vertaal een concrete werktaak naar context, instructie, beperkingen en controlepunten.",
        type: "content",
        minutes: 22,
        blocks: [
          {
            id: "prompt-structuur",
            type: "paragraph",
            markdown:
              "Een goede prompt beschrijft de taak, context, gewenste vorm, beperkingen en controlepunten. Hoe concreter je werkafspraak, hoe beter je de output kunt beoordelen.",
          },
          {
            id: "prompt-cards",
            type: "knowledge_cards",
            cards: [
              { id: "taak", title: "Taak", text: "Wat moet AI precies doen en voor wie?" },
              { id: "context", title: "Context", text: "Welke achtergrondinformatie is nodig zonder onnodige data te delen?" },
              { id: "criteria", title: "Criteria", text: "Waar moet de output aantoonbaar aan voldoen?" },
            ],
          },
          {
            id: "prompt-reflection",
            type: "reflection",
            prompt: "Neem een taak uit je eigen werk. Welke context en kwaliteitscriteria zou je expliciet in je prompt opnemen?",
            placeholder: "Mijn taak is... De output moet...",
            min_words: 20,
            save_personal: true,
          },
        ],
      },
      {
        code: "kwaliteit-controleren",
        title: "Output controleren",
        summary: "Check betrouwbaarheid, brongebruik, bias en ontbrekende context voordat je AI-output gebruikt.",
        type: "content",
        minutes: 20,
        blocks: [
          {
            id: "kwaliteit-intro",
            type: "paragraph",
            markdown:
              "AI-output kan overtuigend klinken zonder juist te zijn. Controleer daarom altijd inhoud, bronnen, aannames en mogelijke bias voordat je de output gebruikt in communicatie of besluitvorming.",
          },
          {
            id: "kwaliteit-checklist",
            type: "checklist",
            title: "Vier checks voor gebruik",
            items: [
              "Feiten: kloppen namen, cijfers, datums en definities?",
              "Bronnen: zijn beweringen herleidbaar of moet je zelf verifiëren?",
              "Context: ontbreekt er informatie die alleen jij of je organisatie kent?",
              "Impact: kan deze output iemand benadelen of misleiden?",
            ],
          },
          {
            id: "kwaliteit-scenario",
            type: "scenario",
            situation: "AI maakt een nette samenvatting van een klantdossier, maar noemt een oorzaak die niet in het dossier staat.",
            question: "Wat doe je voordat je de samenvatting gebruikt?",
            choices: [
              {
                id: "use",
                label: "Gebruiken; de tekst klinkt professioneel.",
                consequence: "Je neemt mogelijk een verzonnen conclusie over.",
                is_recommended: false,
              },
              {
                id: "verify",
                label: "Controleren tegen het dossier en de oorzaak verwijderen als die niet onderbouwd is.",
                consequence: "Je houdt de output bruikbaar én betrouwbaar.",
                is_recommended: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "proficiency-data",
    title: "Data, privacy en klantcontext",
    summary: "Werk veilig met interne informatie, persoonsgegevens en klantgevoelige context.",
    pages: [
      {
        code: "data-classificeren",
        title: "Data classificeren",
        summary: "Leer welke informatie je wel, beperkt of niet in AI-tools mag gebruiken.",
        type: "content",
        minutes: 18,
        blocks: [
          {
            id: "data-intro",
            type: "paragraph",
            markdown:
              "Niet alle informatie hoort in dezelfde AI-tool. Classificeer data vóórdat je gaat prompten: openbaar, intern, vertrouwelijk, persoonsgegeven of bijzonder gevoelig.",
          },
          {
            id: "data-comparison",
            type: "comparison",
            title: "Wel versus niet delen",
            left_label: "Meestal geschikt",
            right_label: "Niet zonder extra waarborgen",
            left_items: ["Openbare productinformatie", "Algemene procesbeschrijvingen", "Geanonimiseerde voorbeelden"],
            right_items: ["Persoonsgegevens", "Klantdossiers", "Contracten, prijzen of interne strategie"],
            left_color: "#0f766e",
            right_color: "#ba1a1a",
          },
          {
            id: "data-takeaways",
            type: "key_takeaways",
            title: "Vuistregel",
            items: [
              "Deel niet meer data dan nodig is voor de taak.",
              "Anonimiseer waar mogelijk.",
              "Gebruik goedgekeurde tooling voor gevoelige of interne informatie.",
            ],
          },
        ],
      },
      {
        code: "privacy-by-design",
        title: "Privacy by design",
        summary: "Pas minimalisatie, anonimisering en beveiligde tooling toe in dagelijkse AI-taken.",
        type: "content",
        minutes: 24,
        blocks: [
          {
            id: "privacy-intro",
            type: "paragraph",
            markdown:
              "Privacy by design betekent dat je privacy niet achteraf repareert, maar vooraf meeneemt in je keuze voor data, tool, prompt en controle.",
          },
          {
            id: "privacy-checklist",
            type: "checklist",
            title: "Privacy by design in 5 stappen",
            items: [
              "Bepaal of persoonsgegevens echt nodig zijn.",
              "Verwijder of vervang identificeerbare gegevens.",
              "Gebruik alleen goedgekeurde AI-tools.",
              "Leg vast welke output je gebruikt en waarom.",
              "Vraag hulp bij twijfel over gevoelige data.",
            ],
          },
          {
            id: "privacy-progress",
            type: "progress_check",
            question: "Hoe zeker ben je dat je gevoelige data kunt herkennen voordat je AI gebruikt?",
            scale: 5,
            label_low: "Onzeker",
            label_high: "Zeker",
            show_labels: true,
          },
        ],
      },
    ],
  },
  {
    code: "proficiency-assessment",
    title: "Praktijkcase en certificering",
    summary: "Laat zien dat je AI verantwoord kunt inzetten in een herkenbare werksituatie.",
    pages: [
      {
        code: "praktijkcase",
        title: "Praktijkcase uitwerken",
        summary: "Werk een rolgerichte AI-case uit met risicoanalyse, promptstrategie en kwaliteitscheck.",
        type: "case",
        minutes: 35,
        blocks: [
          {
            id: "case-lab",
            type: "case_lab",
            title: "Ontwerp je eigen verantwoorde AI-toepassing",
            markdown:
              "Kies een taak uit je werk. Beschrijf het doel, de data die nodig is, de promptaanpak, de risico's en de manier waarop je output controleert voordat je die gebruikt.",
            reflection_prompt:
              "Welke menselijke controle blijft nodig en wanneer zou je escaleren naar je leidinggevende, DPO of AI-verantwoordelijke?",
          },
          {
            id: "case-checklist",
            type: "checklist",
            title: "Je case is compleet als je dit hebt ingevuld",
            items: [
              "Werkproces en doel",
              "Dataclassificatie",
              "Promptstrategie",
              "Kwaliteitscontrole",
              "Escalatiepunt bij twijfel",
            ],
          },
        ],
      },
      {
        code: "proficiency-assessment",
        title: "Assessment",
        summary: "Rond de cursus af met scenario's, reflectie en een korte kennistoets.",
        type: "assessment",
        minutes: 25,
        blocks: [
          {
            id: "assessment-intro",
            type: "paragraph",
            markdown:
              "In dit assessment laat je zien dat je AI niet alleen kunt gebruiken, maar ook verantwoord kunt begrenzen, controleren en onderbouwen.",
          },
          {
            id: "assessment-quiz",
            type: "quiz_multiple_choice",
            question: "Wat is de beste eerste stap bij een nieuwe AI-taak?",
            options: [
              { id: "tool", label: "Direct een AI-tool openen en experimenteren." },
              { id: "process", label: "Eerst doel, data, risico en controle bepalen." },
              { id: "copy", label: "Een bestaande prompt kopiëren." },
            ],
            correct_option_id: "process",
            explanation:
              "AI Proficiency begint bij werkproces en verantwoordelijkheid. Daarna kies je pas tool en prompt.",
          },
          {
            id: "assessment-reflection",
            type: "reflection",
            prompt: "Beschrijf één situatie waarin jij AI-output niet direct zou gebruiken, maar eerst extra zou controleren of escaleren.",
            placeholder: "Ik zou extra controleren wanneer...",
            min_words: 30,
            save_personal: true,
          },
        ],
      },
    ],
  },
];

const activeAiProficiencyTopicSeeds: TopicSeed[] = aiProficiencyCourseTopicSeeds;

export const aiProficiencyPreviewCourse: LearningCourseView = {
  id: "preview-ai-proficiency",
  course_code: "ai-proficiency",
  title: "AI Proficiency",
  subtitle: "Doelgericht en verantwoord AI toepassen in je werk",
  description:
    "Vervolgniveau voor frequente AI-gebruikers. Je leert use cases kiezen, beter prompten, veilig omgaan met data, output controleren, escaleren en je toepassing aantoonbaar maken.",
  difficulty_level: "intermediate",
  required_for_onboarding: false,
  passing_threshold: 80,
  topics: activeAiProficiencyTopicSeeds.map((topic, topicIndex) => {
    const topicId = `preview-topic-${topic.code}`;

    return {
      id: topicId,
      topic_code: topic.code,
      title: topic.title,
      summary: topic.summary,
      sequence_order: topicIndex + 1,
      is_required: true,
      pages: topic.pages.map((page, pageIndex) => ({
        id: `preview-page-${page.code}`,
        page_code: page.code,
        topic_id: topicId,
        title: page.title,
        summary: page.summary,
        page_type: page.type,
        estimated_duration_minutes: page.minutes,
        sequence_order: pageIndex + 1,
        is_required: true,
        content: {
          version: 1,
          blocks: page.blocks,
        },
      })),
    };
  }),
  pages: [],
};

const aiMasteryTopicSeeds: TopicSeed[] = [
  {
    code: "mastery-introductie",
    title: "Introductie",
    summary: "Starttopic voor AI Mastery met focus op bias, data en professioneel oordeel.",
    pages: [
      {
        code: "bias-en-data",
        title: "Bewustzijn van bias en data",
        summary: "Herken hoe datakwaliteit, selectie en context AI-output kunnen vertekenen.",
        type: "content",
        minutes: 8,
        blocks: [
          {
            id: "bias-data-intro",
            type: "paragraph",
            markdown:
              "AI Mastery start bij kritisch kijken naar data. Welke data ontbreekt, wie is ondervertegenwoordigd en welke aannames zitten in de output?",
          },
          {
            id: "bias-data-check",
            type: "checklist",
            items: [
              "Controleer of de dataset representatief is voor de doelgroep.",
              "Benoem welke context de AI-tool niet kan kennen.",
              "Leg vast welke menselijke controle nodig blijft.",
            ],
          },
        ],
      },
      {
        code: "risico-inschatten",
        title: "Risico inschatten",
        summary: "Bepaal wanneer een AI-toepassing extra controle, governance of escalatie nodig heeft.",
        type: "content",
        minutes: 7,
        blocks: [],
      },
      {
        code: "menselijke-controle",
        title: "Menselijke controle organiseren",
        summary: "Ontwerp duidelijke reviewmomenten voor AI-output in je werkproces.",
        type: "content",
        minutes: 7,
        blocks: [],
      },
    ],
  },
  {
    code: "mastery-vervolg",
    title: "Het vervolg",
    summary: "Verdiepende toepassing: evalueren, borgen en verbeteren.",
    pages: [
      {
        code: "kwaliteit-en-bronnen",
        title: "Kwaliteit en bronnen beoordelen",
        summary: "Beoordeel output op juistheid, herleidbaarheid en bruikbaarheid.",
        type: "content",
        minutes: 6,
        blocks: [],
      },
      {
        code: "governance-in-praktijk",
        title: "Governance in de praktijk",
        summary: "Verbind beleid, rollen en bewijsvoering aan concrete AI-taken.",
        type: "case",
        minutes: 6,
        blocks: [],
      },
      {
        code: "mastery-reflectie",
        title: "Reflectie en borging",
        summary: "Leg vast hoe je AI-gebruik verantwoord blijft verbeteren.",
        type: "assessment",
        minutes: 6,
        blocks: [],
      },
    ],
  },
];

const activeAiMasteryTopicSeeds: TopicSeed[] = aiMasteryCourseTopicSeeds;

export const aiMasteryPreviewCourse: LearningCourseView = {
  id: "preview-ai-mastery",
  course_code: "ai-mastery",
  title: "AI Mastery",
  subtitle: "AI-adoptie, governance en menselijk toezicht op team- en procesniveau",
  description:
    "Advanced cursus voor AI-ambassadeurs, teamleads, proceseigenaren en privacy/security/compliance/operations rollen die AI-use cases moeten beoordelen, inrichten en borgen.",
  difficulty_level: "advanced",
  required_for_onboarding: false,
  passing_threshold: 80,
  topics: activeAiMasteryTopicSeeds.map((topic, topicIndex) => {
    const topicId = `preview-topic-${topic.code}`;

    return {
      id: topicId,
      topic_code: topic.code,
      title: topic.title,
      summary: topic.summary,
      sequence_order: topicIndex + 1,
      is_required: true,
      pages: topic.pages.map((page, pageIndex) => ({
        id: `preview-page-${page.code}`,
        page_code: page.code,
        topic_id: topicId,
        title: page.title,
        summary: page.summary,
        page_type: page.type,
        estimated_duration_minutes: page.minutes,
        sequence_order: pageIndex + 1,
        is_required: true,
        content: {
          version: 1,
          blocks: page.blocks,
        },
      })),
    };
  }),
  pages: [],
};

export function getCoursePages(course: LearningCourseView): LearningPageView[] {
  return course.topics.length
    ? course.topics.flatMap((topic) => topic.pages)
    : course.pages;
}

aiLiteracyPreviewCourse.pages = getCoursePages(aiLiteracyPreviewCourse);
aiProficiencyPreviewCourse.pages = getCoursePages(aiProficiencyPreviewCourse);
aiMasteryPreviewCourse.pages = getCoursePages(aiMasteryPreviewCourse);
