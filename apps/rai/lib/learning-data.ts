import "server-only";

import { isLessonContent } from "@digidactics/domain/learning";
import {
  aiLiteracyPreviewCourse,
  type LearnerStateView,
  type LearningCourseView,
  type LearningEnrollmentView,
  type LearningLessonView,
  type LearningProgressView,
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
    .from("learning_course_lessons")
    .select("lesson_id, sequence_order, is_required")
    .eq("course_id", course.id)
    .order("sequence_order", { ascending: true });

  if (courseLessonsError || !courseLessonRows) {
    if (process.env.NODE_ENV !== "production") {
      return aiLiteracyPreviewCourse;
    }

    throw new Error("AI Literacy lessons could not be loaded.");
  }

  const lessonIds = (courseLessonRows as CourseLessonRow[]).map(
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
    lessons: mapLessonRows(
      courseLessonRows as CourseLessonRow[],
      lessonRows as LessonRow[],
    ),
  };
}

export async function getAiLiteracyLesson(
  lessonCode: string,
): Promise<{ course: LearningCourseView; lesson: LearningLessonView | null }> {
  const course = await getAiLiteracyCourse();
  const lesson =
    course.lessons.find((item) => item.lesson_code === lessonCode) ?? null;

  return { course, lesson };
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

  const lessonIds = course.lessons.map((lesson) => lesson.id);

  const { data: progressRows } = lessonIds.length
    ? await supabase
        .from("learning_lesson_progress")
        .select(
          "lesson_id, status, progress_percentage, completed_block_ids, completed_at",
        )
        .eq("course_id", course.id)
        .eq("user_id", user.id)
        .in("lesson_id", lessonIds)
    : { data: [] };

  return {
    isAuthenticated: true,
    orgId: profile?.org_id ?? null,
    enrollment: enrollment ?? null,
    progressByLessonId: mapProgressRows(progressRows ?? []),
  };
}

function mapLessonRows(
  courseLessonRows: CourseLessonRow[],
  lessonRows: LessonRow[],
): LearningLessonView[] {
  const lessonsById = new Map(lessonRows.map((lesson) => [lesson.id, lesson]));

  return courseLessonRows
    .map((row) => {
      const lesson = lessonsById.get(row.lesson_id);

      if (!lesson || !isLessonContent(lesson.content)) {
        return null;
      }

      return {
        id: lesson.id,
        lesson_code: lesson.lesson_code,
        title: lesson.title,
        summary: lesson.summary,
        lesson_type: lesson.lesson_type,
        estimated_duration_minutes: lesson.estimated_duration_minutes,
        sequence_order: row.sequence_order,
        is_required: row.is_required,
        content: lesson.content,
      };
    })
    .filter((lesson): lesson is LearningLessonView => Boolean(lesson))
    .sort((left, right) => left.sequence_order - right.sequence_order);
}

function emptyLearnerState(isAuthenticated: boolean): LearnerStateView {
  return {
    isAuthenticated,
    orgId: null,
    enrollment: null,
    progressByLessonId: {},
  };
}

function mapProgressRows(rows: LearningProgressView[]) {
  return rows.reduce<Record<string, LearningProgressView>>((acc, row) => {
    acc[row.lesson_id] = {
      ...row,
      completed_block_ids: Array.isArray(row.completed_block_ids)
        ? row.completed_block_ids
        : [],
    };
    return acc;
  }, {});
}
