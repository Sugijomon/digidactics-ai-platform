export type LearningStatus = "draft" | "published" | "archived";

export type LearningDifficulty = "foundation" | "intermediate" | "advanced";

export type LessonType = "lesson" | "microlearning" | "assessment" | "case_lab";

export type LearningPageType =
  | "content"
  | "video"
  | "question"
  | "case"
  | "embed"
  | "assessment";

export type LearnerStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "expired";

export type LessonProgressStatus = "not_started" | "in_progress" | "completed";

export type LessonAttemptStatus = "started" | "submitted" | "graded";

export type LearningCertificationStatus =
  | "active"
  | "expired"
  | "revoked"
  | "superseded";

export type LearningCapabilityCode = "routeai_usecase_check";

export type RecommendationSourceScope =
  | "platform"
  | "routeai"
  | "manual";

export interface LearningAccessCheck {
  can_access: boolean;
  capability_code: LearningCapabilityCode | string;
  required_certification_code: string | null;
  certification_status:
    | LearningCertificationStatus
    | "missing"
    | "not_configured"
    | "missing_profile_org";
  required_course_id: string | null;
  required_course_code: string | null;
  certification_id: string | null;
  expires_at: string | null;
}

export interface LearningSignals {
  triggerCodes?: string[];
  useCaseCodes?: string[];
  contextCodes?: string[];
  toolCodes?: string[];
  scoreTiers?: string[];
  reviewClasses?: string[];
}

export interface LearningRecommendationRuleCriteria {
  triggerCodes?: string[];
  useCaseCodes?: string[];
  contextCodes?: string[];
  toolCodes?: string[];
  scoreTiers?: string[];
  reviewClasses?: string[];
}

export type LearningMatchReason =
  | "trigger_codes"
  | "use_case_codes"
  | "context_codes"
  | "tool_codes"
  | "score_tiers"
  | "review_classes"
  | "default";

export type LessonBlock =
  | HeroBlock
  | HeadingBlock
  | SectionHeaderBlock
  | LegacySectionHeadingBlock
  | ParagraphBlock
  | CalloutBlock
  | QuoteBlock
  | AccordionBlock
  | ImageBlock
  | TimelineBlock
  | DecisionMatrixBlock
  | ComparisonBlock
  | ScenarioBlock
  | ReflectionBlock
  | ProgressCheckBlock
  | KeyTakeawaysBlock
  | KnowledgeCardsBlock
  | ChecklistBlock
  | CaseLabBlock
  | QuizMultipleChoiceBlock
  | QuizMultipleSelectBlock
  | QuizTrueFalseBlock
  | QuizEssayBlock
  | IframeBlock
  | EmbedH5PBlock
  | ShortAnswerBlock
  | VideoBlock
  | AudioBlock
  | SlideDeckBlock
  | DownloadBlock
  | OrganizationContextBlock;

export interface LessonContent {
  version: number;
  blocks: LessonBlock[];
}

export function sanitizeLessonContentForLearner(content: LessonContent): LessonContent {
  return {
    ...content,
    blocks: content.blocks.map(sanitizeLessonBlockForLearner),
  };
}

function sanitizeLessonBlockForLearner(block: LessonBlock): LessonBlock {
  switch (block.type) {
    case "scenario":
      return {
        ...block,
        choices: block.choices.map(({ is_recommended: _isRecommended, ...choice }) => choice),
      } as LessonBlock;
    case "quiz_multiple_choice": {
      const { correct_option_id: _correctOptionId, explanation: _explanation, ...safeBlock } = block;
      return safeBlock as LessonBlock;
    }
    case "quiz_multiple_select": {
      const { correct_option_ids: _correctOptionIds, explanation: _explanation, ...safeBlock } = block;
      return safeBlock as LessonBlock;
    }
    case "quiz_true_false": {
      const { correct_answer: _correctAnswer, explanation: _explanation, ...safeBlock } = block;
      return safeBlock as LessonBlock;
    }
    case "slide_deck":
      return {
        ...block,
        slides: block.slides.map((slide) => ({
          ...slide,
          interaction: sanitizeSlideDeckInteractionForLearner(slide.interaction),
        })),
      };
    default:
      return block;
  }
}

