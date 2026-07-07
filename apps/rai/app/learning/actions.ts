"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  evaluateLearningCertificationEligibility,
  estimateCompletionPercentage,
  isLessonContent,
  isManualReviewEvidenceBlock,
  type LessonBlock,
  type LessonContent,
} from "@digidactics/domain/learning";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase-server";

interface LearnerContext {
  userId: string;
  orgId: string;
}

interface RequiredPageRow {
  id: string;
  content: unknown;
  is_required?: boolean;
}

interface PageProgressRow {
  page_id: string;
}

interface PageAttemptRow {
  answers: PageAnswers;
  page_id: string;
  attempt_number: number;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  passed: boolean | null;
  manual_review_required: boolean;
}

interface LearningEnrollmentRow {
  id: string;
  status: "not_started" | "in_progress" | "completed" | "expired";
  completed_at: string | null;
}

export async function startAiLiteracyCourse(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const courseCode = String(formData.get("courseCode") ?? "ai-literacy-foundation");
  const firstPageCode = String(
    formData.get("firstPageCode") ?? formData.get("firstLessonCode") ?? "",
  );

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

  if (firstPageCode) {
    redirect(`/learning/${courseCode}/${firstPageCode}`);
  }
}

export async function completeAiLiteracyPage(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const courseCode = String(formData.get("courseCode") ?? "ai-literacy-foundation");
  const pageId = String(formData.get("pageId") ?? "");
  const pageCode = String(formData.get("pageCode") ?? "");
  const nextPageCode = String(formData.get("nextPageCode") ?? "");

  if (!courseId || !pageId || !pageCode) {
    throw new Error("Paginavoortgang kan niet worden opgeslagen zonder cursus en pagina.");
  }

  const supabase = await requireSupabaseClient();
  const learner = await requireLearnerContext(supabase);

  const { data: page, error: pageError } = await supabase
    .from("learning_pages")
    .select("content")
    .eq("id", pageId)
    .single<{ content: unknown }>();

  if (pageError || !page || !isLessonContent(page.content)) {
    throw new Error("Pagina-inhoud kon niet worden gevalideerd.");
  }

  const answers = extractPageAnswers(formData, page.content);
  const grading = gradePageAttempt(page.content, answers);
  const manualReviewRequired = page.content.blocks.some(isManualReviewEvidenceBlock);
  const passingThreshold = await getCoursePassingThreshold(supabase, courseId);
  const passed =
    grading.maxScore > 0 && !manualReviewRequired
      ? grading.percentage >= passingThreshold
      : null;
  const { count: attemptCount, error: attemptCountError } = await supabase
    .from("learning_page_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", learner.userId)
    .eq("page_id", pageId)
    .eq("course_id", courseId);

  if (attemptCountError) {
    throw new Error(`Pogingnummer bepalen is mislukt: ${attemptCountError.message}`);
  }

  if (Object.keys(answers).length > 0) {
    const adminAttemptWriter = getSupabaseAdminClient();
    if (!adminAttemptWriter && (grading.maxScore > 0 || manualReviewRequired)) {
      throw new Error(
        "Antwoorden kunnen niet betrouwbaar worden beoordeeld zonder SUPABASE_SERVICE_ROLE_KEY.",
      );
    }

    const attemptWriter = adminAttemptWriter ?? supabase;
    const canPersistComputedGrading = Boolean(adminAttemptWriter);
    const { error: attemptError } = await attemptWriter
      .from("learning_page_attempts")
      .insert({
        org_id: learner.orgId,
        user_id: learner.userId,
        page_id: pageId,
        course_id: courseId,
        attempt_number: (attemptCount ?? 0) + 1,
        status: "submitted",
        answers,
        score: canPersistComputedGrading && grading.maxScore > 0 ? grading.score : null,
        max_score: canPersistComputedGrading && grading.maxScore > 0 ? grading.maxScore : null,
        percentage: canPersistComputedGrading && grading.maxScore > 0 ? grading.percentage : null,
        passed: canPersistComputedGrading ? passed : null,
        manual_review_required: manualReviewRequired,
        submitted_at: new Date().toISOString(),
      });

    if (attemptError) {
      throw new Error(`Antwoorden opslaan is mislukt: ${attemptError.message}`);
    }
  }

  const completedBlockIds = page.content.blocks.map((block) => block.id);
  const progressPercentage = estimateCompletionPercentage(
    page.content,
    completedBlockIds,
  );
  const now = new Date().toISOString();

  const { error: progressError } = await supabase
    .from("learning_page_progress")
    .upsert(
      {
        org_id: learner.orgId,
        user_id: learner.userId,
        page_id: pageId,
        course_id: courseId,
        status: progressPercentage === 100 ? "completed" : "in_progress",
        current_block_id: completedBlockIds.at(-1) ?? null,
        completed_block_ids: completedBlockIds,
        progress_percentage: progressPercentage,
        started_at: now,
        completed_at: progressPercentage === 100 ? now : null,
      },
      { onConflict: "user_id,page_id,course_id" },
    );

  if (progressError) {
    throw new Error(`Paginavoortgang opslaan is mislukt: ${progressError.message}`);
  }

  await upsertCourseProgress(supabase, learner, courseId);

  revalidatePath("/learning");
  revalidatePath(`/learning/${courseCode}`);
  revalidatePath(`/learning/${courseCode}/${pageCode}`);

  if (nextPageCode) {
    redirect(`/learning/${courseCode}/${nextPageCode}`);
  }

  redirect(`/learning/${courseCode}`);
}

