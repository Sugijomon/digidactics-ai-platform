import "server-only";

import { getCurrentUserContext } from "@digidactics/auth";
import {
  isLessonContent,
  isManualReviewEvidenceBlock,
  type LessonBlock,
} from "@digidactics/domain/learning";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import {
  aiLiteracyPreviewCourse,
  aiMasteryPreviewCourse,
  aiProficiencyPreviewCourse,
  getCoursePages,
  type LearningAttemptAnswerView,
  type LearningCourseView,
  type LearningPageView,
  type LearningTopicView,
} from "./learning-preview-data";
import {
  getDevContentEditorContext,
  getDevContentEditorSupabaseClient,
  isDevContentEditorBypassEnabled,
} from "./dev-content-editor-bypass";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
  hasSupabaseConfig,
} from "./supabase-server";
import { applyLocalLearningContentOverrides } from "./learning-local-content-overrides";

export interface LearningAdminCourseSummary {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  difficulty_level: string;
  status: string;
  required_for_onboarding: boolean;
  unlocks_capability: string | null;
  passing_threshold: number;
  page_count: number;
  published_page_count: number;
}

export interface LearningAdminLessonSummary {
  id: string;
  code: string;
  title: string;
  summary: string | null;
  kind: "course_page" | "microlearning";
  course_title: string | null;
  course_code: string | null;
  estimated_duration_minutes: number | null;
  status: string;
  block_count: number;
}

export interface LearningAdminOverview {
  courses: LearningAdminCourseSummary[];
  lessons: LearningAdminLessonSummary[];
  microLearnings: LearningAdminLessonSummary[];
}

export interface LearningReviewAttempt {
  id: string;
  course_id: string;
  course_code: string;
  course_title: string;
  page_id: string;
  page_code: string;
  page_title: string;
  user_id: string;
  learner_name: string;
  learner_email: string | null;
  attempt_number: number;
  status: string;
  answers: Record<string, LearningAttemptAnswerView>;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  submitted_at: string | null;
  page_review_guidance: string | null;
  page_evidence_items: string[];
  page_review_rubric: LearningReviewRubricCriterion[];
  answer_context: Record<string, LearningReviewAnswerContext>;
}

export interface LearningReviewAnswerContext {
  label: string;
  guidance: string | null;
  evidence_items: string[];
  review_rubric: LearningReviewRubricCriterion[];
}

export interface LearningReviewRubricCriterion {
  id: string;
  title: string;
  sufficient: string;
  strong?: string;
  hard_fail?: string;
}

export interface LearningContentAuditRow {
  course_code: string;
  course_title: string;
  topic_code: string;
  topic_title: string;
  topic_status: "source" | "live_extra";
  source_topic_order: number | null;
  live_topic_id: string | null;
  live_topic_order: number | null;
  live_page_id: string | null;
  page_code: string;
  page_title: string;
  source_block_count: number;
  live_block_count: number;
  desired_block_types: string[];
  live_block_types: string[];
  review_required_count: number;
  legal_review_required_count: number;
  provisional_claim_count: number;
  role_path_count: number;
  live_topic_code: string | null;
  live_topic_title: string | null;
  status:
    | "ok"
    | "missing_live_topic"
    | "missing_live_page"
    | "empty_live_page"
    | "different_blocks"
    | "extra_live_topic"
    | "extra_live_page";
}

interface CourseRow {
  id: string;
  course_code: string;
  title: string;
  subtitle?: string | null;
  description: string | null;
  difficulty_level?: string;
  status: string;
  required_for_onboarding: boolean;
  unlocks_capability: string | null;
  passing_threshold: number;
}

interface PageRow {
  id: string;
  course_id: string;
  topic_id: string;
  page_code: string;
  title: string;
  summary: string | null;
  page_type: string;
  status: string;
  estimated_duration_minutes: number | null;
  sequence_order: number;
  is_required: boolean;
  content: { blocks?: unknown[] } | null;
}

interface AdminTopicRow {
  id: string;
  topic_code: string;
  title: string;
  summary: string | null;
  sequence_order: number;
  is_required: boolean;
}

interface LessonRow {
  id: string;
  lesson_code: string;
  title: string;
  summary: string | null;
  lesson_type: string;
  status: string;
  estimated_duration_minutes: number | null;
  content: { blocks?: unknown[] } | null;
}

interface ReviewAttemptRow {
  id: string;
  course_id: string;
  page_id: string;
  user_id: string;
  attempt_number: number;
  status: string;
  answers: unknown;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  submitted_at: string | null;
}

