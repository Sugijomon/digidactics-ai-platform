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
  lessons: LearningLessonView[];
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
  lessons: [
    {
      id: "preview-ai-literacy-what-is-ai",
      lesson_code: "ai-literacy-what-is-ai",
      title: "Wat is AI en wat is het niet?",
      summary:
        "Een nuchtere basis: AI voorspelt patronen, maar begrijpt niet wat het produceert.",
      lesson_type: "lesson",
      estimated_duration_minutes: 8,
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
      id: "preview-ai-literacy-data-and-confidentiality",
      lesson_code: "ai-literacy-data-and-confidentiality",
      title: "Data, vertrouwelijkheid en AI-tools",
      summary:
        "Leer welke data je wel en niet in AI-tools verwerkt, en wanneer extra waarborgen nodig zijn.",
      lesson_type: "lesson",
      estimated_duration_minutes: 10,
      sequence_order: 2,
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
      id: "preview-ai-literacy-human-oversight",
      lesson_code: "ai-literacy-human-oversight",
      title: "Menselijk toezicht dat echt iets betekent",
      summary:
        "Maak van human-in-the-loop geen vinkje, maar een concrete controlehandeling.",
      lesson_type: "case_lab",
      estimated_duration_minutes: 12,
      sequence_order: 3,
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
  ],
};