function sanitizeSlideDeckInteractionForLearner(
  interaction: SlideDeckSlideInteraction | undefined,
): SlideDeckSlideInteraction | undefined {
  if (!interaction || interaction.type !== "multiple_choice") {
    return interaction;
  }

  return {
    type: "multiple_choice",
    question: interaction.question,
    options: interaction.options.map(({ is_correct: _isCorrect, ...option }) => option),
  } as SlideDeckSlideInteraction;
}

export type AiLiteracyCompetencyCode =
  | "C1_AI_HERKENNEN"
  | "C2_CONTEXT_BEGRIJPEN"
  | "C3_RISICO_ROLBEWUSTZIJN"
  | "C4_DATA_PRIVACY"
  | "C5_OUTPUTCONTROLE"
  | "C6_HUMAN_OVERSIGHT"
  | "C7_TAAKSELECTIE"
  | "C8_ESCALATIE_BEWIJS";

export type LearningEvidenceKind =
  | "none"
  | "self_check"
  | "quiz"
  | "reflection"
  | "scenario"
  | "case_lab"
  | "assessment";

export type LearningSourceStatus =
  | "current_law"
  | "official_guidance"
  | "provisional_agreement"
  | "draft_national_law"
  | "internal_standard"
  | "review_required";

export type LearningReviewTag =
  | "privacy"
  | "dpo"
  | "hr"
  | "finance"
  | "legal"
  | "security"
  | "toolscope"
  | "evidence_dossier"
  | "ai_act";

export type LearningCefrLevel = "B1" | "B1+" | "B2";

export type LearningRolePathId =
  | "core"
  | "hr"
  | "finance"
  | "marketing"
  | "support"
  | "operations";

export type LearningRolePathRequirement =
  | "core_required"
  | "role_required"
  | "role_optional";

export const ORGANIZATION_CONTEXT_SLOTS = [
  "approved_tools",
  "data_rules",
  "policy_link",
  "escalation_route",
  "oversight_roles",
  "sector_case",
  "role_cases",
] as const;

export type OrganizationContextSlot = (typeof ORGANIZATION_CONTEXT_SLOTS)[number];

export interface OrganizationContextPackContent {
  organization?: {
    name?: string;
    sector?: string;
  };
  approved_tools?: Array<{ name: string; guidance?: string }>;
  data_rules?: string[];
  policy_link?: { label: string; url: string };
  escalation_route?: {
    summary?: string;
    steps?: string[];
    contact_role?: string;
    contact_email?: string;
  };
  oversight_roles?: string[];
  sector_case?: { title: string; description: string };
  role_cases?: Array<{ role: string; title: string; description: string }>;
}

export interface OrganizationContextPackRelease {
  id: string;
  version: number;
  content_hash: string;
  context_json: OrganizationContextPackContent;
}

export interface BaseBlock {
  id: string;
  type: string;
  competency_codes?: AiLiteracyCompetencyCode[];
  evidence_kind?: LearningEvidenceKind;
  required_for_certificate?: boolean;
  reviewer_guidance?: string;
  evidence_items?: string[];
  review_rubric?: ReviewRubricCriterion[];
  source_ids?: string[];
  source_status?: LearningSourceStatus;
  last_verified_at?: string;
  provisional?: boolean;
  legal_review_required?: boolean;
  review_required?: boolean;
  review_tags?: LearningReviewTag[];
  target_cefr?: LearningCefrLevel;
  role_path_ids?: LearningRolePathId[];
  role_path_requirement?: LearningRolePathRequirement;
  evidence_dossier_fields?: string[];
}

export interface OrganizationContextBlock extends BaseBlock {
  type: "organization_context";
  slot: OrganizationContextSlot;
  fallback: string;
  acknowledgement_required?: boolean;
  resolved_context?: OrganizationContextPackContent[OrganizationContextSlot] | null;
  context_pack_release?: Pick<OrganizationContextPackRelease, "id" | "version" | "content_hash">;
}

export interface ReviewRubricCriterion {
  id: string;
  title: string;
  sufficient: string;
  strong?: string;
  hard_fail?: string;
}

