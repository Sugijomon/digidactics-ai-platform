export type LearningStatus = "draft" | "published" | "archived";

export type LearningDifficulty = "foundation" | "intermediate" | "advanced";

export type LessonType = "lesson" | "microlearning" | "assessment" | "case_lab";

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
  | ParagraphBlock
  | CalloutBlock
  | KeyTakeawaysBlock
  | ChecklistBlock
  | CaseLabBlock
  | QuizMultipleChoiceBlock
  | QuizMultipleSelectBlock
  | QuizTrueFalseBlock
  | QuizEssayBlock
  | VideoBlock
  | DownloadBlock;

export interface LessonContent {
  version: number;
  blocks: LessonBlock[];
}

export interface BaseBlock {
  id: string;
  type: string;
}

export interface HeroBlock extends BaseBlock {
  type: "hero";
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

export interface KeyTakeawaysBlock extends BaseBlock {
  type: "key_takeaways";
  items: string[];
}

export interface ChecklistBlock extends BaseBlock {
  type: "checklist";
  items: string[];
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

export interface VideoBlock extends BaseBlock {
  type: "video";
  title?: string;
  url: string;
  transcript_markdown?: string;
}

export interface DownloadBlock extends BaseBlock {
  type: "download";
  title: string;
  storage_path: string;
  description?: string;
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

  return typeof block.id === "string" && typeof block.type === "string";
}

export function getQuizBlockIds(content: LessonContent): string[] {
  return content.blocks
    .filter((block) => block.type.startsWith("quiz_"))
    .map((block) => block.id);
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