interface ReviewPageRow {
  id: string;
  page_code: string;
  title: string;
  content: unknown;
}

interface ReviewProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
}

type LearningAdminDataClient =
  | NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>
  | NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

export async function requireContentEditor() {
  if (isDevContentEditorBypassEnabled()) {
    const supabase = getDevContentEditorSupabaseClient();

    if (supabase) {
      return {
        context: getDevContentEditorContext(),
        supabase,
      };
    }

    const fallbackSupabase = await getSupabaseServerClient();

    if (fallbackSupabase) {
      return {
        context: getDevContentEditorContext(),
        supabase: fallbackSupabase,
      };
    }
  }

  const supabase = await getSupabaseServerClient();
  const context = await getCurrentUserContext(supabase);

  if (!context) {
    redirect("/auth/login?next=/learning/admin");
  }

  if (
    context.primaryRole !== "content_editor" &&
    context.primaryRole !== "super_admin"
  ) {
    redirect("/dashboard");
  }

  return { context, supabase };
}

const getCachedLearningAdminOverview = unstable_cache(
  async () => {
    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      return previewOverview();
    }

    return getLearningAdminOverviewFromSupabase(supabase);
  },
  ["learning-admin-overview"],
  {
    revalidate: 30,
    tags: ["learning-admin"],
  },
);

export async function getLearningAdminOverview(): Promise<LearningAdminOverview> {
  if (!hasSupabaseConfig()) {
    return previewOverview();
  }

  const { supabase } = await requireContentEditor();
  const adminSupabase = getSupabaseAdminClient();

  if (adminSupabase) {
    return getCachedLearningAdminOverview();
  }

  if (!supabase) {
    return previewOverview();
  }

  return getLearningAdminOverviewFromSupabase(supabase);
}

async function getLearningAdminOverviewFromSupabase(
  supabase: LearningAdminDataClient,
): Promise<LearningAdminOverview> {
  const { data: courseRows, error: courseError } = await supabase
    .from("learning_courses")
    .select(
      "id, course_code, title, description, difficulty_level, status, required_for_onboarding, unlocks_capability, passing_threshold",
    )
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (courseError || !courseRows) {
    return previewOverview();
  }

  if (!courseRows.length && process.env.NODE_ENV !== "production") {
    return previewOverview();
  }

  const { data: pageRows } = await supabase
    .from("learning_pages")
    .select(
      "id, course_id, page_code, title, summary, status, estimated_duration_minutes, content",
    )
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const { data: microRows } = await supabase
    .from("learning_lessons")
    .select("id, lesson_code, title, summary, lesson_type, status, estimated_duration_minutes, content")
    .neq("status", "archived")
    .eq("lesson_type", "microlearning")
    .order("created_at", { ascending: false });

  const pages = (pageRows ?? []) as unknown as PageRow[];
  const courseById = new Map((courseRows as CourseRow[]).map((course) => [course.id, course]));
  const courses = (courseRows as CourseRow[]).map((course) => {
    const coursePages = pages.filter((page) => page.course_id === course.id);

    return {
      ...course,
      difficulty_level: course.difficulty_level ?? "foundation",
      page_count: coursePages.length,
      published_page_count: coursePages.filter((page) => page.status === "published").length,
    };
  });

  const lessons: LearningAdminLessonSummary[] = pages.map((page) => ({
    id: page.id,
    code: page.page_code,
    title: page.title,
    summary: page.summary,
    kind: "course_page",
    course_title: courseById.get(page.course_id)?.title ?? null,
    course_code: courseById.get(page.course_id)?.course_code ?? null,
    estimated_duration_minutes: page.estimated_duration_minutes,
    status: page.status,
    block_count: Array.isArray(page.content?.blocks) ? page.content.blocks.length : 0,
  }));

  const microLearnings: LearningAdminLessonSummary[] = ((microRows ?? []) as LessonRow[]).map(
    (lesson) => ({
      id: lesson.id,
      code: lesson.lesson_code,
      title: lesson.title,
      summary: lesson.summary,
      kind: "microlearning",
      course_title: null,
      course_code: null,
      estimated_duration_minutes: lesson.estimated_duration_minutes,
      status: lesson.status,
      block_count: Array.isArray(lesson.content?.blocks) ? lesson.content.blocks.length : 0,
    }),
  );

  return { courses, lessons, microLearnings };
}