export async function issueAiLiteracyCertification(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const courseCode = String(formData.get("courseCode") ?? "ai-literacy-foundation");

  if (!courseId) {
    throw new Error("Cursus ontbreekt voor certificaatuitgifte.");
  }

  const supabase = await requireSupabaseClient();
  const learner = await requireLearnerContext(supabase);
  const { eligibility, requiredCount } = await getCourseCertificationEligibility(
    supabase,
    learner.userId,
    courseId,
  );

  if (!eligibility.eligible) {
    throw new Error(buildEligibilityErrorMessage(eligibility));
  }

  await saveCourseProgress(
    supabase,
    learner,
    courseId,
    requiredCount,
    eligibility.completed_required_page_count,
    false,
  );

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("learning_course_enrollments")
    .select("id, status, completed_at")
    .eq("course_id", courseId)
    .eq("user_id", learner.userId)
    .maybeSingle<LearningEnrollmentRow>();

  if (enrollmentError || !enrollment?.id) {
    throw new Error(`Enrollment voor certificaatuitgifte ontbreekt: ${enrollmentError?.message ?? "geen enrollment"}`);
  }

  const { error: certificationError } = await supabase.rpc(
    "learning_issue_certification_for_enrollment",
    { p_enrollment_id: enrollment.id },
  );

  if (certificationError) {
    throw new Error(`Certificaat uitgeven is mislukt: ${certificationError.message}`);
  }

  revalidatePath("/learning");
  revalidatePath(`/learning/${courseCode}`);
  redirect(`/learning/${courseCode}`);
}

type PageAnswers = Record<
  string,
  { block_type: string; value: string | string[] }
>;

function extractPageAnswers(
  formData: FormData,
  content: { blocks: Array<{ id: string; type: string }> },
): PageAnswers {
  return Object.fromEntries(
    content.blocks
      .map((block) => {
        const values = formData
          .getAll(`answer:${block.id}`)
          .map((value) => String(value).trim())
          .filter(Boolean);

        if (values.length === 0) {
          return null;
        }

        return [
          block.id,
          {
            block_type: block.type,
            value: values.length === 1 ? values[0] : values,
          },
        ] as const;
      })
      .filter((entry): entry is readonly [string, { block_type: string; value: string | string[] }] =>
        Boolean(entry),
      ),
  );
}

function gradePageAttempt(content: LessonContent, answers: PageAnswers) {
  const gradableBlocks = content.blocks.filter(isAutoGradableBlock);
  const score = gradableBlocks.filter((block) => isCorrectAnswer(block, answers[block.id]?.value))
    .length;
  const maxScore = gradableBlocks.length;

  return {
    score,
    maxScore,
    percentage: maxScore === 0 ? 0 : Math.round((score / maxScore) * 100),
  };
}

function isAutoGradableBlock(block: LessonBlock) {
  return (
    block.type === "scenario" ||
    block.type === "quiz_multiple_choice" ||
    block.type === "quiz_multiple_select" ||
    block.type === "quiz_true_false"
  );
}

