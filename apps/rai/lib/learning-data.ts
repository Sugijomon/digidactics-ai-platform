import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserContext } from "@digidactics/auth";
import { isLessonContent } from "@digidactics/domain/learning";
import {
  aiLiteracyPreviewCourse,
  aiMasteryPreviewCourse,
  aiProficiencyPreviewCourse,
  getLegacyAiLiteracyPageCode,
  getCoursePages,
  normalizeAiLiteracyPageCode,
  type LearnerStateView,
  type LearningAccessCheckView,
  type LearningAttemptAnswerView,
  type LearningAttemptView,
  type LearningCourseView,
  type LearningEnrollmentView,
  type LearningLessonView,
  type LearningPageView,
  type LearningProgressView,
  type LearningTopicView,
} from "./learning-preview-data";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
  hasSupabaseConfig,
} from "./supabase-server";
import { isDevContentEditorBypassEnabled } from "./dev-content-editor-bypass";

interface CourseRow {
  id: string;
  course_code: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  difficulty_level: string;
  status?: string;
  required_for_onboarding: boolean;
  passing_threshold: number;
}

interface CourseLessonRow {
  lesson_id: string;
  sequence_order: number;
  is_required: boolean;
}

interface TopicRow {
  id: string;
  topic_code: string;
  title: string;
  summary: string | null;
  sequence_order: number;
  is_required: boolean;
}

interface PageRow {
  id: string;
  page_code: string;
  topic_id: string;
  title: string;
  summary: string | null;
  page_type: string;
  estimated_duration_minutes: number | null;
  sequence_order: number;
  is_required: boolean;
  content: unknown;
}

interface LessonRow {
  id: string;
  lesson_code: string;
  title: string;
  summary: string | null;
  lesson_type: string;
  status?: string;
  estimated_duration_minutes: number | null;
  content: unknown;
}

interface CatalogPageCountRow {
  course_id: string;
}

interface CatalogTopicCountRow {
  course_id: string;
}

interface CatalogEnrollmentRow {
  course_id: string;
  status: string;
}

interface CatalogLessonProgressRow {
  lesson_id: string;
  status: string;
}

export interface PublishedCourseCatalogItem {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  difficulty_level: string;
  level: string;
  cover_image_url: string | null;
  required_for_onboarding: boolean;
  page_count: number;
  topic_count: number;
  estimated_duration_minutes: number;
  completed_page_count: number;
  progress_percentage: number;
  learner_status: "not_started" | "in_progress" | "completed";
}

export interface PublishedMicroLearningCatalogItem {
  id: string;
  lesson_code: string;
  title: string;
  summary: string | null;
  estimated_duration_minutes: number | null;
  learner_status: "not_started" | "in_progress" | "completed";
}

interface AttemptRow {
  page_id: string;
  status: "started" | "submitted" | "graded";
  attempt_number: number;
  answers: unknown;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  passed: boolean | null;
  manual_review_required: boolean;
  submitted_at: string | null;
}