export async function getAdminLearningPage(pageCode: string, courseCode?: string, pageId?: string): Promise<{
  course: LearningCourseView;
  page: LearningPageView | null;
}> {
  if (!hasSupabaseConfig()) {
    return previewAdminPage(pageCode);
  }

  const { supabase } = await requireContentEditor();

  if (!supabase) {
    return previewAdminPage(pageCode);
  }

  let courseId: string | null = null;

  if (courseCode) {
    const { data: course } = await supabase
      .from("learning_courses")
      .select("id")
      .eq("course_code", courseCode)
      .maybeSingle<{ id: string }>();

    courseId = course?.id ?? null;
  }

  let pageQuery = supabase
    .from("learning_pages")
    .select(
      [
        "id",
        "course_id",
        "topic_id",
        "page_code",
        "title",
        "summary",
        "page_type",
        "status",
        "estimated_duration_minutes",
        "sequence_order",
        "is_required",
        "content",
      ].join(", "),
    )
    .eq("page_code", pageCode);

  if (pageId) {
    pageQuery = pageQuery.eq("id", pageId);
  }

  if (courseId) {
    pageQuery = pageQuery.eq("course_id", courseId);
  }

  const { data: page, error: pageError } = await pageQuery
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<PageRow>();

  if (pageError || !page || !isLessonContent(page.content)) {
    return previewAdminPage(pageCode);
  }

  const [{ data: course }, { data: topic }] = await Promise.all([
    supabase
      .from("learning_courses")
      .select(
        [
          "id",
          "course_code",
          "title",
          "subtitle",
          "description",
          "difficulty_level",
          "required_for_onboarding",
          "passing_threshold",
        ].join(", "),
      )
      .eq("id", page.course_id)
      .single<CourseRow>(),
    supabase
      .from("learning_topics")
      .select("id, topic_code, title, summary, sequence_order, is_required")
      .eq("id", page.topic_id)
      .maybeSingle<AdminTopicRow>(),
  ]);

  if (!course) {
    return previewAdminPage(pageCode);
  }

  const adminPage: LearningPageView = {
    id: page.id,
    page_code: page.page_code,
    topic_id: page.topic_id,
    title: page.title,
    summary: page.summary,
    page_type: page.page_type,
    status: page.status,
    estimated_duration_minutes: page.estimated_duration_minutes,
    sequence_order: page.sequence_order,
    is_required: page.is_required,
    content: page.content,
  };
  const adminTopic: LearningTopicView = {
    id: topic?.id ?? page.topic_id,
    topic_code: topic?.topic_code ?? "page",
    title: topic?.title ?? "Pagina",
    summary: topic?.summary ?? null,
    sequence_order: topic?.sequence_order ?? 1,
    is_required: topic?.is_required ?? true,
    pages: [adminPage],
  };

  return {
    course: {
      id: course.id,
      course_code: course.course_code,
      title: course.title,
      subtitle: course.subtitle ?? null,
      description: course.description,
      difficulty_level: course.difficulty_level ?? "foundation",
      required_for_onboarding: course.required_for_onboarding,
      passing_threshold: course.passing_threshold,
      topics: [adminTopic],
      pages: [adminPage],
    },
    page: adminPage,
  };
}

export async function getAdminMicroLearning(lessonCode: string): Promise<{
  course: LearningCourseView;
  page: LearningPageView | null;
}> {
  if (!hasSupabaseConfig()) {
    return { course: microLearningEditorCourse(null), page: null };
  }

  const { supabase } = await requireContentEditor();

  if (!supabase) {
    return { course: microLearningEditorCourse(null), page: null };
  }

  const { data: lesson, error } = await supabase
    .from("learning_lessons")
    .select("id, lesson_code, title, summary, lesson_type, status, estimated_duration_minutes, content")
    .eq("lesson_code", lessonCode)
    .eq("lesson_type", "microlearning")
    .maybeSingle<LessonRow>();

  if (error || !lesson || !isLessonContent(lesson.content)) {
    return { course: microLearningEditorCourse(null), page: null };
  }

  const page: LearningPageView = {
    id: lesson.id,
    page_code: lesson.lesson_code,
    topic_id: "microlearning-library",
    title: lesson.title,
    summary: lesson.summary,
    page_type: "microlearning",
    status: lesson.status,
    estimated_duration_minutes: lesson.estimated_duration_minutes,
    sequence_order: 1,
    is_required: false,
    content: lesson.content,
  };

  return {
    course: microLearningEditorCourse(page),
    page,
  };
}

