import type { LessonContent } from "@digidactics/domain/learning";

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
  progressByLessonId: Record<string, LearningProgressView>;
  progressByPageId: Record<string, LearningProgressView>;
  attemptsByPageId: Record<string, LearningAttemptView>;
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

interface PageSeed {
  code: string;
  title: string;
  summary: string;
  type: string;
  minutes: number;
  blocks: LessonContent["blocks"];
}

interface TopicSeed {
  code: string;
  title: string;
  summary: string;
  pages: PageSeed[];
}

const topicSeeds: TopicSeed[] = [
  {
    code: "l1-ai-fundamentals",
    title: "L1 - AI Fundamentals",
    summary: "Wat telt als AI, inclusief GenAI, GPAI en veelvoorkomende mythes.",
    pages: [
      {
        code: "aisa-regulatory-anchor",
        title: "Regulatory anchor",
        summary: "EU AI Act Article 4 en de startdatum van de AI literacy verplichting.",
        type: "content",
        minutes: 5,
        blocks: [
          {
            id: "hero",
            type: "hero",
            title: "AISA AI Literacy Foundations",
            subtitle: "EU AI Act aligned basisprogramma voor risk-based, role-appropriate literacy.",
          },
          {
            id: "anchor",
            type: "key_takeaways",
            items: [
              "EU AI Act Article 4 maakt AI literacy verplicht.",
              "De verplichting is van toepassing vanaf 2 februari 2025.",
              "Literacy moet risk-based en passend bij de rol zijn.",
            ],
          },
          {
            id: "outcomes",
            type: "checklist",
            items: [
              "Uitleggen wat AI wel en niet is, inclusief GenAI en GPAI.",
              "AI-risico's herkennen die relevant zijn voor de eigen rol.",
              "AI verantwoord gebruiken binnen het bedrijfsbeleid.",
              "Risico's op de juiste manier escaleren.",
              "Verwachtingen rondom menselijk toezicht begrijpen.",
            ],
          },
        ],
      },
      {
        code: "aisa-l1-what-counts-as-ai",
        title: "Wat telt als AI onder de AI Act",
        summary: "Een praktische afbakening van AI-systemen in de werkomgeving.",
        type: "content",
        minutes: 7,
        blocks: [
          {
            id: "concept",
            type: "paragraph",
            markdown:
              "Onder de AI Act gaat het niet alleen om chatbots. Ook systemen die voorspellen, aanbevelen, classificeren of beslisondersteuning geven kunnen AI-systemen zijn.",
          },
          {
            id: "examples",
            type: "key_takeaways",
            items: [
              "Een model dat sollicitaties rangschikt kan een AI-systeem zijn.",
              "Een tool die klantvragen prioriteert kan een AI-systeem zijn.",
              "Een simpele vaste beslisboom is niet automatisch AI.",
            ],
          },
          {
            id: "check",
            type: "quiz_multiple_choice",
            question: "Wat is de beste eerste vraag bij twijfel of iets AI is?",
            options: [
              { id: "a", label: "Gebruikt het systeem patronen, voorspellingen of classificaties?" },
              { id: "b", label: "Heeft het systeem een modern dashboard?" },
              { id: "c", label: "Is de leverancier een groot technologiebedrijf?" },
            ],
            correct_option_id: "a",
          },
        ],
      },
      {
        code: "aisa-l1-genai-gpai",
        title: "Basiskennis van Generatieve AI en GPAI",
        summary: "Wat GenAI en general-purpose AI kunnen, en waar de grenzen liggen.",
        type: "content",
        minutes: 8,
        blocks: [
          {
            id: "genai",
            type: "paragraph",
            markdown:
              "Generatieve AI maakt nieuwe tekst, beelden, code of andere output op basis van patronen in trainingsdata en context. GPAI-modellen kunnen breed worden toegepast en worden vaak ingebouwd in verschillende tools.",
          },
          {
            id: "limits",
            type: "callout",
            tone: "warning",
            markdown:
              "GenAI kan overtuigend klinken zonder juist te zijn. Hallucinaties, bias en ontbrekende context blijven normale risico's.",
          },
          {
            id: "myths",
            type: "checklist",
            items: [
              "AI begrijpt niet automatisch de betekenis van output.",
              "Een goede prompt is geen garantie op betrouwbare output.",
              "GPAI in een goedgekeurde tool vraagt nog steeds passend gebruik.",
            ],
          },
        ],
      },
    ],
  },
  {
    code: "l2-risk-responsibility",
    title: "L2 - Risk & Responsibility",
    summary: "AI-risiconiveaus, praktijkvoorbeelden en wat verboden of toegestaan is.",
    pages: [
      {
        code: "aisa-l2-risk-levels",
        title: "AI-risiconiveaus eenvoudig uitgelegd",
        summary: "Van verboden gebruik tot beperkte en hogere risico's.",
        type: "content",
        minutes: 8,
        blocks: [
          {
            id: "levels",
            type: "key_takeaways",
            items: [
              "Sommige AI-toepassingen zijn verboden.",
              "Hogere risico's vragen strengere waarborgen.",
              "Ook beperkte risico's vragen transparantie en verantwoord gebruik.",
            ],
          },
          {
            id: "routeai-link",
            type: "callout",
            tone: "info",
            markdown:
              "RouteAI operationaliseert deze classificatie straks via de risk engine. Deze cursus is het toegangsbewijs om usecases verantwoord te checken.",
          },
        ],
      },
      {
        code: "aisa-l2-workplace-examples",
        title: "Praktijkvoorbeelden uit de werkomgeving",
        summary: "Herken AI-risico's in HR, klantcontact, beleid en analyse.",
        type: "case",
        minutes: 9,
        blocks: [
          {
            id: "case-hr",
            type: "case_lab",
            title: "Voorbeeld: HR-beoordeling",
            markdown:
              "Een team wil AI gebruiken om beoordelingsgesprekken samen te vatten en promotiekandidaten te signaleren.",
            reflection_prompt:
              "Welke risico's zie je voor medewerkers, data en menselijke besluitvorming?",
          },
          {
            id: "case-service",
            type: "case_lab",
            title: "Voorbeeld: klantprioritering",
            markdown:
              "Een AI-tool geeft urgentiescores aan klantvragen en stuurt sommige vragen sneller door.",
            reflection_prompt:
              "Wanneer wordt dit meer dan alleen administratieve ondersteuning?",
          },
        ],
      },
      {
        code: "aisa-l2-prohibited-allowed",
        title: "Wat verboden is versus wat toegestaan is",
        summary: "Een praktische escalatielens voor medewerkers.",
        type: "question",
        minutes: 7,
        blocks: [
          {
            id: "boundary",
            type: "paragraph",
            markdown:
              "Medewerkers hoeven geen jurist te zijn, maar moeten wel herkennen wanneer een AI-toepassing niet zelf gestart mag worden en moet worden geëscaleerd.",
          },
          {
            id: "escalate",
            type: "checklist",
            items: [
              "Raakt de AI toegang tot werk, onderwijs, zorg, geld of dienstverlening?",
              "Worden personen beoordeeld, gerangschikt of uitgesloten?",
              "Is de toepassing niet vooraf goedgekeurd of onduidelijk beschreven?",
            ],
          },
          {
            id: "question",
            type: "short_answer",
            question: "Noem één voorbeeld waarin jij eerst zou escaleren voordat AI wordt gebruikt.",
            placeholder: "Beschrijf kort de situatie en waarom escalatie nodig is.",
            min_words: 20,
          },
        ],
      },
    ],
  },
  {
    code: "l3-responsible-use",
    title: "L3 - Responsible Use",
    summary: "Transparantie, human-in-the-loop, bias, data en veilige prompting.",
    pages: [
      {
        code: "aisa-l3-transparency",
        title: "Transparantie",
        summary: "Wanneer en hoe maak je AI-gebruik zichtbaar?",
        type: "content",
        minutes: 6,
        blocks: [
          {
            id: "transparency",
            type: "paragraph",
            markdown:
              "Transparantie betekent dat betrokkenen en collega's kunnen begrijpen dat AI is gebruikt, waarvoor het is gebruikt en welke menselijke controle heeft plaatsgevonden.",
          },
          {
            id: "takeaways",
            type: "key_takeaways",
            items: [
              "Verberg AI-gebruik niet wanneer het relevant is voor vertrouwen of besluitvorming.",
              "Leg vast welke AI-output is gebruikt en wie deze heeft beoordeeld.",
              "Gebruik geen AI-output alsof het een gevalideerde bron is.",
            ],
          },
        ],
      },
      {
        code: "aisa-l3-human-in-the-loop",
        title: "Human-in-the-loop",
        summary: "Menselijk toezicht dat echt iets betekent.",
        type: "case",
        minutes: 8,
        blocks: [
          {
            id: "oversight",
            type: "paragraph",
            markdown:
              "Menselijk toezicht is geen vinkje. De reviewer moet kunnen ingrijpen, de output begrijpen, afwijkingen herkennen en verantwoordelijkheid nemen voor de uiteindelijke handeling.",
          },
          {
            id: "checklist",
            type: "checklist",
            items: [
              "Kan ik uitleggen waarom ik de output accepteer of afwijs?",
              "Heb ik voldoende context om de output te beoordelen?",
              "Is er een escalatieroute als de output twijfelachtig is?",
            ],
          },
        ],
      },
      {
        code: "aisa-l3-bias-data",
        title: "Bewustzijn van bias en data",
        summary: "Data bepaalt vaak het risico van een AI-toepassing.",
        type: "content",
        minutes: 8,
        blocks: [
          {
            id: "data",
            type: "callout",
            tone: "warning",
            markdown:
              "Persoonsgegevens, bijzondere persoonsgegevens, bedrijfsvertrouwelijke informatie en context over kwetsbare personen vragen extra waarborgen.",
          },
          {
            id: "bias",
            type: "paragraph",
            markdown:
              "Bias kan ontstaan door trainingsdata, selectie van input, historische patronen of verkeerde interpretatie van output. Daarom moet AI-output altijd in context worden beoordeeld.",
          },
          {
            id: "quiz",
            type: "quiz_true_false",
            question: "Geanonimiseerde input is altijd veilig om in elke AI-tool te gebruiken.",
            correct_answer: false,
            explanation:
              "Ook contextueel herleidbare of vertrouwelijke informatie kan risico's opleveren. Toolbeleid en dataclassificatie blijven nodig.",
          },
        ],
      },
      {
        code: "aisa-l3-safe-prompting",
        title: "Prompting basics: veilig gebruik",
        summary: "Praktisch prompten zonder gevoelige data of omwegen.",
        type: "question",
        minutes: 7,
        blocks: [
          {
            id: "safe",
            type: "key_takeaways",
            items: [
              "Gebruik geen gevoelige data in niet-goedgekeurde tools.",
              "Vraag AI om beperkingen en onzekerheden expliciet te benoemen.",
              "Gebruik geen prompts om beleid, beveiliging of beperkingen te omzeilen.",
            ],
          },
          {
            id: "prompt",
            type: "short_answer",
            question: "Herschrijf een risicovolle prompt naar een veilige prompt zonder gevoelige data.",
            placeholder: "Beschrijf je veilige variant.",
            min_words: 25,
          },
        ],
      },
    ],
  },
  {
    code: "l4-assessment-evidence",
    title: "Assessment & Evidence",
    summary: "Scenario-toetsing, bewijsstukken, geldigheid en positionering.",
    pages: [
      {
        code: "aisa-assessment",
        title: "Scenario-gebaseerde toetsing",
        summary: "Open-book assessment met rol-specifieke varianten.",
        type: "assessment",
        minutes: 10,
        blocks: [
          {
            id: "assessment",
            type: "case_lab",
            title: "Scenario completion evidence",
            markdown:
              "Deelnemers werken met scenario's die passen bij hun rol. Het doel is niet memoriseren, maar aantonen dat zij risico's herkennen, verantwoord handelen en op tijd escaleren.",
            reflection_prompt:
              "Welke informatie heb je nodig voordat je deze AI-usecase veilig kunt beoordelen?",
          },
          {
            id: "variants",
            type: "checklist",
            items: [
              "Open book toetsing.",
              "Rol-specifieke varianten.",
              "Bewijs van scenario completion.",
            ],
          },
        ],
      },
      {
        code: "aisa-outputs-evidence",
        title: "Outputs en bewijsstukken",
        summary: "Wat de organisatie en deelnemer kunnen aantonen.",
        type: "content",
        minutes: 5,
        blocks: [
          {
            id: "outputs",
            type: "key_takeaways",
            items: [
              "Individueel certificaat van afronding.",
              "Organisatorisch trainingslogboek.",
              "Resultaten van scenario-assessments.",
              "Bewijs van scenario completion.",
            ],
          },
          {
            id: "delivery",
            type: "callout",
            tone: "info",
            markdown:
              "De training kan online, als live workshop van 2-3 uur, of blended worden aangeboden. Blended is de voorkeursvariant.",
          },
        ],
      },
      {
        code: "aisa-versioned-credential",
        title: "Versioned compliance credential",
        summary: "Credential wording, geldigheid en refreshers.",
        type: "content",
        minutes: 6,
        blocks: [
          {
            id: "credential",
            type: "hero",
            title: "AISA AI Governance Foundations - v2026.1",
            subtitle:
              "Proof of AI literacy & governance training aligned with EU AI Act Article 4.",
          },
          {
            id: "why-versioned",
            type: "key_takeaways",
            items: [
              "Wetgeving ontwikkelt zich.",
              "Guidance ontwikkelt zich.",
              "Jurisprudentie ontwikkelt zich.",
              "Reasonable measures ontwikkelen zich.",
            ],
          },
          {
            id: "validity",
            type: "callout",
            tone: "success",
            markdown:
              "Credential geldig voor 12-18 maanden. Daarna volgt een lichte refresher, bijvoorbeeld v2027.1 of v2028.1.",
          },
        ],
      },
      {
        code: "aisa-positioning",
        title: "Positionering",
        summary: "Stand-alone en embedded binnen KIT/RouteAI.",
        type: "content",
        minutes: 4,
        blocks: [
          {
            id: "positioning",
            type: "key_takeaways",
            items: [
              "Stand-alone te verkopen als compliance-ready AI-literacy training.",
              "Embedded als verplicht onderdeel binnen de KIT.",
              "In RouteAI fungeert afronding als harde toegangseis voor usecase checks.",
            ],
          },
        ],
      },
    ],
  },
];

export const aiLiteracyPreviewCourse: LearningCourseView = {
  id: "preview-ai-literacy-foundation",
  course_code: "ai-literacy-foundation",
  title: "AISA AI Literacy Foundations",
  subtitle: "EU AI Act aligned",
  description:
    "Risk-based, role-appropriate AI literacy training aligned with EU AI Act Article 4. De cursus vormt het RouteAI rijbewijs en kan stand-alone of embedded worden aangeboden.",
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