export interface HeroBlock extends BaseBlock {
  type: "hero";
  title: string;
  subtitle?: string;
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  text: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface SectionHeaderBlock extends BaseBlock {
  type: "section_header";
  title: string;
  subtitle?: string;
}

export interface LegacySectionHeadingBlock extends BaseBlock {
  type: "section_heading";
  title: string;
  subtitle?: string;
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  markdown: string;
}

export interface CalloutBlock extends BaseBlock {
  type: "callout";
  tone: "info" | "warning" | "success";
  markdown: string;
}

export interface QuoteBlock extends BaseBlock {
  type: "quote";
  quote: string;
  author?: string;
  role?: string;
  source?: string;
  source_url?: string;
}

export interface AccordionBlock extends BaseBlock {
  type: "accordion";
  title?: string;
  items: Array<{ id: string; question: string; answer: string }>;
  allow_multiple_open?: boolean;
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  url: string;
  alt: string;
  caption?: string;
  width?: "small" | "medium" | "full";
}

export interface TimelineBlock extends BaseBlock {
  type: "timeline";
  title?: string;
  items: Array<{
    id: string;
    date: string;
    title: string;
    description?: string;
    highlight: boolean;
  }>;
}

export interface DecisionMatrixBlock extends BaseBlock {
  type: "decision_matrix";
  title?: string;
  x_axis_label: string;
  y_axis_label: string;
  quadrants: Array<{
    id: string;
    title: string;
    subtitle?: string;
    tone: "start" | "careful" | "later" | "avoid";
    summary: string;
    actions: string[];
    checks: string[];
    rule: string;
    examples: Array<{
      id: string;
      title: string;
      description: string;
      value: string;
      risk: string;
    }>;
  }>;
}

export interface ComparisonBlock extends BaseBlock {
  type: "comparison";
  title?: string;
  left_label: string;
  right_label: string;
  left_items: string[];
  right_items: string[];
  left_color: string;
  right_color: string;
}

export interface KnowledgeCardsBlock extends BaseBlock {
  type: "knowledge_cards";
  cards: Array<{ id: string; title: string; text: string }>;
}

export interface ScenarioBlock extends BaseBlock {
  type: "scenario";
  situation: string;
  question: string;
  choices: Array<{
    id: string;
    label: string;
    consequence: string;
    is_recommended: boolean;
  }>;
}

export interface ReflectionBlock extends BaseBlock {
  type: "reflection";
  prompt: string;
  placeholder?: string;
  min_words?: number;
  save_personal: boolean;
}

export interface ProgressCheckBlock extends BaseBlock {
  type: "progress_check";
  question: string;
  scale: 3 | 5;
  label_low: string;
  label_high: string;
  show_labels: boolean;
}

export interface KeyTakeawaysBlock extends BaseBlock {
  type: "key_takeaways";
  title?: string;
  items: string[];
}

export interface ChecklistBlock extends BaseBlock {
  type: "checklist";
  title?: string;
  items: Array<string | { id: string; label: string; required: boolean }>;
  require_all?: boolean;
}

export interface CaseLabBlock extends BaseBlock {
  type: "case_lab";
  title: string;
  markdown: string;
  reflection_prompt?: string;
}

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizMultipleChoiceBlock extends BaseBlock {
  type: "quiz_multiple_choice";
  question: string;
  options: QuizOption[];
  correct_option_id: string;
  explanation?: string;
}

export interface QuizMultipleSelectBlock extends BaseBlock {
  type: "quiz_multiple_select";
  question: string;
  options: QuizOption[];
  correct_option_ids: string[];
  explanation?: string;
}

export interface QuizTrueFalseBlock extends BaseBlock {
  type: "quiz_true_false";
  question: string;
  correct_answer: boolean;
  explanation?: string;
}

export interface QuizEssayBlock extends BaseBlock {
  type: "quiz_essay";
  question: string;
  min_words?: number;
  max_words?: number;
  manual_review_required?: boolean;
}

export interface ShortAnswerBlock extends BaseBlock {
  type: "short_answer";
  question: string;
  placeholder?: string;
  min_words?: number;
  guidance?: string;
}

export interface VideoBlock extends BaseBlock {
  type: "video";
  title?: string;
  url: string;
  caption?: string;
  duration_seconds?: number;
  require_full_watch?: boolean;
  transcript?: string;
  transcript_markdown?: string;
}

export interface AudioBlock extends BaseBlock {
  type: "audio";
  file_url: string;
  file_name: string;
  title?: string;
  duration_seconds?: number;
}

export interface SlideDeckBlock extends BaseBlock {
  type: "slide_deck";
  title?: string;
  slides: Array<{
    id: string;
    title?: string;
    url: string;
    alt?: string;
    caption?: string;
    notes?: string;
    interaction?: SlideDeckSlideInteraction;
  }>;
  show_thumbnails?: boolean;
}

export type SlideDeckSlideInteraction =
  | { type: "none" }
  | {
      type: "reflection";
      prompt: string;
      placeholder?: string;
    }
  | {
      type: "multiple_choice";
      question: string;
      options: Array<{
        id: string;
        label: string;
        is_correct: boolean;
      }>;
      feedback_correct?: string;
      feedback_incorrect?: string;
    };

export interface IframeBlock extends BaseBlock {
  type: "iframe";
  title: string;
  url: string;
  height?: number;
  caption?: string;
  provider?: string;
  allow_fullscreen?: boolean;
}

export interface EmbedH5PBlock extends BaseBlock {
  type: "embed_h5p";
  title: string;
  url: string;
  height: number;
  activity_type: string;
}

export interface DownloadBlock extends BaseBlock {
  type: "download";
  title?: string;
  file_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  file_size_label?: string;
  mime_type?: string;
  url?: string;
  storage_path?: string;
  description?: string;
  label?: string;
  button_label?: string;
}

export function isLessonContent(value: unknown): value is LessonContent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<LessonContent>;

