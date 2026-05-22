import "server-only";

import { getCurrentUserContext } from "@digidactics/auth";
import { isLessonContent } from "@digidactics/domain/learning";
import { redirect } from "next/navigation";
import {
  aiLiteracyPreviewCourse,
  aiLiteracyTopicSeeds,
  type LearningAttemptAnswerView,
  type LearningCourseView,
  type LearningPageView,
  type LearningTopicView,
} from "./learning-preview-data";
import { getAiLiteracyCourse } from "./learning-data";
import { getSupabaseServerClient, hasSupabaseConfig } from "./supabase-server";

export interface LearningAdminCourseSummary {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
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
}

export interface LearningContentAuditRow {
  topic_code: string;
  topic_title: string;
  page_code: string;
  page_title: string;
  desired_block_types: string[];
  live_block_types: string[];
  status: "ok" | "missing_live_page" | "different_blocks";
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
}

interface ReviewProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
}

export async function requireContentEditor() {
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

export async function getLearningAdminOverview(): Promise<LearningAdminOverview> {
  if (!hasSupabaseConfig()) {
    return previewOverview();
  }

  const { supabase } = await requireContentEditor();

  if (!supabase) {
    return previewOverview();
  }

  const { data: courseRows, error: courseError } = await supabase
    .from("learning_courses")
    .select(
      "id, course_code, title, description, status, required_for_onboarding, unlocks_capability, passing_threshold",
    )
    .order("created_at", { ascending: false });

  if (courseError || !courseRows) {
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

export async function getAdminLearningPage(pageCode: string): Promise<{
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

  const { data: page, error: pageError } = await supabase
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
    .eq("page_code", pageCode)
    .maybeSingle<PageRow>();

  if (pageError || !page || !isLessonContent(page.content)) {
    return { course: aiLiteracyPreviewCourse, page: null };
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
    return { course: aiLiteracyPreviewCourse, page: null };
  }

  const adminPage: LearningPageView = {
    id: page.id,
    page_code: page.page_code,
    topic_id: page.topic_id,
    title: page.title,
    summary: page.summary,
    page_type: page.page_type,
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
    .select("id, lesson_code, title, summary, lesson_type, estimated_duration_minutes, content")
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

export async function getAdminCourse(courseCode: string): Promise<LearningCourseView> {
  await requireContentEditor();
  const course = await getAiLiteracyCourse();

  if (course.course_code === courseCode) {
    return course;
  }

  return course;
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
      .select("id, page_code, title")
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
    };
  });
}

export async function getLearningContentAudit(): Promise<LearningContentAuditRow[]> {
  const desiredRows = aiLiteracyTopicSeeds.flatMap((topic) =>
    topic.pages.map((page) => ({
      topic_code: topic.code,
      topic_title: topic.title,
      page_code: page.code,
      page_title: page.title,
      desired_block_types: page.blocks.map((block) => block.type),
    })),
  );

  if (!hasSupabaseConfig()) {
    return desiredRows.map((row) => ({
      ...row,
      live_block_types: row.desired_block_types,
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

  const { data: course } = await supabase
    .from("learning_courses")
    .select("id")
    .eq("course_code", aiLiteracyPreviewCourse.course_code)
    .maybeSingle<{ id: string }>();

  if (!course) {
    return desiredRows.map((row) => ({
      ...row,
      live_block_types: [],
      status: "missing_live_page",
    }));
  }

  const { data: pageRows } = await supabase
    .from("learning_pages")
    .select("page_code, content")
    .eq("course_id", course.id)
    .neq("status", "archived");

  const liveBlocksByPageCode = new Map(
    ((pageRows ?? []) as Array<{ page_code: string; content: { blocks?: Array<{ type?: string }> } | null }>).map(
      (page) => [
        page.page_code,
        Array.isArray(page.content?.blocks)
          ? page.content.blocks.map((block) => String(block.type ?? "unknown"))
          : [],
      ],
    ),
  );

  return desiredRows.map((row) => {
    const liveBlockTypes = liveBlocksByPageCode.get(row.page_code);
    const status =
      liveBlockTypes === undefined
        ? "missing_live_page"
        : sameStringArray(liveBlockTypes, row.desired_block_types)
          ? "ok"
          : "different_blocks";

    return {
      ...row,
      live_block_types: liveBlockTypes ?? [],
      status,
    };
  });
}

function previewOverview(): LearningAdminOverview {
  return {
    courses: [
      {
        id: aiLiteracyPreviewCourse.id,
        course_code: aiLiteracyPreviewCourse.course_code,
        title: aiLiteracyPreviewCourse.title,
        description: aiLiteracyPreviewCourse.description,
        status: "published",
        required_for_onboarding: aiLiteracyPreviewCourse.required_for_onboarding,
        unlocks_capability: "routeai_usecase_check",
        passing_threshold: aiLiteracyPreviewCourse.passing_threshold,
        page_count: aiLiteracyPreviewCourse.pages.length,
        published_page_count: aiLiteracyPreviewCourse.pages.length,
      },
    ],
    lessons: aiLiteracyPreviewCourse.pages.map((page) => ({
      id: page.id,
      code: page.page_code,
      title: page.title,
      summary: page.summary,
      kind: "course_page",
      course_title: aiLiteracyPreviewCourse.title,
      course_code: aiLiteracyPreviewCourse.course_code,
      estimated_duration_minutes: page.estimated_duration_minutes,
      status: "published",
      block_count: page.content.blocks.length,
    })),
    microLearnings: [],
  };
}

function previewAdminPage(pageCode: string): {
  course: LearningCourseView;
  page: LearningPageView | null;
} {
  const page = aiLiteracyPreviewCourse.pages.find((item) => item.page_code === pageCode) ?? null;
  const topic =
    aiLiteracyPreviewCourse.topics.find((item) =>
      item.pages.some((topicPage) => topicPage.page_code === pageCode),
    ) ?? null;

  if (!page) {
    return { course: aiLiteracyPreviewCourse, page: null };
  }

  return {
    course: {
      ...aiLiteracyPreviewCourse,
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
