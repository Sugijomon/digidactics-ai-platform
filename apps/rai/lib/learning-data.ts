import "server-only";

import { getLearningCourseWithLessons } from "@digidactics/database/learning";
import { isLessonContent } from "@digidactics/domain/learning";
import {
  aiLiteracyPreviewCourse,
  type LearningCourseView,
  type LearningLessonView,
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
  sequence_order: number;
  is_required: boolean;
  lesson:
    | {
        id: string;
        lesson_code: string;
        title: string;
        summary: string | null;
        lesson_type: string;
        estimated_duration_minutes: number | null;
        content: unknown;
      }
    | {
        id: string;
        lesson_code: string;
        title: string;
        summary: string | null;
        lesson_type: string;
        estimated_duration_minutes: number | null;
        content: unknown;
      }[];
}

export async function getAiLiteracyCourse(): Promise<LearningCourseView> {
  if (!hasSupabaseConfig()) {
    return aiLiteracyPreviewCourse;
  }

  const supabase = getSupabaseServerClient();

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

  const { data: lessonRows, error: lessonError } =
    await getLearningCourseWithLessons(supabase, course.id);

  if (lessonError || !lessonRows) {
    if (process.env.NODE_ENV !== "production") {
      return aiLiteracyPreviewCourse;
    }

    throw new Error("AI Literacy lessons could not be loaded.");
  }

  return {
    ...course,
    lessons: mapLessonRows(lessonRows as CourseLessonRow[]),
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

function mapLessonRows(rows: CourseLessonRow[]): LearningLessonView[] {
  return rows
    .map((row) => {
      const lesson = Array.isArray(row.lesson) ? row.lesson[0] : row.lesson;

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