  return (
    typeof candidate.version === "number" &&
    Array.isArray(candidate.blocks) &&
    candidate.blocks.every(isLessonBlock)
  );
}

export function isLessonBlock(value: unknown): value is LessonBlock {
  if (!value || typeof value !== "object") {
    return false;
  }

  const block = value as Partial<LessonBlock>;

  if (typeof block.id !== "string" || typeof block.type !== "string") {
    return false;
  }

  if (block.type === "organization_context") {
    const contextBlock = value as Partial<OrganizationContextBlock>;
    return (
      isOrganizationContextSlot(contextBlock.slot) &&
      typeof contextBlock.fallback === "string" &&
      (contextBlock.acknowledgement_required === undefined ||
        typeof contextBlock.acknowledgement_required === "boolean")
    );
  }

  return true;
}

export function isOrganizationContextSlot(value: unknown): value is OrganizationContextSlot {
  return (
    typeof value === "string" &&
    (ORGANIZATION_CONTEXT_SLOTS as readonly string[]).includes(value)
  );
}

export function isOrganizationContextPackContent(
  value: unknown,
): value is OrganizationContextPackContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const context = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "organization",
    ...ORGANIZATION_CONTEXT_SLOTS,
  ]);
  if (!Object.keys(context).every((key) => allowedKeys.has(key))) {
    return false;
  }

  if (context.organization !== undefined && !isOptionalStringRecord(context.organization, ["name", "sector"])) {
    return false;
  }
  if (
    context.approved_tools !== undefined &&
    (!Array.isArray(context.approved_tools) ||
      !context.approved_tools.every(
        (tool) => isRequiredStringRecord(tool, ["name"], ["guidance"]),
      ))
  ) {
    return false;
  }
  if (context.data_rules !== undefined && !isStringArray(context.data_rules)) return false;
  if (context.oversight_roles !== undefined && !isStringArray(context.oversight_roles)) return false;
  if (
    context.policy_link !== undefined &&
    !isRequiredStringRecord(context.policy_link, ["label", "url"])
  ) {
    return false;
  }
  if (
    context.escalation_route !== undefined &&
    (!context.escalation_route ||
      typeof context.escalation_route !== "object" ||
      Array.isArray(context.escalation_route) ||
      !Object.keys(context.escalation_route).every((key) =>
        ["summary", "steps", "contact_role", "contact_email"].includes(key),
      ) ||
      !["summary", "contact_role", "contact_email"].every((key) => {
        const item = (context.escalation_route as Record<string, unknown>)[key];
        return item === undefined || typeof item === "string";
      }) ||
      ("steps" in context.escalation_route &&
        !isStringArray((context.escalation_route as Record<string, unknown>).steps)))
  ) {
    return false;
  }
  if (
    context.sector_case !== undefined &&
    !isRequiredStringRecord(context.sector_case, ["title", "description"])
  ) {
    return false;
  }
  if (
    context.role_cases !== undefined &&
    (!Array.isArray(context.role_cases) ||
      !context.role_cases.every((roleCase) =>
        isRequiredStringRecord(roleCase, ["role", "title", "description"]),
      ))
  ) {
    return false;
  }

  return true;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOptionalStringRecord(value: unknown, allowedKeys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).every((key) => allowedKeys.includes(key)) &&
    Object.values(record).every((item) => typeof item === "string")
  );
}