const getCachedAdminCourse = unstable_cache(
  async (courseCode: string) => {
    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      return getAdminPreviewCourse(courseCode) ?? applyLocalLearningContentOverrides(aiLiteracyPreviewCourse);
    }

    return getAdminCourseFromSupabase(courseCode, supabase);
  },
  ["admin-course"],
  {
    revalidate: 30,
    tags: ["learning-admin"],
  },
);

export async function getAdminCourse(courseCode: string): Promise<LearningCourseView> {
  if (!hasSupabaseConfig()) {
    return getAdminPreviewCourse(courseCode) ?? applyLocalLearningContentOverrides(aiLiteracyPreviewCourse);
  }

  const { supabase } = await requireContentEditor();
  const adminSupabase = getSupabaseAdminClient();

  if (adminSupabase) {
    return getCachedAdminCourse(courseCode);
  }

  if (!supabase) {
    return getAdminPreviewCourse(courseCode) ?? applyLocalLearningContentOverrides(aiLiteracyPreviewCourse);
  }

  return getAdminCourseFromSupabase(courseCode, supabase);
}

async function getAdminCourseFromSupabase(
  courseCode: string,
  supabase: LearningAdminDataClient,
): Promise<LearningCourseView> {
  const { data: course, error: courseError } = await supabase
    .from("learning_courses")
    .select(
      [
        "id",
        "course_code",
        "title",
        "subtitle",
        "description",
        "difficulty_level",
        "status",
        "required_for_onboarding",
        "unlocks_capability",
        "passing_threshold",
      ].join(", "),
    )
    .eq("course_code", courseCode)
    .maybeSingle<CourseRow>();

  if (courseError || !course) {
    return getAdminPreviewCourse(courseCode) ?? applyLocalLearningContentOverrides(aiLiteracyPreviewCourse);
  }

  const { data: topicRows, error: topicError } = await supabase
    .from("learning_topics")
    .select("id, topic_code, title, summary, sequence_order, is_required")
    .eq("course_id", course.id)
    .neq("status", "archived")
    .order("sequence_order", { ascending: true });

  if (topicError || !topicRows) {
    return getAdminPreviewCourse(courseCode) ?? applyLocalLearningContentOverrides(aiLiteracyPreviewCourse);
  }

  const topics = topicRows as AdminTopicRow[];
  const topicIds = topics.map((topic) => topic.id);
  const { data: pageRows, error: pageError } = topicIds.length
    ? await supabase
        .from("learning_pages")
        .select(
          [
            "id",
            "course_id",
            "topic_id",
            "page_code",
            "title",
            "summary",
            "page_type",
            "status",
            "estimated_duration_minutes",
            "sequence_order",
            "is_required",
            "content",
          ].join(", "),
        )
        .eq("course_id", course.id)
        .in("topic_id", topicIds)
        .neq("status", "archived")
        .order("sequence_order", { ascending: true })
    : { data: [], error: null };

  if (pageError || !pageRows) {
    return getAdminPreviewCourse(courseCode) ?? applyLocalLearningContentOverrides(aiLiteracyPreviewCourse);
  }

  const pages = (pageRows as PageRow[])
    .map((page): LearningPageView | null => {
      if (!isLessonContent(page.content)) {
        return null;
      }

      return {
        id: page.id,
        page_code: page.page_code,
        topic_id: page.topic_id,
        title: page.title,
        summary: page.summary,
        page_type: page.page_type,
        status: page.status,
        estimated_duration_minutes: page.estimated_duration_minutes,
        sequence_order: page.sequence_order,
        is_required: page.is_required,
        content: page.content,
      };
    })
    .filter((page): page is LearningPageView => Boolean(page));

  const pagesByTopicId = new Map<string, LearningPageView[]>();
  for (const page of pages) {
    const topicPages = pagesByTopicId.get(page.topic_id) ?? [];
    topicPages.push(page);
    pagesByTopicId.set(page.topic_id, topicPages);
  }

  return {
    id: course.id,
    course_code: course.course_code,
    title: course.title,
    subtitle: course.subtitle ?? null,
    description: course.description,
    difficulty_level: course.difficulty_level ?? "foundation",
    required_for_onboarding: course.required_for_onboarding,
    passing_threshold: course.passing_threshold,
    pages,
    topics: topics.map((topic) => ({
      id: topic.id,
      topic_code: topic.topic_code,
      title: topic.title,
      summary: topic.summary,
      sequence_order: topic.sequence_order,
      is_required: topic.is_required,
      pages: pagesByTopicId.get(topic.id) ?? [],
    })),
  };
}

