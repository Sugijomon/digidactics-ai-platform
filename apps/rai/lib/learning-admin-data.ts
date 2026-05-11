import "server-only";

import { getCurrentUserContext } from "@digidactics/auth";
import { redirect } from "next/navigation";
import { aiLiteracyPreviewCourse, type LearningCourseView } from "./learning-preview-data";
import { getAiLiteracyCourse } from "./learning-data";
import { getSupabaseServerClient, hasSupabaseConfig } from "./supabase-server";

export interface LearningAdminCourseSummary {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  status: string;
  required_for_onboarding: boolean;
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

interface CourseRow {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  status: string;
  required_for_onboarding: boolean;
  passing_threshold: number;
}

interface PageRow {
  id: string;
  course_id: string;
  page_code: string;
  title: string;
  summary: string | null;
  status: string;
  estimated_duration_minutes: number | null;
  content: { blocks?: unknown[] } | null;
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
      "id, course_code, title, description, status, required_for_onboarding, passing_threshold",
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
    .order("created_at", { ascending: false });

  const { data: microRows } = await supabase
    .from("learning_lessons")
    .select("id, lesson_code, title, summary, lesson_type, status, estimated_duration_minutes, content")
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

export async function getAdminCourse(courseCode: string): Promise<LearningCourseView> {
  await requireContentEditor();
  const course = await getAiLiteracyCourse();

  if (course.course_code === courseCode) {
    return course;
  }

  return course;
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