function isRequiredStringRecord(
  value: unknown,
  requiredKeys: string[],
  optionalKeys: string[] = [],
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const allowedKeys = [...requiredKeys, ...optionalKeys];
  return (
    Object.keys(record).every((key) => allowedKeys.includes(key)) &&
    requiredKeys.every(
      (key) => typeof record[key] === "string" && String(record[key]).length > 0,
    ) &&
    optionalKeys.every((key) => record[key] === undefined || typeof record[key] === "string")
  );
}

export function getOrganizationContextSlots(content: LessonContent): OrganizationContextSlot[] {
  return content.blocks
    .filter((block): block is OrganizationContextBlock => block.type === "organization_context")
    .map((block) => block.slot);
}

export function applyOrganizationContextToContent(
  content: LessonContent,
  release: OrganizationContextPackRelease | null,
): LessonContent {
  return {
    ...content,
    blocks: content.blocks.map((block) => {
      if (block.type !== "organization_context") {
        return block;
      }

      const resolvedContext = release?.context_json[block.slot] ?? null;

      return {
        ...block,
        resolved_context: resolvedContext,
        context_pack_release: release
          ? {
              id: release.id,
              version: release.version,
              content_hash: release.content_hash,
            }
          : undefined,
      };
    }),
  };
}

export function getQuizBlockIds(content: LessonContent): string[] {
  return content.blocks
    .filter((block) => block.type.startsWith("quiz_"))
    .map((block) => block.id);
}

export function isManualReviewEvidenceBlock(block: LessonBlock): boolean {
  if (block.required_for_certificate && block.evidence_kind && block.evidence_kind !== "none") {
    return block.evidence_kind !== "quiz" && block.evidence_kind !== "self_check";
  }

  return (
    block.type === "quiz_essay" ||
    block.type === "short_answer" ||
    block.type === "reflection" ||
    block.type === "case_lab"
  );
}

export interface LearningCertificationAttemptSummary {
  answers?: Record<string, LearningCertificationAttemptAnswer>;
  percentage: number | null;
  passed: boolean | null;
  manual_review_required: boolean;
}

export interface LearningCertificationAttemptAnswer {
  block_type: string;
  value: string | string[];
}

export interface LearningCertificationPageState {
  page_id: string;
  is_required: boolean;
  content: LessonContent;
  is_completed: boolean;
  latest_attempt?: LearningCertificationAttemptSummary | null;
}

export interface LearningCertificationEligibility {
  eligible: boolean;
  required_page_count: number;
  completed_required_page_count: number;
  missing_page_ids: string[];
  pending_review_page_ids: string[];
  failed_page_ids: string[];
  insufficient_score_page_ids: string[];
  missing_competency_codes: AiLiteracyCompetencyCode[];
  competency_results: LearningCertificationCompetencyResult[];
}

export interface LearningCertificationCompetencyResult {
  competency_code: AiLiteracyCompetencyCode;
  required_evidence_count: number;
  satisfied_evidence_count: number;
  percentage: number;
  required_page_ids: string[];
  satisfied_page_ids: string[];
  satisfied: boolean;
}

export interface LearningAccessRequirementInput {
  capability_code: string;
  required_certification_code: string;
  required_course_id: string | null;
  required_course_code?: string | null;
}

