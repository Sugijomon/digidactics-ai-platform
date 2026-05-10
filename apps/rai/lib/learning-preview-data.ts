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

export interface LearnerStateView {
  isAuthenticated: boolean;
  orgId: string | null;
  enrollment: LearningEnrollmentView | null;
  progressByLessonId: Record<string, LearningProgressView>;
  progressByPageId: Record<string, LearningProgressView>;
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

export function getCoursePages(course: LearningCourseView): LearningPageView[] {
  return course.pages.length
    ? course.pages
    : course.topics.flatMap((topic) => topic.pages);
}

export const aiLiteracyPreviewCourse: LearningCourseView = {
  id: "preview-ai-literacy-foundation",
  course_code: "ai-literacy-foundation",
  title: "AI Literacy voor verantwoord AI-gebruik",
  subtitle: "Van praktisch begrip naar verantwoord handelen",
  description:
    "Basisprogramma voor medewerkers die AI-tools gebruiken of AI-output beoordelen. De cursus combineert praktische AI-geletterdheid met governance, datazorg en menselijk toezicht.",
  difficulty_level: "foundation",
  required_for_onboarding: true,
  passing_threshold: 80,
  topics: [
    {
      id: "preview-topic-ai-basics",
      topic_code: "ai-basics",
      title: "AI begrijpen",
      summary: "Een nuchtere basis voor medewerkers die AI-output gebruiken.",
      sequence_order: 1,
      is_required: true,
      pages: [
        {
          id: "preview-page-ai-literacy-what-is-ai",
          page_code: "ai-literacy-what-is-ai",
          topic_id: "preview-topic-ai-basics",
          title: "Wat is AI en wat is het niet?",
          summary:
            "AI voorspelt patronen, maar begrijpt niet wat het produceert.",
          page_type: "content",
          estimated_duration_minutes: 6,
          sequence_order: 1,
          is_required: true,
          content: {
            version: 1,
            blocks: [
          {
            id: "hero",
            type: "hero",
            title: "Wat is AI?",
            subtitle: "Begrijp het systeem voordat je de output vertrouwt.",
          },
          {
            id: "concept",
            type: "paragraph",
            markdown:
              "AI-systemen herkennen patronen en genereren voorspellingen of output. Ze hebben geen bewustzijn, geen intentie en geen garantie op waarheid. Dat maakt menselijke beoordeling geen formaliteit, maar onderdeel van verantwoord gebruik.",
          },
          {
            id: "practice",
            type: "case_lab",
            title: "Praktijksituatie",
            markdown:
              "Een collega laat AI een advies samenvatten voor een klant. Wat moet je controleren voordat het advies wordt gebruikt?",
            reflection_prompt: "Noem twee controles die jij altijd zou uitvoeren.",
          },
          {
            id: "quiz-1",
            type: "quiz_multiple_choice",
            question: "Welke uitspraak is het meest juist?",
            options: [
              { id: "a", label: "AI begrijpt teksten zoals mensen dat doen." },
              {
                id: "b",
                label: "AI voorspelt waarschijnlijke output op basis van patronen.",
              },
              {
                id: "c",
                label: "AI-output is betrouwbaar zodra de prompt duidelijk is.",
              },
            ],
            correct_option_id: "b",
            explanation:
              "Een duidelijke prompt helpt, maar neemt hallucinaties, bias of contextverlies niet weg.",
          },
        ],
      },
        },
        {
          id: "preview-page-ai-output-check",
          page_code: "ai-literacy-output-check",
          topic_id: "preview-topic-ai-basics",
          title: "AI-output controleren",
          summary: "Een praktische routine voor bron, context en plausibiliteit.",
          page_type: "question",
          estimated_duration_minutes: 5,
          sequence_order: 2,
          is_required: true,
          content: {
            version: 1,
            blocks: [
              {
                id: "intro",
                type: "paragraph",
                markdown:
                  "Controleer AI-output altijd op bronkwaliteit, ontbrekende context, feitelijke juistheid en mogelijke impact voordat je ermee verder werkt.",
              },
              {
                id: "checklist",
                type: "checklist",
                items: [
                  "Welke aannames doet de AI?",
                  "Welke bron of input ontbreekt?",
                  "Wie kan geraakt worden als deze output fout is?",
                ],
              },
              {
                id: "reflection",
                type: "short_answer",
                question:
                  "Welke controle zou jij toevoegen voordat AI-output in een klant- of beleidscontext wordt gebruikt?",
                placeholder: "Beschrijf je controle in een paar zinnen.",
                min_words: 20,
                guidance:
                  "Denk aan broncontrole, menselijke review, privacy of impact op betrokkenen.",
              },
            ],
          },
        },
      ],
    },
    {
      id: "preview-topic-data-care",
      topic_code: "data-care",
      title: "Data, vertrouwelijkheid en AI-tools",
      summary:
        "Welke data mag wel, niet of alleen onder voorwaarden in AI-tools?",
      sequence_order: 2,
      is_required: true,
      pages: [
        {
          id: "preview-page-ai-literacy-data-and-confidentiality",
          page_code: "ai-literacy-data-and-confidentiality",
          topic_id: "preview-topic-data-care",
          title: "Data en vertrouwelijkheid",
          summary:
            "Leer welke data je wel en niet in AI-tools verwerkt.",
          page_type: "content",
          estimated_duration_minutes: 7,
          sequence_order: 1,
          is_required: true,
          content: {
            version: 1,
            blocks: [
          {
            id: "hero",
            type: "hero",
            title: "Data bepaalt het risico",
            subtitle: "Niet elke AI-taak is gelijk. De data maakt vaak het verschil.",
          },
          {
            id: "data-types",
            type: "key_takeaways",
            items: [
              "Persoonsgegevens vragen altijd extra zorg.",
              "Bijzondere persoonsgegevens en HR-contexten vragen expliciete beoordeling.",
              "Bedrijfsvertrouwelijke informatie hoort alleen in goedgekeurde tools en accounts.",
            ],
          },
          {
            id: "policy-callout",
            type: "callout",
            tone: "warning",
            markdown:
              "Als je niet weet of een tool is goedgekeurd, behandel de output en invoer als onder review. Vraag beleid op voordat je gevoelige data verwerkt.",
          },
          {
            id: "quiz-1",
            type: "quiz_true_false",
            question:
              "Een gratis persoonlijk AI-account is geschikt voor interne klantdata als je de naam weglaat.",
            correct_answer: false,
            explanation:
              "Ook pseudonieme of contextueel herleidbare data kan gevoelig zijn. Accounttype en toolbeleid blijven relevant.",
          },
        ],
      },
        },
        {
          id: "preview-page-ai-literacy-approved-tools",
          page_code: "ai-literacy-approved-tools",
          topic_id: "preview-topic-data-care",
          title: "Goedgekeurde tools en accounts",
          summary: "Waarom accounttype, contract en toolbeleid uitmaken.",
          page_type: "embed",
          estimated_duration_minutes: 4,
          sequence_order: 2,
          is_required: true,
          content: {
            version: 1,
            blocks: [
              {
                id: "callout",
                type: "callout",
                tone: "info",
                markdown:
                  "Een goedgekeurde AI-tool is niet alleen een handige app. Het gaat om contractuele waarborgen, logging, dataverwerking en duidelijke afspraken over gebruik.",
              },
              {
                id: "policy-frame",
                type: "iframe",
                title: "Interne AI-tooling policy",
                url: "https://example.com/ai-policy-placeholder",
                height: 320,
                caption:
                  "Placeholder voor een toekomstige policy-embed of klantdocument.",
              },
            ],
          },
        },
      ],
    },
    {
      id: "preview-topic-human-oversight",
      topic_code: "human-oversight",
      title: "Menselijk toezicht dat echt iets betekent",
      summary:
        "Maak van human-in-the-loop geen vinkje, maar een controlehandeling.",
      sequence_order: 3,
      is_required: true,
      pages: [
        {
          id: "preview-page-ai-literacy-human-oversight",
          page_code: "ai-literacy-human-oversight",
          topic_id: "preview-topic-human-oversight",
          title: "Menselijk toezicht",
          summary:
            "AI mag ondersteunen, maar niet ongemerkt beslissen.",
          page_type: "case",
          estimated_duration_minutes: 8,
          sequence_order: 1,
          is_required: true,
          content: {
            version: 1,
            blocks: [
          {
            id: "hero",
            type: "hero",
            title: "Jij blijft verantwoordelijk",
            subtitle: "AI mag ondersteunen, maar niet ongemerkt beslissen.",
          },
          {
            id: "oversight-model",
            type: "paragraph",
            markdown:
              "Goed toezicht betekent dat je weet wat de AI heeft gedaan, welke informatie ontbreekt, welke gevolgen de output kan hebben, en welke beslissing jij zelf neemt.",
          },
          {
            id: "checklist",
            type: "checklist",
            items: [
              "Kan ik uitleggen waarop de output is gebaseerd?",
              "Is er sprake van impact op een persoon, baan, toegang, geld of beoordeling?",
              "Heb ik afwijkingen, twijfel of contextverschillen vastgelegd?",
            ],
          },
          {
            id: "quiz-1",
            type: "quiz_essay",
            question:
              "Beschrijf een situatie waarin AI-output niet direct gebruikt mag worden zonder extra controle.",
            min_words: 60,
            max_words: 180,
            manual_review_required: true,
          },
        ],
      },
        },
        {
          id: "preview-page-ai-literacy-routeai-readiness",
          page_code: "ai-literacy-routeai-readiness",
          topic_id: "preview-topic-human-oversight",
          title: "RouteAI readiness check",
          summary: "De afrondende check voordat RouteAI usecase checks open gaan.",
          page_type: "assessment",
          estimated_duration_minutes: 6,
          sequence_order: 2,
          is_required: true,
          content: {
            version: 1,
            blocks: [
              {
                id: "scenario",
                type: "case_lab",
                title: "Mini-casus",
                markdown:
                  "Je team wil een AI-tool gebruiken om binnenkomende klantvragen te prioriteren. De tool verwerkt tekst van klanten en geeft een urgentiescore.",
                reflection_prompt:
                  "Welke risico's moet RouteAI straks minimaal classificeren voordat dit gebruik live mag?",
              },
              {
                id: "quiz-risk",
                type: "quiz_multiple_select",
                question: "Welke punten horen in ieder geval in de usecase check?",
                options: [
                  { id: "a", label: "Verwerkte persoonsgegevens of vertrouwelijke data" },
                  { id: "b", label: "Impact op klanten of toegang tot dienstverlening" },
                  { id: "c", label: "Alleen de kleur van de applicatie-interface" },
                  { id: "d", label: "Menselijke controle op de AI-score" },
                ],
                correct_option_ids: ["a", "b", "d"],
                explanation:
                  "RouteAI moet vooral data, impact, context en toezicht operationaliseren.",
              },
            ],
          },
        },
      ],
    },
  ],
  pages: [],
};

aiLiteracyPreviewCourse.pages = getCoursePages(aiLiteracyPreviewCourse);