export async function getAiLiteracyCourse(courseCode = "ai-literacy-foundation"): Promise<LearningCourseView> {
  noStore();
  const previewCourse = getPreviewCourse(courseCode);

  if (!hasSupabaseConfig()) {
    if (previewCourse) {
      return previewCourse;
    }

    throw new Error("Learning course could not be loaded.");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    if (previewCourse) {
      return previewCourse;
    }

    throw new Error("Learning course could not be loaded.");
  }

  const canPreviewDrafts = await canPreviewDraftLearningContent(supabase);
  const learningDataClient =
    canPreviewDrafts && isDevContentEditorBypassEnabled()
      ? getSupabaseAdminClient() ?? supabase
      : supabase;

  let courseQuery = learningDataClient
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
    .eq("course_code", courseCode);

  courseQuery = canPreviewDrafts
    ? courseQuery.neq("status", "archived")
    : courseQuery.eq("status", "published");

  const { data: course, error: courseError } =
    await courseQuery.maybeSingle<CourseRow>();

  if (courseError || !course) {
    if (previewCourse && process.env.NODE_ENV !== "production") {
      return previewCourse;
    }

    throw new Error("Learning course could not be loaded.");
  }

  let topicsQuery = learningDataClient
    .from("learning_topics")
    .select("id, topic_code, title, summary, sequence_order, is_required")
    .eq("course_id", course.id)
    .order("sequence_order", { ascending: true });

  topicsQuery = canPreviewDrafts
    ? topicsQuery.neq("status", "archived")
    : topicsQuery.eq("status", "published");

  const { data: courseLessonRows, error: courseLessonsError } = await topicsQuery;

  if (!courseLessonsError && courseLessonRows?.length) {
    const topics = courseLessonRows as TopicRow[];
    const topicIds = topics.map((topic) => topic.id);
    let pagesQuery = learningDataClient
      .from("learning_pages")
      .select(
        [
          "id",
          "page_code",
          "topic_id",
          "title",
          "summary",
          "page_type",
          "estimated_duration_minutes",
          "sequence_order",
          "is_required",
          "content",
        ].join(", "),
      )
      .eq("course_id", course.id)
      .in("topic_id", topicIds)
      .order("sequence_order", { ascending: true });

    pagesQuery = canPreviewDrafts
      ? pagesQuery.neq("status", "archived")
      : pagesQuery.eq("status", "published");

    const { data: pageRows, error: pagesError } = await pagesQuery;

    if (pagesError || !pageRows) {
      if (previewCourse && process.env.NODE_ENV !== "production") {
        return previewCourse;
      }

      throw new Error("Learning pages could not be loaded.");
    }

    return mergePreviewCourseContent({
      ...course,
      ...mapTopicPageRows(topics, pageRows as unknown as PageRow[]),
    });
  }

  const { data: legacyCourseLessonRows, error: legacyCourseLessonsError } =
    await learningDataClient
    .from("learning_course_lessons")
    .select("lesson_id, sequence_order, is_required")
    .eq("course_id", course.id)
    .order("sequence_order", { ascending: true });

  if (legacyCourseLessonsError || !legacyCourseLessonRows) {
    if (previewCourse && process.env.NODE_ENV !== "production") {
      return previewCourse;
    }

    throw new Error("Learning lessons could not be loaded.");
  }

  const lessonIds = (legacyCourseLessonRows as CourseLessonRow[]).map(
    (row) => row.lesson_id,
  );

  const { data: lessonRows, error: lessonError } = lessonIds.length
    ? await learningDataClient
        .from("learning_lessons")
        .select(
          [
            "id",
            "lesson_code",
            "title",
            "summary",
            "lesson_type",
            "estimated_duration_minutes",
            "content",
          ].join(", "),
        )
        .in("id", lessonIds)
    : { data: [], error: null };

  if (lessonError || !lessonRows) {
    if (previewCourse && process.env.NODE_ENV !== "production") {
      return previewCourse;
    }

    throw new Error("Learning lesson content could not be loaded.");
  }

  return mergePreviewCourseContent({
    ...course,
    ...mapLegacyLessonRows(
      legacyCourseLessonRows as CourseLessonRow[],
      lessonRows as LessonRow[],
    ),
  });
}

function getPreviewCourse(courseCode: string) {
  if (courseCode === aiLiteracyPreviewCourse.course_code) {
    return aiLiteracyPreviewCourse;
  }

  if (courseCode === aiProficiencyPreviewCourse.course_code) {
    return aiProficiencyPreviewCourse;
  }

  if (courseCode === aiMasteryPreviewCourse.course_code) {
    return aiMasteryPreviewCourse;
  }

  return null;
}

async function canPreviewDraftLearningContent(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
) {
  if (isDevContentEditorBypassEnabled() && getSupabaseAdminClient()) {
    return true;
  }

  const context = await getCurrentUserContext(supabase);

  return (
    context?.primaryRole === "content_editor" ||
    context?.primaryRole === "super_admin"
  );
}

function getPreviewPublishedCourses(): PublishedCourseCatalogItem[] {
  return [aiProficiencyPreviewCourse, aiMasteryPreviewCourse, aiLiteracyPreviewCourse].map((course) => {
    const pages = getCoursePages(course);

    return {
      id: course.id,
      course_code: course.course_code,
      title: course.title,
      description: course.description,
      difficulty_level: course.difficulty_level,
      level: normalizeCourseLevel(course.difficulty_level),
      cover_image_url: null,
      required_for_onboarding: course.required_for_onboarding,
      page_count: pages.length,
      topic_count: course.topics.length,
      estimated_duration_minutes: sumCourseMinutes(pages),
      completed_page_count: 0,
      progress_percentage: 0,
      learner_status: "not_started",
    };
  });
}