export interface LearningCertificationAccessInput {
  id: string;
  certification_code: string;
  status: LearningCertificationStatus;
  expires_at: string | Date | null;
}

export interface LearningCapabilityAccessInput {
  capability_code?: string;
  org_id: string | null;
  requirement?: LearningAccessRequirementInput | null;
  certification?: LearningCertificationAccessInput | null;
  now?: string | Date;
}

export function evaluateLearningCapabilityAccess({
  capability_code = "routeai_usecase_check",
  org_id,
  requirement,
  certification,
  now = new Date(),
}: LearningCapabilityAccessInput): LearningAccessCheck {
  if (!org_id) {
    return {
      can_access: false,
      capability_code,
      required_certification_code: null,
      certification_status: "missing_profile_org",
      required_course_id: null,
      required_course_code: null,
      certification_id: null,
      expires_at: null,
    };
  }

  if (!requirement) {
    return {
      can_access: false,
      capability_code,
      required_certification_code: null,
      certification_status: "not_configured",
      required_course_id: null,
      required_course_code: null,
      certification_id: null,
      expires_at: null,
    };
  }

  if (!certification) {
    return {
      can_access: false,
      capability_code,
      required_certification_code: requirement.required_certification_code,
      certification_status: "missing",
      required_course_id: requirement.required_course_id,
      required_course_code: requirement.required_course_code ?? null,
      certification_id: null,
      expires_at: null,
    };
  }

  const expiresAt = certification.expires_at ? new Date(certification.expires_at) : null;
  const nowDate = now instanceof Date ? now : new Date(now);
  const isActive = certification.status === "active";
  const isExpired = isActive && expiresAt !== null && expiresAt <= nowDate;

  return {
    can_access: isActive && !isExpired,
    capability_code,
    required_certification_code: requirement.required_certification_code,
    certification_status: isExpired ? "expired" : certification.status,
    required_course_id: requirement.required_course_id,
    required_course_code: requirement.required_course_code ?? null,
    certification_id: certification.id,
    expires_at: expiresAt ? expiresAt.toISOString() : null,
  };
}

export function evaluateLearningCertificationEligibility(
  pages: LearningCertificationPageState[],
  passingThreshold: number,
  criticalCompetencyCodes: AiLiteracyCompetencyCode[] = [
    "C4_DATA_PRIVACY",
    "C6_HUMAN_OVERSIGHT",
    "C8_ESCALATIE_BEWIJS",
  ],
): LearningCertificationEligibility {
  const requiredPages = pages.filter((page) => page.is_required);
  const missingPageIds: string[] = [];
  const pendingReviewPageIds: string[] = [];
  const failedPageIds: string[] = [];
  const insufficientScorePageIds: string[] = [];
  const competencyResults = new Map<AiLiteracyCompetencyCode, LearningCertificationCompetencyResult>();

  for (const page of requiredPages) {
    addRequiredCompetencyEvidence(page.page_id, page.content, competencyResults);

    if (!page.is_completed) {
      missingPageIds.push(page.page_id);
      continue;
    }

    const readiness = getPageCertificationReadiness(page.content, page.latest_attempt ?? null, passingThreshold);

    if (readiness === "pending_review") {
      pendingReviewPageIds.push(page.page_id);
    } else if (readiness === "failed") {
      failedPageIds.push(page.page_id);
    } else if (readiness === "insufficient_score") {
      insufficientScorePageIds.push(page.page_id);
    } else {
      addSatisfiedCompetencyEvidence(
        page.page_id,
        page.content,
        page.latest_attempt ?? null,
        competencyResults,
      );
    }
  }

  const competencyResultRows = [...competencyResults.values()]
    .map((result) => finalizeCompetencyResult(result, passingThreshold))
    .sort((left, right) => left.competency_code.localeCompare(right.competency_code));
  const finalizedCompetencyResults = new Map(
    competencyResultRows.map((result) => [result.competency_code, result]),
  );
  const missingCompetencyCodes = criticalCompetencyCodes.filter((code) => {
    const result = finalizedCompetencyResults.get(code);
    return !result || !result.satisfied;
  });

  return {
    eligible:
      requiredPages.length > 0 &&
      missingPageIds.length === 0 &&
      pendingReviewPageIds.length === 0 &&
      failedPageIds.length === 0 &&
      insufficientScorePageIds.length === 0 &&
      missingCompetencyCodes.length === 0,
    required_page_count: requiredPages.length,
    completed_required_page_count: requiredPages.length - missingPageIds.length,
    missing_page_ids: missingPageIds,
    pending_review_page_ids: pendingReviewPageIds,
    failed_page_ids: failedPageIds,
    insufficient_score_page_ids: insufficientScorePageIds,
    missing_competency_codes: missingCompetencyCodes,
    competency_results: competencyResultRows,
  };
}

