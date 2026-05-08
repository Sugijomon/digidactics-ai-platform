"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  estimateCompletionPercentage,
  isLessonContent,
} from "@digidactics/domain/learning";
import { getSupabaseServerClient } from "@/lib/supabase-server";

interface LearnerContext {
  userId: string;
  orgId: string;
}

export async function startAiLiteracyCourse(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const courseCode = String(formData.get("courseCode") ?? "ai-literacy-foundation");
  const firstLessonCode = String(formData.get("firstLessonCode") ?? "");

  if (!courseId) {
    throw new Error("Course id ontbreekt.");
  }

  const supabase = await requireSupabaseClient();
  const learner = await requireLearnerContext(supabase);

  const { error } = await supabase.from("learning_course_enrollments").upsert(
    {
      org_id: learner.orgId,
      user_id: learner.userId,
      course_id: courseId,
      status: "in_progress",
      source: "onboarding",
      started_at: new Date().toISOString(),
      progress_percentage: 0,
    },
    { onConflict: "user_id,course_id" },
  );

  if (error) {
    throw new Error(`Cursus starten is mislukt: ${error.message}`);
  }

  revalidatePath("/learning");
  revalidatePath(`/learning/${courseCode}`);

  if (firstLessonCode) {
    redirect(`/learning/${courseCode}/${firstLessonCode}`);
  }
}

export async function completeAiLiteracyLesson(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const courseCode = String(formData.get("courseCode") ?? "ai-literacy-foundation");
  const lessonId = String(formData.get("lessonId") ?? "");
  const lessonCode = String(formData.get("lessonCode") ?? "");

  if (!courseId || !lessonId || !lessonCode) {
    throw new Error("Lesvoortgang kan niet worden opgeslagen zonder cursus en les.");
  }

  const supabase = await requireSupabaseClient();
  const learner = await requireLearnerContext(supabase);

  const { data: lesson, error: lessonError } = await supabase
    .from("learning_lessons")
    .select("content")
    .eq("id", lessonId)
    .single<{ content: unknown }>();

  if (lessonError || !lesson || !isLessonContent(lesson.content)) {
    throw new Error("Lesinhoud kon niet worden gevalideerd.");
  }

  const completedBlockIds = lesson.content.blocks.map((block) => block.id);
  const progressPercentage = estimateCompletionPercentage(
    lesson.content,
    completedBlockIds,
  );
  const now = new Date().toISOString();

  const { error: progressError } = await supabase
    .from("learning_lesson_progress")
    .upsert(
      {
        org_id: learner.orgId,
        user_id: learner.userId,
        lesson_id: lessonId,
        course_id: courseId,
        status: progressPercentage === 100 ? "completed" : "in_progress",
        current_block_id: completedBlockIds.at(-1) ?? null,
        completed_block_ids: completedBlockIds,
        progress_percentage: progressPercentage,
        started_at: now,
        completed_at: progressPercentage === 100 ? now : null,
      },
      { onConflict: "user_id,lesson_id,course_id" },
    );

  if (progressError) {
    throw new Error(`Lesvoortgang opslaan is mislukt: ${progressError.message}`);
  }

  await upsertCourseProgress(supabase, learner, courseId);

  revalidatePath("/learning");
  revalidatePath(`/learning/${courseCode}`);
  revalidatePath(`/learning/${courseCode}/${lessonCode}`);
}

async function upsertCourseProgress(
  supabase: SupabaseClient,
  learner: LearnerContext,
  courseId: string,
) {
  const { data: requiredLessons, error: lessonsError } = await supabase
    .from("learning_course_lessons")
    .select("lesson_id")
    .eq("course_id", courseId)
    .eq("is_required", true);

  if (lessonsError) {
    throw new Error(`Cursuslessen ophalen is mislukt: ${lessonsError.message}`);
  }

  const lessonIds = (requiredLessons ?? []).map((row) => row.lesson_id as string);
  const requiredCount = lessonIds.length;

  const { data: completedProgress, error: progressError } = lessonIds.length
    ? await supabase
        .from("learning_lesson_progress")
        .select("lesson_id")
        .eq("course_id", courseId)
        .eq("user_id", learner.userId)
        .eq("status", "completed")
        .in("lesson_id", lessonIds)
    : { data: [], error: null };

  if (progressError) {
    throw new Error(`Cursusvoortgang berekenen is mislukt: ${progressError.message}`);
  }

  const completedCount = completedProgress?.length ?? 0;
  const progressPercentage =
    requiredCount === 0 ? 0 : Math.round((completedCount / requiredCount) * 100);
  const now = new Date().toISOString();
  const isCompleted = requiredCount > 0 && completedCount === requiredCount;

  const { error: enrollmentError } = await supabase
    .from("learning_course_enrollments")
    .upsert(
      {
        org_id: learner.orgId,
        user_id: learner.userId,
        course_id: courseId,
        status: isCompleted ? "completed" : "in_progress",
        source: "onboarding",
        started_at: now,
        completed_at: isCompleted ? now : null,
        progress_percentage: progressPercentage,
      },
      { onConflict: "user_id,course_id" },
    );

  if (enrollmentError) {
    throw new Error(`Cursusvoortgang opslaan is mislukt: ${enrollmentError.message}`);
  }
}

async function requireLearnerContext(
  supabase: SupabaseClient,
): Promise<LearnerContext> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Je moet ingelogd zijn om voortgang op te slaan.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single<{ org_id: string | null }>();

  if (profileError || !profile?.org_id) {
    throw new Error("Je profiel heeft nog geen organisatiekoppeling.");
  }

  return {
    userId: user.id,
    orgId: profile.org_id,
  };
}

async function requireSupabaseClient(): Promise<SupabaseClient> {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase is nog niet geconfigureerd.");
  }

  return supabase;
}