function mergePreviewCourseContent(course: LearningCourseView): LearningCourseView {
  return course;
}

export async function getPublishedCourses(): Promise<PublishedCourseCatalogItem[]> {
  noStore();

  if (!hasSupabaseConfig()) {
    return getPreviewPublishedCourses();
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return process.env.NODE_ENV !== "production" ? getPreviewPublishedCourses() : [];
  }

  const { data: courseRows, error: courseError } = await supabase
    .from("learning_courses")
    .select(
      "id, course_code, title, description, difficulty_level, required_for_onboarding, passing_threshold",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (courseError || !courseRows?.length) {
    return process.env.NODE_ENV !== "production" ? getPreviewPublishedCourses() : [];
  }

  const courses = courseRows as CourseRow[];
  const courseIds = courses.map((course) => course.id);

  const [{ data: pageRows }, { data: topicRows }, { data: authResult }] = await Promise.all([
    supabase
      .from("learning_pages")
      .select("course_id, estimated_duration_minutes")
      .in("course_id", courseIds)
      .eq("status", "published"),
    supabase
      .from("learning_topics")
      .select("course_id")
      .in("course_id", courseIds)
      .eq("status", "published"),
    supabase.auth.getUser(),
  ]);

  const userId = authResult.user?.id ?? null;
  const { data: enrollmentRows } =
    userId && courseIds.length
      ? await supabase
          .from("learning_course_enrollments")
          .select("course_id, status")
          .eq("user_id", userId)
          .in("course_id", courseIds)
      : { data: [] };
  const { data: completedPageRows } =
    userId && courseIds.length
      ? await supabase
          .from("learning_page_progress")
          .select("course_id, page_id")
          .eq("user_id", userId)
          .eq("status", "completed")
          .in("course_id", courseIds)
      : { data: [] };

  const pageCountByCourse = countByCourseId((pageRows ?? []) as CatalogPageCountRow[]);
  const topicCountByCourse = countByCourseId((topicRows ?? []) as CatalogTopicCountRow[]);
  const minutesByCourse = sumMinutesByCourseId(
    (pageRows ?? []) as Array<{ course_id: string; estimated_duration_minutes: number | null }>,
  );
  const completedCountByCourse = countByCourseId((completedPageRows ?? []) as CatalogPageCountRow[]);
  const enrollmentByCourse = new Map(
    ((enrollmentRows ?? []) as CatalogEnrollmentRow[]).map((row) => [row.course_id, row.status]),
  );

  return courses.map((course) => {
    const pageCount = pageCountByCourse.get(course.id) ?? 0;
    const completedPageCount = completedCountByCourse.get(course.id) ?? 0;
    const progressPercentage =
      pageCount > 0 ? Math.round((completedPageCount / pageCount) * 100) : 0;

    return {
      id: course.id,
      course_code: course.course_code,
      title: course.title,
      description: course.description,
      difficulty_level: course.difficulty_level,
      level: normalizeCourseLevel(course.difficulty_level),
      cover_image_url: null,
      required_for_onboarding: course.required_for_onboarding,
      page_count: pageCount,
      topic_count: topicCountByCourse.get(course.id) ?? 0,
      estimated_duration_minutes: minutesByCourse.get(course.id) ?? 0,
      completed_page_count: completedPageCount,
      progress_percentage: progressPercentage,
      learner_status: progressPercentage >= 100 ? "completed" : mapCatalogStatus(enrollmentByCourse.get(course.id)),
    };
  });
}

export async function getUserCourseProgress(userId?: string | null): Promise<Record<string, number>> {
  noStore();

  if (!userId || !hasSupabaseConfig()) {
    return {};
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return {};
  }

  const { data } = await supabase
    .from("learning_course_enrollments")
    .select("course_id, progress_percentage")
    .eq("user_id", userId);

  return ((data ?? []) as Array<{ course_id: string; progress_percentage: number | null }>).reduce<
    Record<string, number>
  >((acc, row) => {
    acc[row.course_id] = row.progress_percentage ?? 0;
    return acc;
  }, {});
}

export async function getPublishedMicroLearnings(): Promise<PublishedMicroLearningCatalogItem[]> {
  noStore();

  if (!hasSupabaseConfig()) {
    return [];
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const { data: lessonRows, error: lessonError } = await supabase
    .from("learning_lessons")
    .select("id, lesson_code, title, summary, lesson_type, estimated_duration_minutes, content")
    .eq("lesson_type", "microlearning")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (lessonError || !lessonRows?.length) {
    return [];
  }

  const lessons = lessonRows as LessonRow[];
  const lessonIds = lessons.map((lesson) => lesson.id);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: progressRows } =
    user && lessonIds.length
      ? await supabase
          .from("learning_lesson_progress")
          .select("lesson_id, status")
          .eq("user_id", user.id)
          .in("lesson_id", lessonIds)
      : { data: [] };
  const progressByLesson = new Map(
    ((progressRows ?? []) as CatalogLessonProgressRow[]).map((row) => [row.lesson_id, row.status]),
  );

  return lessons.map((lesson) => ({
    id: lesson.id,
    lesson_code: lesson.lesson_code,
    title: lesson.title,
    summary: lesson.summary,
    estimated_duration_minutes: lesson.estimated_duration_minutes,
    learner_status: mapCatalogStatus(progressByLesson.get(lesson.id)),
  }));
}

export async function getPublishedMicroLearningPage(
  lessonCode: string,
): Promise<LearningPageView | null> {
  noStore();

  if (!hasSupabaseConfig()) {
    return null;
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data: lesson, error } = await supabase
    .from("learning_lessons")
    .select("id, lesson_code, title, summary, lesson_type, status, estimated_duration_minutes, content")
    .eq("lesson_code", lessonCode)
    .eq("lesson_type", "microlearning")
    .eq("status", "published")
    .maybeSingle<LessonRow>();

  if (error || !lesson || !isLessonContent(lesson.content)) {
    return null;
  }

  return {
    id: lesson.id,
    page_code: lesson.lesson_code,
    topic_id: "microlearning-library",
    title: lesson.title,
    summary: lesson.summary,
    page_type: "microlearning",
    estimated_duration_minutes: lesson.estimated_duration_minutes,
    sequence_order: 1,
    is_required: false,
    content: lesson.content,
  };
}

export async function getAiLiteracyPage(
  pageCode: string,
  courseCode = "ai-literacy-foundation",
): Promise<{ course: LearningCourseView; page: LearningPageView | null }> {
  const course = await getAiLiteracyCourse(courseCode);
  const normalizedPageCode = normalizeAiLiteracyPageCode(pageCode);
  const legacyPageCode = getLegacyAiLiteracyPageCode(normalizedPageCode);
  const page =
    getCoursePages(course).find(
      (item) => item.page_code === normalizedPageCode || item.page_code === legacyPageCode,
    ) ?? null;

  return { course, page };
}

export async function getAiLiteracyLesson(
  lessonCode: string,
  courseCode = "ai-literacy-foundation",
): Promise<{ course: LearningCourseView; lesson: LearningLessonView | null }> {
  const { course, page } = await getAiLiteracyPage(lessonCode, courseCode);

  return {
    course,
    lesson: page
      ? {
          id: page.id,
          lesson_code: page.page_code,
          title: page.title,
          summary: page.summary,
          lesson_type: page.page_type,
          estimated_duration_minutes: page.estimated_duration_minutes,
          sequence_order: page.sequence_order,
          is_required: page.is_required,
          content: page.content,
        }
      : null,
  };
}

export async function getLearnerState(
  course: LearningCourseView,
): Promise<LearnerStateView> {
  noStore();

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return emptyLearnerState(false);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return emptyLearnerState(false);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single<{ org_id: string | null }>();

  const { data: enrollment } = await supabase
    .from("learning_course_enrollments")
    .select("id, status, progress_percentage, started_at, completed_at")
    .eq("course_id", course.id)
    .eq("user_id", user.id)
    .maybeSingle<LearningEnrollmentView>();

  const pages = getCoursePages(course);
  const pageIds = pages.map((page) => page.id);

  const { data: pageProgressRows } = pageIds.length
    ? await supabase
        .from("learning_page_progress")
        .select(
          "page_id, status, progress_percentage, completed_block_ids, completed_at",
        )
        .eq("course_id", course.id)
        .eq("user_id", user.id)
        .in("page_id", pageIds)
    : { data: [] };

  const attemptsByPageId = await getLatestPageAttempts(supabase, course.id, user.id, pageIds);
  const accessCheck = await getLearningAccessCheck(supabase);

  if (pageProgressRows) {
    return {
      isAuthenticated: true,
      orgId: profile?.org_id ?? null,
      enrollment: enrollment ?? null,
      accessCheck,
      progressByLessonId: {},
      progressByPageId: mapProgressRows(pageProgressRows ?? [], "page_id"),
      attemptsByPageId,
    };
  }

  const { data: progressRows } = pageIds.length
    ? await supabase
        .from("learning_lesson_progress")
        .select(
          "lesson_id, status, progress_percentage, completed_block_ids, completed_at",
        )
        .eq("course_id", course.id)
        .eq("user_id", user.id)
        .in("lesson_id", pageIds)
    : { data: [] };

  return {
    isAuthenticated: true,
    orgId: profile?.org_id ?? null,
    enrollment: enrollment ?? null,
    accessCheck,
    progressByLessonId: mapProgressRows(progressRows ?? [], "lesson_id"),
    progressByPageId: {},
    attemptsByPageId,
  };
}

async function getLearningAccessCheck(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
): Promise<LearningAccessCheckView | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("learning_check_capability_access", {
    p_capability_code: "routeai_usecase_check",
  });

  if (error || !Array.isArray(data) || !data[0]) {
    return null;
  }

  const row = data[0] as Partial<LearningAccessCheckView>;

  return {
    can_access: Boolean(row.can_access),
    capability_code: String(row.capability_code ?? "routeai_usecase_check"),
    required_certification_code: row.required_certification_code ?? null,
    certification_status: normalizeCertificationStatus(row.certification_status),
    required_course_id: row.required_course_id ?? null,
    required_course_code: row.required_course_code ?? null,
    certification_id: row.certification_id ?? null,
    expires_at: row.expires_at ?? null,
  };
}