export function getPageCertificationReadiness(
  content: LessonContent,
  latestAttempt: LearningCertificationAttemptSummary | null,
  passingThreshold: number,
): "ready" | "pending_review" | "failed" | "insufficient_score" {
  const certificationEvidenceBlocks = content.blocks.filter((block) => block.required_for_certificate);

  if (certificationEvidenceBlocks.length === 0) {
    return "ready";
  }

  const requiresManualReview = certificationEvidenceBlocks.some(isManualReviewEvidenceBlock);

  if (requiresManualReview) {
    if (!latestAttempt || latestAttempt.manual_review_required) {
      return "pending_review";
    }

    return latestAttempt.passed === true ? "ready" : "failed";
  }

  const hasAutoGradableBlocks = certificationEvidenceBlocks.some(isAutoGradableLearningBlock);

  if (!hasAutoGradableBlocks) {
    return "ready";
  }

  if (!latestAttempt || latestAttempt.manual_review_required) {
    return "pending_review";
  }

  if (latestAttempt.passed === false) {
    return "failed";
  }

  return latestAttempt.passed === true && (latestAttempt.percentage ?? 0) >= passingThreshold
    ? "ready"
    : "insufficient_score";
}

export function isAutoGradableLearningBlock(block: LessonBlock): boolean {
  return (
    block.type === "scenario" ||
    block.type === "quiz_multiple_choice" ||
    block.type === "quiz_multiple_select" ||
    block.type === "quiz_true_false"
  );
}

function addRequiredCompetencyEvidence(
  pageId: string,
  content: LessonContent,
  competencyResults: Map<AiLiteracyCompetencyCode, LearningCertificationCompetencyResult>,
) {
  const evidenceBlocks = content.blocks.filter((block) => block.required_for_certificate);

  for (const block of evidenceBlocks) {
    for (const code of block.competency_codes ?? []) {
      const result = getOrCreateCompetencyResult(code, competencyResults);
      result.required_evidence_count += 1;
      if (!result.required_page_ids.includes(pageId)) {
        result.required_page_ids.push(pageId);
      }
    }
  }
}

function addSatisfiedCompetencyEvidence(
  pageId: string,
  content: LessonContent,
  latestAttempt: LearningCertificationAttemptSummary | null,
  competencyResults: Map<AiLiteracyCompetencyCode, LearningCertificationCompetencyResult>,
) {
  const evidenceBlocks = content.blocks.filter((block) => block.required_for_certificate);

  for (const block of evidenceBlocks) {
    if (!isCertificationEvidenceBlockSatisfied(block, latestAttempt)) {
      continue;
    }

    for (const code of block.competency_codes ?? []) {
      const result = getOrCreateCompetencyResult(code, competencyResults);
      result.satisfied_evidence_count += 1;
      if (!result.satisfied_page_ids.includes(pageId)) {
        result.satisfied_page_ids.push(pageId);
      }
    }
  }
}

function isCertificationEvidenceBlockSatisfied(
  block: LessonBlock,
  latestAttempt: LearningCertificationAttemptSummary | null,
) {
  if (!latestAttempt || latestAttempt.manual_review_required || latestAttempt.passed === false) {
    return false;
  }

  const answer = latestAttempt.answers?.[block.id];

  if (isAutoGradableLearningBlock(block)) {
    return isCorrectCertificationAnswer(block, answer?.value);
  }

  if (latestAttempt.passed === true) {
    if (!answer) {
      return true;
    }

    return hasMeaningfulAnswer(answer.value);
  }

  return false;
}