function isCorrectAnswer(block: LessonBlock, value: string | string[] | undefined) {
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

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

async function getCoursePassingThreshold(supabase: SupabaseClient, courseId: string) {
  const { data } = await supabase
    .from("learning_courses")
    .select("passing_threshold")
    .eq("id", courseId)
    .maybeSingle<{ passing_threshold: number | null }>();

  return data?.passing_threshold ?? 80;
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
  const pageEligibility = await getCourseCertificationEligibility(
    supabase,
    learner.userId,
    courseId,
  );

  if (pageEligibility.requiredCount > 0 || pageEligibility.hasPageRows) {
    const { eligibility, requiredCount } = pageEligibility;

    await saveCourseProgress(
      supabase,
      learner,
      courseId,
      requiredCount,
      eligibility.completed_required_page_count,
      false,
    );
    return;
  }

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

  await saveCourseProgress(
    supabase,
    learner,
    courseId,
    requiredCount,
    completedProgress?.length ?? 0,
    false,
  );
}

async function getLatestAttemptsForPages(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
  pageIds: string[],
) {
  if (pageIds.length === 0) {
    return new Map<string, PageAttemptRow>();
  }

  const { data: attemptRows, error } = await supabase
    .from("learning_page_attempts")
    .select("page_id, attempt_number, answers, score, max_score, percentage, passed, manual_review_required")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .in("page_id", pageIds)
    .order("attempt_number", { ascending: false });

  if (error) {
    throw new Error(`Pogingen ophalen is mislukt: ${error.message}`);
  }

  return ((attemptRows ?? []) as Array<Omit<PageAttemptRow, "answers"> & { answers: unknown }>).reduce((acc, attempt) => {
    if (!acc.has(attempt.page_id)) {
      acc.set(attempt.page_id, {
        ...attempt,
        answers: normalizeCertificationAnswers(attempt.answers),
      });
    }

    return acc;
  }, new Map<string, PageAttemptRow>());
}

async function getCourseCertificationEligibility(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
) {
  const { data: requiredPages, error: pagesError } = await supabase
    .from("learning_pages")
    .select("id, content, is_required")
    .eq("course_id", courseId)
    .eq("is_required", true);

  if (pagesError) {
    throw new Error(`Cursusvoortgang berekenen is mislukt: ${pagesError.message}`);
  }

  const pageRows = (requiredPages ?? []) as RequiredPageRow[];
  const pageIds = pageRows.map((row) => row.id);
  const requiredCount = pageIds.length;

  const { data: completedProgress, error: progressError } = pageIds.length
    ? await supabase
        .from("learning_page_progress")
        .select("page_id")
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .eq("status", "completed")
        .in("page_id", pageIds)
    : { data: [], error: null };

  if (progressError) {
    throw new Error(`Cursusvoortgang berekenen is mislukt: ${progressError.message}`);
  }

  const completedPageIds = new Set(
    ((completedProgress ?? []) as PageProgressRow[]).map((row) => row.page_id),
  );
  const latestAttemptsByPageId = await getLatestAttemptsForPages(
    supabase,
    userId,
    courseId,
    pageIds,
  );
  const passingThreshold = await getCoursePassingThreshold(supabase, courseId);
  const eligibility = evaluateLearningCertificationEligibility(
    pageRows
      .map((page) => {
        if (!isLessonContent(page.content)) {
          return null;
        }

        return {
          page_id: page.id,
          is_required: true,
          content: page.content,
          is_completed: completedPageIds.has(page.id),
          latest_attempt: enrichAttemptWithComputedGrading(
            page.content,
            latestAttemptsByPageId.get(page.id) ?? null,
            passingThreshold,
          ),
        };
      })
      .filter((page): page is NonNullable<typeof page> => Boolean(page)),
    passingThreshold,
  );

  return {
    eligibility,
    hasPageRows: Boolean(requiredPages),
    requiredCount,
  };
}

function enrichAttemptWithComputedGrading(
  content: LessonContent,
  attempt: PageAttemptRow | null,
  passingThreshold: number,
): PageAttemptRow | null {
  if (!attempt || attempt.manual_review_required || attempt.max_score !== null) {
    return attempt;
  }

  const grading = gradePageAttempt(content, attempt.answers);

  if (grading.maxScore === 0) {
    return attempt;
  }

  return {
    ...attempt,
    score: grading.score,
    max_score: grading.maxScore,
    percentage: grading.percentage,
    passed: grading.percentage >= passingThreshold,
  };
}

function buildEligibilityErrorMessage(
  eligibility: ReturnType<typeof evaluateLearningCertificationEligibility>,
) {
  const reasons = [
    eligibility.missing_page_ids.length ? `${eligibility.missing_page_ids.length} pagina's nog niet afgerond` : "",
    eligibility.pending_review_page_ids.length ? `${eligibility.pending_review_page_ids.length} pagina's wachten op review` : "",
    eligibility.failed_page_ids.length ? `${eligibility.failed_page_ids.length} pagina's onvoldoende` : "",
    eligibility.insufficient_score_page_ids.length ? `${eligibility.insufficient_score_page_ids.length} pagina's onder de norm` : "",
    eligibility.missing_competency_codes.length
      ? `ontbrekende competenties: ${eligibility.missing_competency_codes.join(", ")}`
      : "",
  ].filter(Boolean);

  return `Rijbewijs kan nog niet worden uitgegeven: ${reasons.join("; ") || "eligibility is nog niet compleet"}.`;
}
function normalizeCertificationAnswers(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<PageAnswers>((acc, [blockId, answer]) => {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
      return acc;
    }

    const candidate = answer as { block_type?: unknown; value?: unknown };
    const blockType = typeof candidate.block_type === "string" ? candidate.block_type : "";
    const answerValue = normalizeCertificationAnswerValue(candidate.value);

    if (!blockType || answerValue === null) {
      return acc;
    }

    acc[blockId] = {
      block_type: blockType,
      value: answerValue,
    };

    return acc;
  }, {});
}

function normalizeCertificationAnswerValue(value: unknown): string | string[] | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }

  return null;
}

async function saveCourseProgress(
  supabase: SupabaseClient,
  learner: LearnerContext,
  courseId: string,
  requiredCount: number,
  completedCount: number,
  isCompleted: boolean,
) {
  const progressPercentage =
    requiredCount === 0 ? 0 : Math.round((completedCount / requiredCount) * 100);
  const now = new Date().toISOString();
  const enrollmentWriter = isCompleted ? getSupabaseAdminClient() : supabase;

  if (!enrollmentWriter) {
    throw new Error(
      "Cursusvoltooiing kan niet betrouwbaar worden opgeslagen zonder SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const { error: enrollmentError } = await enrollmentWriter
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