async function getLatestPageAttempts(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  courseId: string,
  userId: string,
  pageIds: string[],
) {
  if (!supabase || pageIds.length === 0) {
    return {};
  }

  const { data: attemptRows } = await supabase
    .from("learning_page_attempts")
    .select(
      "page_id, status, attempt_number, answers, score, max_score, percentage, passed, manual_review_required, submitted_at",
    )
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .in("page_id", pageIds)
    .order("attempt_number", { ascending: false });

  return (attemptRows ?? []).reduce<Record<string, LearningAttemptView>>((acc, row) => {
    const attempt = row as AttemptRow;
    if (acc[attempt.page_id]) {
      return acc;
    }

    acc[attempt.page_id] = {
      page_id: attempt.page_id,
      status: attempt.status,
      attempt_number: attempt.attempt_number,
      answers: normalizeAttemptAnswers(attempt.answers),
      score: attempt.score,
      max_score: attempt.max_score,
      percentage: attempt.percentage,
      passed: attempt.passed,
      manual_review_required: attempt.manual_review_required,
      submitted_at: attempt.submitted_at,
    };

    return acc;
  }, {});
}

function mapTopicPageRows(
  topicRows: TopicRow[],
  pageRows: PageRow[],
): Pick<LearningCourseView, "topics" | "pages"> {
  const pages = pageRows
    .map((page): LearningPageView | null => {
      if (!isLessonContent(page.content)) {
        return null;
      }

      return {
        id: page.id,
        page_code: normalizeAiLiteracyPageCode(page.page_code),
        topic_id: page.topic_id,
        title: page.title,
        summary: page.summary,
        page_type: page.page_type,
        estimated_duration_minutes: page.estimated_duration_minutes,
        sequence_order: page.sequence_order,
        is_required: page.is_required,
        content: page.content,
      };
    })
    .filter((page): page is LearningPageView => Boolean(page))
    .sort((left, right) => left.sequence_order - right.sequence_order);

  const pagesByTopicId = new Map<string, LearningPageView[]>();

  for (const page of pages) {
    const topicPages = pagesByTopicId.get(page.topic_id) ?? [];
    topicPages.push(page);
    pagesByTopicId.set(page.topic_id, topicPages);
  }

  const topics = topicRows
    .map(
      (topic): LearningTopicView => ({
        id: topic.id,
        topic_code: topic.topic_code,
        title: topic.title,
        summary: topic.summary,
        sequence_order: topic.sequence_order,
        is_required: topic.is_required,
        pages: pagesByTopicId.get(topic.id) ?? [],
      }),
    )
    .sort((left, right) => left.sequence_order - right.sequence_order);

  return { topics, pages };
}