function isCorrectCertificationAnswer(
  block: LessonBlock,
  value: string | string[] | undefined,
) {
  switch (block.type) {
    case "scenario": {
      const selectedChoice = typeof value === "string"
        ? block.choices.find((choice) => choice.id === value)
        : null;
      return selectedChoice?.is_recommended === true;
    }
    case "quiz_multiple_choice":
      return typeof value === "string" && value === block.correct_option_id;
    case "quiz_multiple_select":
      return Array.isArray(value) && sameStringSet(value, block.correct_option_ids);
    case "quiz_true_false":
      return typeof value === "string" && (value === "true") === block.correct_answer;
    default:
      return false;
  }
}

function hasMeaningfulAnswer(value: string | string[]) {
  return Array.isArray(value)
    ? value.some((item) => item.trim().length > 0)
    : value.trim().length > 0;
}

function getOrCreateCompetencyResult(
  code: AiLiteracyCompetencyCode,
  competencyResults: Map<AiLiteracyCompetencyCode, LearningCertificationCompetencyResult>,
) {
  const existing = competencyResults.get(code);

  if (existing) {
    return existing;
  }

  const result: LearningCertificationCompetencyResult = {
    competency_code: code,
    required_evidence_count: 0,
    satisfied_evidence_count: 0,
    percentage: 0,
    required_page_ids: [],
    satisfied_page_ids: [],
    satisfied: false,
  };
  competencyResults.set(code, result);

  return result;
}

function finalizeCompetencyResult(
  result: LearningCertificationCompetencyResult,
  passingThreshold: number,
) {
  const percentage =
    result.required_evidence_count === 0
      ? 0
      : Math.round((result.satisfied_evidence_count / result.required_evidence_count) * 100);

  return {
    ...result,
    percentage,
    satisfied: result.required_evidence_count > 0 && percentage >= passingThreshold,
  };
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

export function estimateCompletionPercentage(
  content: LessonContent,
  completedBlockIds: string[],
): number {
  if (content.blocks.length === 0) {
    return 0;
  }

  const completed = new Set(completedBlockIds);
  const count = content.blocks.filter((block) => completed.has(block.id)).length;

  return Math.round((count / content.blocks.length) * 100);
}

export function ruleMatchesLearningSignals(
  rule: LearningRecommendationRuleCriteria,
  signals: LearningSignals,
): boolean {
  return getLearningMatchReasons(rule, signals).length > 0;
}

export function getLearningMatchReasons(
  rule: LearningRecommendationRuleCriteria,
  signals: LearningSignals,
): LearningMatchReason[] {
  const reasons: LearningMatchReason[] = [];

  if (overlaps(rule.triggerCodes, signals.triggerCodes)) {
    reasons.push("trigger_codes");
  }

  if (overlaps(rule.useCaseCodes, signals.useCaseCodes)) {
    reasons.push("use_case_codes");
  }

  if (overlaps(rule.contextCodes, signals.contextCodes)) {
    reasons.push("context_codes");
  }

  if (overlaps(rule.toolCodes, signals.toolCodes)) {
    reasons.push("tool_codes");
  }

  if (overlaps(rule.scoreTiers, signals.scoreTiers)) {
    reasons.push("score_tiers");
  }

  if (overlaps(rule.reviewClasses, signals.reviewClasses)) {
    reasons.push("review_classes");
  }

  if (reasons.length === 0 && !hasRecommendationCriteria(rule)) {
    reasons.push("default");
  }

  return reasons;
}

function hasRecommendationCriteria(
  rule: LearningRecommendationRuleCriteria,
): boolean {
  return [
    rule.triggerCodes,
    rule.useCaseCodes,
    rule.contextCodes,
    rule.toolCodes,
    rule.scoreTiers,
    rule.reviewClasses,
  ].some((values) => Array.isArray(values) && values.length > 0);
}

function overlaps(left?: string[], right?: string[]): boolean {
  if (!left?.length || !right?.length) {
    return false;
  }

  const rightValues = new Set(right);
  return left.some((value) => rightValues.has(value));
}