export async function getLearningReviewQueue(): Promise<LearningReviewAttempt[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  const { supabase } = await requireContentEditor();

  if (!supabase) {
    return [];
  }

  const { data: attemptRows, error: attemptError } = await supabase
    .from("learning_page_attempts")
    .select(
      "id, course_id, page_id, user_id, attempt_number, status, answers, score, max_score, percentage, submitted_at",
    )
    .eq("manual_review_required", true)
    .order("submitted_at", { ascending: true });

  if (attemptError || !attemptRows?.length) {
    return [];
  }

  const attempts = attemptRows as ReviewAttemptRow[];
  const courseIds = Array.from(new Set(attempts.map((attempt) => attempt.course_id)));
  const pageIds = Array.from(new Set(attempts.map((attempt) => attempt.page_id)));
  const userIds = Array.from(new Set(attempts.map((attempt) => attempt.user_id)));

  const [{ data: courseRows }, { data: pageRows }, { data: profileRows }] = await Promise.all([
    supabase
      .from("learning_courses")
      .select("id, course_code, title")
      .in("id", courseIds),
    supabase
      .from("learning_pages")
      .select("id, page_code, title, content")
      .in("id", pageIds),
    supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds),
  ]);

  const courseById = new Map(
    ((courseRows ?? []) as Array<{ id: string; course_code: string; title: string }>).map(
      (course) => [course.id, course],
    ),
  );
  const pageById = new Map(
    ((pageRows ?? []) as ReviewPageRow[]).map((page) => [page.id, page]),
  );
  const profileById = new Map(
    ((profileRows ?? []) as ReviewProfileRow[]).map((profile) => [profile.id, profile]),
  );

  return attempts.map((attempt) => {
    const course = courseById.get(attempt.course_id);
    const page = pageById.get(attempt.page_id);
    const profile = profileById.get(attempt.user_id);
    const pageContent = isLessonContent(page?.content) ? page.content : null;
    const reviewContext = pageContent ? buildReviewContext(pageContent.blocks) : emptyReviewContext();

    return {
      id: attempt.id,
      course_id: attempt.course_id,
      course_code: course?.course_code ?? "ai-literacy-foundation",
      course_title: course?.title ?? "Onbekende cursus",
      page_id: attempt.page_id,
      page_code: page?.page_code ?? "",
      page_title: page?.title ?? "Onbekende pagina",
      user_id: attempt.user_id,
      learner_name: profile?.full_name ?? profile?.email ?? "Onbekende learner",
      learner_email: profile?.email ?? null,
      attempt_number: attempt.attempt_number,
      status: attempt.status,
      answers: normalizeAttemptAnswers(attempt.answers),
      score: attempt.score,
      max_score: attempt.max_score,
      percentage: attempt.percentage,
      submitted_at: attempt.submitted_at,
      page_review_guidance: reviewContext.pageGuidance,
      page_evidence_items: reviewContext.pageEvidenceItems,
      page_review_rubric: reviewContext.pageRubric,
      answer_context: reviewContext.answerContext,
    };
  });
}

function emptyReviewContext() {
  return {
    pageGuidance: null,
    pageEvidenceItems: [] as string[],
    pageRubric: [] as LearningReviewRubricCriterion[],
    answerContext: {} as Record<string, LearningReviewAnswerContext>,
  };
}

function buildReviewContext(blocks: LessonBlock[]) {
  const answerContext: Record<string, LearningReviewAnswerContext> = {};
  const pageEvidenceItems: string[] = [];
  const pageRubric: LearningReviewRubricCriterion[] = [];
  const guidance: string[] = [];

  for (const block of blocks) {
    const blockEvidence = normalizeStringList(block.evidence_items);
    const blockRubric = normalizeReviewRubric(block.review_rubric);
    const blockGuidance = normalizeOptionalString(block.reviewer_guidance);

    if (blockEvidence.length) pageEvidenceItems.push(...blockEvidence);
    if (blockRubric.length) pageRubric.push(...blockRubric);
    if (blockGuidance) guidance.push(blockGuidance);

    if (isReviewableBlock(block)) {
      answerContext[block.id] = {
        label: getReviewBlockLabel(block),
        guidance: blockGuidance,
        evidence_items: blockEvidence,
        review_rubric: blockRubric,
      };
    }
  }

  return {
    pageGuidance: guidance[0] ?? null,
    pageEvidenceItems: uniqueStrings(pageEvidenceItems),
    pageRubric: uniqueRubric(pageRubric),
    answerContext,
  };
}