function mapLegacyLessonRows(
  courseLessonRows: CourseLessonRow[],
  lessonRows: LessonRow[],
): Pick<LearningCourseView, "topics" | "pages"> {
  const lessonsById = new Map(lessonRows.map((lesson) => [lesson.id, lesson]));

  const pages = courseLessonRows
    .map((row) => {
      const lesson = lessonsById.get(row.lesson_id);

      if (!lesson || !isLessonContent(lesson.content)) {
        return null;
      }

      return {
        id: lesson.id,
        page_code: normalizeAiLiteracyPageCode(lesson.lesson_code),
        topic_id: `legacy-topic-${lesson.id}`,
        title: lesson.title,
        summary: lesson.summary,
        page_type: lesson.lesson_type,
        estimated_duration_minutes: lesson.estimated_duration_minutes,
        sequence_order: row.sequence_order,
        is_required: row.is_required,
        content: lesson.content,
      };
    })
    .filter((page): page is LearningPageView => Boolean(page))
    .sort((left, right) => left.sequence_order - right.sequence_order);

  return {
    pages,
    topics: pages.map((page) => ({
      id: page.topic_id,
      topic_code: page.page_code,
      title: page.title,
      summary: page.summary,
      sequence_order: page.sequence_order,
      is_required: page.is_required,
      pages: [page],
    })),
  };
}

