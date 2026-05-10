import "server-only";

import { isLessonContent } from "@digidactics/domain/learning";
import {
  aiLiteracyPreviewCourse,
  getCoursePages,
  type LearnerStateView,
  type LearningCourseView,
  type LearningEnrollmentView,
  type LearningLessonView,
  type LearningPageView,
  type LearningProgressView,
  type LearningTopicView,
} from "./learning-preview-data";
import { getSupabaseServerClient, hasSupabaseConfig } from "./supabase-server";

interface CourseRow {
  id: string;
  course_code: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  difficulty_level: string;
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
  estimated_duration_minutes: number | null;
  content: unknown;
}

export async function getAiLiteracyCourse(): Promise<LearningCourseView> {
  if (!hasSupabaseConfig()) {
    return aiLiteracyPreviewCourse;
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return aiLiteracyPreviewCourse;
  }

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
        "required_for_onboarding",
        "passing_threshold",
      ].join(", "),
    )
    .eq("course_code", "ai-literacy-foundation")
    .eq("status", "published")
    .single<CourseRow>();

  if (courseError || !course) {
    if (process.env.NODE_ENV !== "production") {
      return aiLiteracyPreviewCourse;
    }

    throw new Error("AI Literacy course could not be loaded.");
  }

  const { data: courseLessonRows, error: courseLessonsError } = await supabase
    .from("learning_topics")
    .select("id, topic_code, title, summary, sequence_order, is_required")
    .eq("course_id", course.id)
    .order("sequence_order", { ascending: true });

  if (!courseLessonsError && courseLessonRows?.length) {
    const topics = courseLessonRows as TopicRow[];
    const topicIds = topics.map((topic) => topic.id);
    const { data: pageRows, error: pagesError } = await supabase
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
      .eq("status", "published")
      .order("sequence_order", { ascending: true });

    if (pagesError || !pageRows) {
      if (process.env.NODE_ENV !== "production") {
        return aiLiteracyPreviewCourse;
      }

      throw new Error("AI Literacy pages could not be loaded.");
    }

    return {
      ...course,
      ...mapTopicPageRows(topics, pageRows as unknown as PageRow[]),
    };
  }

  const { data: legacyCourseLessonRows, error: legacyCourseLessonsError } =
    await supabase
    .from("learning_course_lessons")
    .select("lesson_id, sequence_order, is_required")
    .eq("course_id", course.id)
    .order("sequence_order", { ascending: true });

  if (legacyCourseLessonsError || !legacyCourseLessonRows) {
    if (process.env.NODE_ENV !== "production") {
      return aiLiteracyPreviewCourse;
    }

    throw new Error("AI Literacy lessons could not be loaded.");
  }

  const lessonIds = (legacyCourseLessonRows as CourseLessonRow[]).map(
    (row) => row.lesson_id,
  );

  const { data: lessonRows, error: lessonError } = lessonIds.length
    ? await supabase
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
    if (process.env.NODE_ENV !== "production") {
      return aiLiteracyPreviewCourse;
    }

    throw new Error("AI Literacy lesson content could not be loaded.");
  }

  return {
    ...course,
    ...mapLegacyLessonRows(
      legacyCourseLessonRows as CourseLessonRow[],
      lessonRows as LessonRow[],
    ),
  };
}

export async function getAiLiteracyPage(
  pageCode: string,
): Promise<{ course: LearningCourseView; page: LearningPageView | null }> {
  const course = await getAiLiteracyCourse();
  const page = getCoursePages(course).find((item) => item.page_code === pageCode) ?? null;

  return { course, page };
}

export async function getAiLiteracyLesson(
  lessonCode: string,
): Promise<{ course: LearningCourseView; lesson: LearningLessonView | null }> {
  const { course, page } = await getAiLiteracyPage(lessonCode);

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

  if (pageProgressRows) {
    return {
      isAuthenticated: true,
      orgId: profile?.org_id ?? null,
      enrollment: enrollment ?? null,
      progressByLessonId: {},
      progressByPageId: mapProgressRows(pageProgressRows ?? [], "page_id"),
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
    progressByLessonId: mapProgressRows(progressRows ?? [], "lesson_id"),
    progressByPageId: {},
  };
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
        page_code: lesson.lesson_code,
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
    progressByLessonId: {},
    progressByPageId: {},
  };
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