function isReviewableBlock(block: LessonBlock) {
  return isManualReviewEvidenceBlock(block);
}

function getReviewBlockLabel(block: LessonBlock) {
  if (block.type === "case_lab") {
    return block.title || "Praktijkcase";
  }

  if (block.type === "scenario") {
    return block.question;
  }

  if (block.type === "reflection") {
    return block.prompt;
  }

  if (block.type === "quiz_essay" || block.type === "short_answer") {
    return block.question;
  }

  return block.id;
}

function normalizeStringList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeReviewRubric(value: unknown): LearningReviewRubricCriterion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): LearningReviewRubricCriterion | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Partial<LearningReviewRubricCriterion>;
      const id = normalizeOptionalString(candidate.id);
      const title = normalizeOptionalString(candidate.title);
      const sufficient = normalizeOptionalString(candidate.sufficient);

      if (!id || !title || !sufficient) {
        return null;
      }

      return {
        id,
        title,
        sufficient,
        strong: normalizeOptionalString(candidate.strong) ?? undefined,
        hard_fail: normalizeOptionalString(candidate.hard_fail) ?? undefined,
      };
    })
    .filter((item): item is LearningReviewRubricCriterion => Boolean(item));
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function uniqueRubric(values: LearningReviewRubricCriterion[]) {
  const seen = new Set<string>();
  return values.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

export async function getLearningContentAudit(): Promise<LearningContentAuditRow[]> {
  const sourceCourses = [aiLiteracyPreviewCourse, aiProficiencyPreviewCourse, aiMasteryPreviewCourse];
  const sourceTopicKeys = new Set(
    sourceCourses.flatMap((course) =>
      course.topics.map((topic) => `${course.course_code}:${topic.topic_code}`),
    ),
  );
  const sourcePageKeys = new Set(
    sourceCourses.flatMap((course) =>
      course.topics.flatMap((topic) =>
        topic.pages.map((page) => `${course.course_code}:${page.page_code}`),
      ),
    ),
  );
  const desiredRows: LearningContentAuditRow[] = sourceCourses.flatMap((course) =>
    course.topics.flatMap((topic) =>
      topic.pages.map((page) => ({
        course_code: course.course_code,
        course_title: course.title,
        topic_code: topic.topic_code,
        topic_title: topic.title,
        topic_status: "source" as const,
        source_topic_order: topic.sequence_order,
        live_topic_id: null,
        live_topic_order: null,
        live_page_id: null,
        page_code: page.page_code,
        page_title: page.title,
        source_block_count: page.content.blocks.length,
        live_block_count: 0,
        desired_block_types: page.content.blocks.map((block) => block.type),
        live_block_types: [],
        review_required_count: page.content.blocks.filter((block) => block.review_required).length,
        legal_review_required_count: page.content.blocks.filter((block) => block.legal_review_required).length,
        provisional_claim_count: page.content.blocks.filter((block) => block.provisional).length,
        role_path_count: page.content.blocks.filter((block) => (block.role_path_ids ?? []).length > 0).length,
        live_topic_code: null,
        live_topic_title: null,
        status: "missing_live_page" as const,
      })),
    ),
  );

  if (!hasSupabaseConfig()) {
    return desiredRows.map((row) => ({
      ...row,
      live_block_types: row.desired_block_types,
      live_topic_code: row.topic_code,
      live_topic_title: row.topic_title,
      status: "ok",
    }));
  }

  const { supabase } = await requireContentEditor();

  if (!supabase) {
    return desiredRows.map((row) => ({
      ...row,
      live_block_types: [],
      status: "missing_live_page",
    }));
  }

  const { data: courseRows } = await supabase
    .from("learning_courses")
    .select("id, course_code")
    .in("course_code", sourceCourses.map((course) => course.course_code));

  if (!courseRows?.length) {
    return desiredRows.map((row) => ({
      ...row,
      live_block_types: [],
      status: "missing_live_page",
    }));
  }

  const courseById = new Map(
    (courseRows as Array<{ id: string; course_code: string }>).map((course) => [
      course.id,
      course.course_code,
    ]),
  );

  const { data: topicRows } = await supabase
    .from("learning_topics")
    .select("id, course_id, topic_code, title, sequence_order, status")
    .in("course_id", Array.from(courseById.keys()))
    .neq("status", "archived");

  const liveTopics = (topicRows ?? []) as Array<{
    id: string;
    course_id: string;
    topic_code: string;
    title: string;
    sequence_order: number;
    status: string;
  }>;
  const liveTopicById = new Map(liveTopics.map((topic) => [topic.id, topic]));
  const liveTopicByKey = new Map(
    liveTopics.map((topic) => [
      `${courseById.get(topic.course_id) ?? ""}:${topic.topic_code}`,
      topic,
    ]),
  );

  const { data: pageRows } = await supabase
    .from("learning_pages")
    .select("id, course_id, topic_id, page_code, title, sequence_order, content")
    .in("course_id", Array.from(courseById.keys()))
    .neq("status", "archived");

  const livePageByKey = new Map(
    ((pageRows ?? []) as Array<{
      id: string;
      course_id: string;
      topic_id: string;
      page_code: string;
      title: string;
      sequence_order: number;
      content: { blocks?: Array<{ type?: string }> } | null;
    }>).map(
      (page) => [
        `${courseById.get(page.course_id) ?? ""}:${page.page_code}`,
        {
          ...page,
          blockTypes: Array.isArray(page.content?.blocks)
            ? page.content.blocks.map((block) => String(block.type ?? "unknown"))
            : [],
        },
      ],
    ),
  );

  const sourceAuditRows = desiredRows.map((row): LearningContentAuditRow => {
    const liveTopic = liveTopicByKey.get(`${row.course_code}:${row.topic_code}`);
    const livePage = livePageByKey.get(`${row.course_code}:${row.page_code}`);
    const liveTopicForPage = livePage ? liveTopicById.get(livePage.topic_id) : liveTopic;
    const liveBlockTypes = livePage?.blockTypes;
    let status: LearningContentAuditRow["status"] = "ok";

    if (!liveTopic) {
      status = "missing_live_topic";
    } else if (!livePage) {
      status = "missing_live_page";
    } else if (!liveBlockTypes?.length && row.desired_block_types.length > 0) {
      status = "empty_live_page";
    } else if (!sameStringArray(liveBlockTypes ?? [], row.desired_block_types)) {
      status = "different_blocks";
    }

    return {
      ...row,
      live_block_types: liveBlockTypes ?? [],
      live_topic_id: liveTopicForPage?.id ?? null,
      live_topic_order: liveTopicForPage?.sequence_order ?? null,
      live_page_id: livePage?.id ?? null,
      live_block_count: liveBlockTypes?.length ?? 0,
      live_topic_code: liveTopicForPage?.topic_code ?? null,
      live_topic_title: liveTopicForPage?.title ?? null,
      status,
    };
  });

  const extraTopicRows: LearningContentAuditRow[] = liveTopics
    .filter((topic) => !sourceTopicKeys.has(`${courseById.get(topic.course_id) ?? ""}:${topic.topic_code}`))
    .map((topic) => ({
      course_code: courseById.get(topic.course_id) ?? "",
      course_title:
        sourceCourses.find((course) => course.course_code === courseById.get(topic.course_id))?.title ??
        "Onbekende cursus",
      topic_code: topic.topic_code,
      topic_title: topic.title,
      topic_status: "live_extra",
      source_topic_order: null,
      live_topic_id: topic.id,
      live_topic_order: topic.sequence_order,
      live_page_id: null,
      page_code: "",
      page_title: "Extra live topic zonder bronmatch",
      source_block_count: 0,
      live_block_count: 0,
      desired_block_types: [],
      live_block_types: [],
      review_required_count: 0,
      legal_review_required_count: 0,
      provisional_claim_count: 0,
      role_path_count: 0,
      live_topic_code: topic.topic_code,
      live_topic_title: topic.title,
      status: "extra_live_topic",
    }));

  const extraPageRows: LearningContentAuditRow[] = Array.from(livePageByKey.entries())
    .filter(([key]) => !sourcePageKeys.has(key))
    .map(([key, page]) => {
      const [courseCode] = key.split(":");
      const topic = liveTopicById.get(page.topic_id);
      return {
        course_code: courseCode,
        course_title:
          sourceCourses.find((course) => course.course_code === courseCode)?.title ??
          "Onbekende cursus",
        topic_code: topic?.topic_code ?? "",
        topic_title: topic?.title ?? "Onbekend live topic",
        topic_status: "live_extra",
        source_topic_order: null,
        live_topic_id: topic?.id ?? null,
        live_topic_order: topic?.sequence_order ?? null,
        live_page_id: page.id,
        page_code: page.page_code,
        page_title: page.title,
        source_block_count: 0,
        live_block_count: page.blockTypes.length,
        desired_block_types: [],
        live_block_types: page.blockTypes,
        review_required_count: 0,
        legal_review_required_count: 0,
        provisional_claim_count: 0,
        role_path_count: 0,
        live_topic_code: topic?.topic_code ?? null,
        live_topic_title: topic?.title ?? null,
        status: "extra_live_page",
      };
    });

  return [...sourceAuditRows, ...extraTopicRows, ...extraPageRows];
}

function getAdminPreviewCourse(courseCode: string): LearningCourseView | null {
  if (courseCode === aiLiteracyPreviewCourse.course_code) {
    return applyLocalLearningContentOverrides(aiLiteracyPreviewCourse);
  }

  if (courseCode === aiProficiencyPreviewCourse.course_code) {
    return applyLocalLearningContentOverrides(aiProficiencyPreviewCourse);
  }

  if (courseCode === aiMasteryPreviewCourse.course_code) {
    return applyLocalLearningContentOverrides(aiMasteryPreviewCourse);
  }

  return null;
}

function previewOverview(): LearningAdminOverview {
  const previewCourses = [
    applyLocalLearningContentOverrides(aiLiteracyPreviewCourse),
    applyLocalLearningContentOverrides(aiProficiencyPreviewCourse),
    applyLocalLearningContentOverrides(aiMasteryPreviewCourse),
  ];

  return {
    courses: previewCourses.map((course) => ({
      id: course.id,
      course_code: course.course_code,
      title: course.title,
      description: course.description,
      difficulty_level: course.difficulty_level,
      status: "published",
      required_for_onboarding: course.required_for_onboarding,
      unlocks_capability:
        course.course_code === aiLiteracyPreviewCourse.course_code
          ? "routeai_usecase_check"
          : "ai_proficiency",
      passing_threshold: course.passing_threshold,
      page_count: course.pages.length,
      published_page_count: course.pages.length,
    })),
    lessons: previewCourses.flatMap((course) =>
      course.pages.map((page) => ({
        id: page.id,
        code: page.page_code,
        title: page.title,
        summary: page.summary,
        kind: "course_page",
        course_title: course.title,
        course_code: course.course_code,
        estimated_duration_minutes: page.estimated_duration_minutes,
        status: "published",
        block_count: page.content.blocks.length,
      })),
    ),
    microLearnings: [],
  };
}

function previewAdminPage(pageCode: string): {
  course: LearningCourseView;
  page: LearningPageView | null;
} {
  const course =
    [
      applyLocalLearningContentOverrides(aiLiteracyPreviewCourse),
      applyLocalLearningContentOverrides(aiProficiencyPreviewCourse),
      applyLocalLearningContentOverrides(aiMasteryPreviewCourse),
    ].find((item) => getCoursePages(item).some((page) => page.page_code === pageCode)) ??
    applyLocalLearningContentOverrides(aiLiteracyPreviewCourse);
  const page = getCoursePages(course).find((item) => item.page_code === pageCode) ?? null;
  const topic =
    course.topics.find((item) =>
      item.pages.some((topicPage) => topicPage.page_code === pageCode),
    ) ?? null;

  if (!page) {
    return { course, page: null };
  }

  return {
    course: {
      ...course,
      topics: topic ? [{ ...topic, pages: [page] }] : [],
      pages: [page],
    },
    page,
  };
}

function microLearningEditorCourse(page: LearningPageView | null): LearningCourseView {
  const pages = page ? [page] : [];

  return {
    id: "microlearning-library",
    course_code: "microlearning-library",
    title: "Micro-learning library",
    subtitle: null,
    description: "Standalone micro-learnings voor RouteAI.",
    difficulty_level: "foundation",
    required_for_onboarding: false,
    passing_threshold: 80,
    pages,
    topics: [
      {
        id: "microlearning-library",
        topic_code: "microlearning-library",
        title: "Micro-learning library",
        summary: "Standalone modules",
        sequence_order: 1,
        is_required: false,
        pages,
      },
    ],
  };
}

function normalizeAttemptAnswers(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, LearningAttemptAnswerView>>(
    (acc, [blockId, answer]) => {
      if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
        return acc;
      }

      const candidate = answer as Partial<LearningAttemptAnswerView>;
      if (
        typeof candidate.block_type === "string" &&
        (typeof candidate.value === "string" ||
          (Array.isArray(candidate.value) &&
            candidate.value.every((item) => typeof item === "string")))
      ) {
        acc[blockId] = {
          block_type: candidate.block_type,
          value: candidate.value,
        };
      }

      return acc;
    },
    {},
  );
}

function sameStringArray(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