function emptyLearnerState(isAuthenticated: boolean): LearnerStateView {
  return {
    isAuthenticated,
    orgId: null,
    enrollment: null,
    accessCheck: null,
    progressByLessonId: {},
    progressByPageId: {},
    attemptsByPageId: {},
  };
}

function normalizeCertificationStatus(
  status: unknown,
): LearningAccessCheckView["certification_status"] {
  if (
    status === "active" ||
    status === "expired" ||
    status === "revoked" ||
    status === "superseded" ||
    status === "missing" ||
    status === "not_configured" ||
    status === "missing_profile_org"
  ) {
    return status;
  }

  return "missing";
}

function countByCourseId(rows: Array<{ course_id: string }>) {
  return rows.reduce<Map<string, number>>((acc, row) => {
    acc.set(row.course_id, (acc.get(row.course_id) ?? 0) + 1);
    return acc;
  }, new Map());
}

function sumMinutesByCourseId(
  rows: Array<{ course_id: string; estimated_duration_minutes: number | null }>,
) {
  return rows.reduce<Map<string, number>>((acc, row) => {
    acc.set(
      row.course_id,
      (acc.get(row.course_id) ?? 0) + (row.estimated_duration_minutes ?? 0),
    );
    return acc;
  }, new Map());
}

function sumCourseMinutes(pages: Array<{ estimated_duration_minutes: number | null }>) {
  return pages.reduce((sum, page) => sum + (page.estimated_duration_minutes ?? 0), 0);
}

function normalizeCourseLevel(level: string) {
  if (level === "advanced") return "mastery";
  if (level === "intermediate") return "proficiency";
  if (level === "mastery" || level === "proficiency" || level === "foundation") return level;
  return "foundation";
}

function mapCatalogStatus(status: string | undefined): "not_started" | "in_progress" | "completed" {
  if (status === "completed") {
    return "completed";
  }

  if (status === "in_progress" || status === "started") {
    return "in_progress";
  }

  return "not_started";
}

function mapProgressRows(
  rows: LearningProgressView[],
  idKey: "lesson_id" | "page_id",
) {
  return rows.reduce<Record<string, LearningProgressView>>((acc, row) => {
    const id = row[idKey];

    if (!id) {
      return acc;
    }

    acc[id] = {
      ...row,
      completed_block_ids: Array.isArray(row.completed_block_ids)
        ? row.completed_block_ids
        : [],
    };
    return acc;
  }, {});
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
        typeof candidate.block_type !== "string" ||
        !(
          typeof candidate.value === "string" ||
          (Array.isArray(candidate.value) &&
            candidate.value.every((item) => typeof item === "string"))
        )
      ) {
        return acc;
      }

      acc[blockId] = {
        block_type: candidate.block_type,
        value: candidate.value,
      };

      return acc;
    },
    {},
  );
}
