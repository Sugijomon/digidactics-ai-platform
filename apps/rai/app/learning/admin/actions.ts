"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@digidactics/auth";
import {
  evaluateLearningCertificationEligibility,
  isLessonContent,
} from "@digidactics/domain/learning";
import {
  aiLiteracyPreviewCourse,
  aiMasteryPreviewCourse,
  aiProficiencyPreviewCourse,
  type LearningCourseView,
} from "@/lib/learning-preview-data";
import {
  getDevContentEditorSupabaseClient,
  isDevContentEditorBypassEnabled,
} from "@/lib/dev-content-editor-bypass";
import { writeLocalLearningPageOverride } from "@/lib/learning-local-content-overrides";
import {
  syncAllLearningCourseContentFromSource,
  LEARNING_CORE_CONTENT_SYNC_CONFIRMATION,
} from "@/lib/learning-content-sync";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const defaultPageContent = {
  version: 1,
  blocks: [
    {
      id: "intro",
      type: "paragraph",
      markdown: "Nieuwe learningpagina. Vervang deze tekst in de editor.",
    },
  ],
};

const defaultMicroLearningContent = {
  version: 1,
  blocks: [
    {
      id: "intro",
      type: "paragraph",
      markdown: "Nieuwe micro-learning. Vervang deze tekst in de editor.",
    },
  ],
};

interface RequiredPageRow {
  id: string;
  content: unknown;
}

interface PageProgressRow {
  page_id: string;
}

interface PageAttemptRow {
  answers: PageAnswers;
  page_id: string;
  attempt_number: number;
  percentage: number | null;
  passed: boolean | null;
  manual_review_required: boolean;
}

type PageAnswers = Record<
  string,
  { block_type: string; value: string | string[] }
>;

export async function createLearningPage(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const target = readCourseTopicTarget(formData);
  const { courseId, courseCode, topicId } = target;
  const title = readRequired(formData, "title");
  const pageCode = slugify(String(formData.get("pageCode") ?? "").trim() || title);
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const pageType = String(formData.get("pageType") ?? "content");
  const estimatedMinutes = Number(formData.get("estimatedMinutes") ?? 5);
  const requestedSequenceOrder = Number(formData.get("sequenceOrder") ?? 1);
  const sequenceOrder = await resolveSequenceOrder(
    supabase,
    topicId,
    Number.isFinite(requestedSequenceOrder) ? requestedSequenceOrder : 1,
  );

  const { data, error } = await supabase
    .from("learning_pages")
    .insert({
      course_id: courseId,
      topic_id: topicId,
      page_code: pageCode,
      title,
      summary,
      page_type: pageType,
      status: "published",
      estimated_duration_minutes: Number.isFinite(estimatedMinutes)
        ? estimatedMinutes
        : 5,
      sequence_order: sequenceOrder,
      is_required: true,
      content_schema_version: 1,
      content: defaultPageContent,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw new Error(`Pagina aanmaken is mislukt: ${error.message}`);
  }

  revalidateTag("learning-admin");
  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath("/learning/admin/lessons");
  revalidatePath(`/learning/admin/courses/${courseCode}`);
  revalidatePath(`/learning/${courseCode}`);
  redirect(`/learning/admin/lessons/${pageCode}?courseCode=${courseCode}&pageId=${data?.id ?? ""}`);
}

export async function createLearningCourse(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const courseCode = slugify(readRequired(formData, "courseCode"));
  const title = readRequired(formData, "title");
  const description = String(formData.get("description") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "draft");
  const passingThreshold = Number(formData.get("passingThreshold") ?? 80);
  const requiredForOnboarding = String(formData.get("requiredForOnboarding") ?? "") === "on";
  const unlocksCapability = String(formData.get("unlocksCapability") ?? "").trim() || null;
  const difficultyLevel = normalizeDifficultyLevel(String(formData.get("difficultyLevel") ?? "foundation"));

  const { data: course, error: courseError } = await supabase
    .from("learning_courses")
    .insert({
      course_code: courseCode,
      title,
      description,
      status,
      difficulty_level: difficultyLevel,
      required_for_onboarding: requiredForOnboarding,
      unlocks_capability: unlocksCapability,
      passing_threshold: Number.isFinite(passingThreshold) ? passingThreshold : 80,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .select("id")
    .single<{ id: string }>();

  if (courseError || !course) {
    throw new Error(`Cursus aanmaken is mislukt: ${courseError?.message ?? "geen cursus aangemaakt"}`);
  }

  const { error: topicError } = await supabase.from("learning_topics").insert({
    course_id: course.id,
    topic_code: "intro",
    title: "Introductie",
    summary: "Starttopic voor deze cursus.",
    status: "published",
    sequence_order: 1,
    is_required: true,
  });

  if (topicError) {
    throw new Error(`Cursus is aangemaakt, maar het starttopic niet: ${topicError.message}`);
  }

  revalidateTag("learning-admin");
  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath("/learning/admin/courses");
  redirect(`/learning/admin/courses/${courseCode}`);
}

export async function createMicroLearning(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const lessonCode = slugify(readRequired(formData, "lessonCode"));
  const title = readRequired(formData, "title");
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "draft");
  const estimatedMinutes = Number(formData.get("estimatedMinutes") ?? 8);

  const { error } = await supabase.from("learning_lessons").insert({
    lesson_code: lessonCode,
    title,
    summary,
    lesson_type: "microlearning",
    status,
    difficulty_level: "foundation",
    estimated_duration_minutes: Number.isFinite(estimatedMinutes) ? estimatedMinutes : 8,
    content_schema_version: 1,
    content: defaultMicroLearningContent,
    published_at: status === "published" ? new Date().toISOString() : null,
  });

  if (error) {
    throw new Error(`Micro-learning aanmaken is mislukt: ${error.message}`);
  }

  revalidateTag("learning-admin");
  revalidatePath("/learning/admin");
  revalidatePath("/learning/admin/courses");
  revalidatePath("/learning/admin/lessons");
  redirect(`/learning/admin/microlearnings/${lessonCode}`);
}

export async function archiveLearningCourse(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const courseId = readRequired(formData, "courseId");
  const courseCode = readRequired(formData, "courseCode");

  const updateQuery = supabase
    .from("learning_courses")
    .update({
      status: "archived",
      updated_at: new Date().toISOString(),
    });

  const { error } = isUuid(courseId)
    ? await updateQuery.eq("id", courseId)
    : await updateQuery.eq("course_code", courseCode);

  if (error) {
    throw new Error(`Cursus archiveren is mislukt: ${error.message}`);
  }

  revalidateTag("learning-admin");
  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath("/learning/admin/courses");
  revalidatePath(`/learning/admin/courses/${courseCode}`);
  revalidatePath(`/learning/${courseCode}`);
}

export async function addExistingLessonToCourse(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const courseId = readRequired(formData, "courseId");
  const courseCode = readRequired(formData, "courseCode");
  const topicId = readRequired(formData, "topicId");
  const lessonId = readRequired(formData, "lessonId");
  const sourceKind = String(formData.get("sourceKind") ?? "microlearning");

  let lesson:
    | {
        lesson_code: string;
        title: string;
        summary: string | null;
        lesson_type: string;
        estimated_duration_minutes: number | null;
        content: unknown;
      }
    | null = null;

  if (sourceKind === "course_page") {
    const { data: page, error: pageError } = await supabase
      .from("learning_pages")
      .select("page_code, title, summary, page_type, estimated_duration_minutes, content")
      .eq("id", lessonId)
      .single<{
        page_code: string;
        title: string;
        summary: string | null;
        page_type: string;
        estimated_duration_minutes: number | null;
        content: unknown;
      }>();

    if (pageError || !page) {
      throw new Error(`Les toevoegen is mislukt: ${pageError?.message ?? "les niet gevonden"}`);
    }

    lesson = {
      lesson_code: page.page_code,
      title: page.title,
      summary: page.summary,
      lesson_type: page.page_type,
      estimated_duration_minutes: page.estimated_duration_minutes,
      content: page.content,
    };
  } else {
    const { data: microLesson, error: lessonError } = await supabase
      .from("learning_lessons")
      .select(
        "lesson_code, title, summary, lesson_type, estimated_duration_minutes, content",
      )
      .eq("id", lessonId)
      .single<{
        lesson_code: string;
        title: string;
        summary: string | null;
        lesson_type: string;
        estimated_duration_minutes: number | null;
        content: unknown;
      }>();

    if (lessonError || !microLesson) {
      throw new Error(`Les toevoegen is mislukt: ${lessonError?.message ?? "les niet gevonden"}`);
    }

    lesson = microLesson;
  }

  const { data: existingPages } = await supabase
    .from("learning_pages")
    .select("page_code, sequence_order")
    .eq("course_id", courseId)
    .eq("topic_id", topicId);

  const existingCodes = new Set((existingPages ?? []).map((page) => page.page_code));
  const pageCode = uniqueCode(slugify(lesson.lesson_code), existingCodes);
  const sequenceOrder =
    Math.max(0, ...(existingPages ?? []).map((page) => Number(page.sequence_order) || 0)) + 1;

  const { error } = await supabase.from("learning_pages").insert({
    course_id: courseId,
    topic_id: topicId,
    page_code: pageCode,
    title: lesson.title,
    summary: lesson.summary,
    page_type: mapLessonTypeToPageType(lesson.lesson_type),
    status: "published",
    estimated_duration_minutes: lesson.estimated_duration_minutes,
    sequence_order: sequenceOrder,
    is_required: true,
    content_schema_version: 1,
    content: lesson.content,
  });

  if (error) {
    throw new Error(`Les toevoegen is mislukt: ${error.message}`);
  }

  revalidateTag("learning-admin");
  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath("/learning/admin/lessons");
  revalidatePath(`/learning/admin/courses/${courseCode}`);
  revalidatePath(`/learning/${courseCode}`);
}

export async function updateLearningCourseDetails(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const courseId = readRequired(formData, "courseId");
  const courseCode = readRequired(formData, "courseCode");
  const title = readRequired(formData, "title");
  const description = String(formData.get("description") ?? "").trim() || null;
  const unlocksCapability = String(formData.get("unlocksCapability") ?? "").trim() || null;
  const passingThreshold = Number(formData.get("passingThreshold") ?? 80);
  const requiredForOnboarding = String(formData.get("requiredForOnboarding") ?? "") === "on";
  const status = String(formData.get("status") ?? "draft");
  const difficultyLevel = normalizeDifficultyLevel(String(formData.get("difficultyLevel") ?? "foundation"));

  const updateQuery = supabase
    .from("learning_courses")
    .update({
      title,
      description,
      unlocks_capability: unlocksCapability,
      difficulty_level: difficultyLevel,
      passing_threshold: Number.isFinite(passingThreshold) ? passingThreshold : 80,
      required_for_onboarding: requiredForOnboarding,
      status: status === "published" ? "published" : "draft",
      updated_at: new Date().toISOString(),
    });

  const { error } = isUuid(courseId)
    ? await updateQuery.eq("id", courseId)
    : await updateQuery.eq("course_code", courseCode);

  if (error) {
    throw new Error(`Cursus opslaan is mislukt: ${error.message}`);
  }

  revalidateTag("learning-admin");
  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath(`/learning/admin/courses/${courseCode}`);
  revalidatePath(`/learning/${courseCode}`);
}

export async function createLearningTopic(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const courseId = readRequired(formData, "courseId");
  const courseCode = readRequired(formData, "courseCode");
  const title = readRequired(formData, "title");
  const rawTopicCode = String(formData.get("topicCode") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim() || null;

  const { data: course, error: courseError } = await supabase
    .from("learning_courses")
    .select("id, org_id")
    .eq("id", courseId)
    .single<{ id: string; org_id: string | null }>();

  if (courseError || !course) {
    throw new Error(`Topic aanmaken is mislukt: ${courseError?.message ?? "cursus niet gevonden"}`);
  }

  const { data: topicRows } = await supabase
    .from("learning_topics")
    .select("topic_code")
    .eq("course_id", courseId);

  const existingCodes = new Set((topicRows ?? []).map((topic) => String(topic.topic_code)));
  const topicCode = uniqueCode(slugify(rawTopicCode || title), existingCodes);
  const sequenceOrder = await resolveTopicSequenceOrder(supabase, courseId, 1);

  const { error } = await supabase.from("learning_topics").insert({
    course_id: course.id,
    org_id: course.org_id,
    topic_code: topicCode,
    title,
    summary,
    status: "published",
    sequence_order: sequenceOrder,
    is_required: true,
  });

  if (error) {
    throw new Error(`Topic aanmaken is mislukt: ${error.message}`);
  }

  revalidateLearningCourse(courseCode);
  redirect(`/learning/admin/courses/${courseCode}`);
}

export async function updateLearningTopicDetails(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const topicId = readRequired(formData, "topicId");
  const courseCode = readRequired(formData, "courseCode");
  const title = readRequired(formData, "title");
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const isRequired = String(formData.get("isRequired") ?? "") === "on";

  if (!isUuid(topicId)) {
    revalidateLearningCourse(courseCode);
    return;
  }

  const { error } = await supabase
    .from("learning_topics")
    .update({
      title,
      summary,
      is_required: isRequired,
      updated_at: new Date().toISOString(),
    })
    .eq("id", topicId);

  if (error) {
    throw new Error(`Topic opslaan is mislukt: ${error.message}`);
  }

  revalidateLearningCourse(courseCode);
  redirect(`/learning/admin/courses/${courseCode}`);
}

export async function moveLearningTopic(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const topicId = readRequired(formData, "topicId");
  const courseCode = readRequired(formData, "courseCode");
  const direction = String(formData.get("direction") ?? "");

  if (!isUuid(topicId)) {
    revalidateLearningCourse(courseCode);
    return;
  }

  const { data: topic, error: topicError } = await supabase
    .from("learning_topics")
    .select("id, course_id, sequence_order")
    .eq("id", topicId)
    .single<{ id: string; course_id: string; sequence_order: number }>();

  if (topicError || !topic) {
    throw new Error(`Topicvolgorde aanpassen is mislukt: ${topicError?.message ?? "topic niet gevonden"}`);
  }

  const siblingQuery = supabase
    .from("learning_topics")
    .select("id, sequence_order")
    .eq("course_id", topic.course_id)
    .neq("status", "archived");

  const { data: sibling, error: siblingError } =
    direction === "up"
      ? await siblingQuery
          .lt("sequence_order", topic.sequence_order)
          .order("sequence_order", { ascending: false })
          .limit(1)
          .maybeSingle<{ id: string; sequence_order: number }>()
      : await siblingQuery
          .gt("sequence_order", topic.sequence_order)
          .order("sequence_order", { ascending: true })
          .limit(1)
          .maybeSingle<{ id: string; sequence_order: number }>();

  if (siblingError) {
    throw new Error(`Topicvolgorde aanpassen is mislukt: ${siblingError.message}`);
  }

  if (!sibling) {
    redirect(`/learning/admin/courses/${courseCode}`);
  }

  const tempOrder = 100000 + topic.sequence_order;
  const updates = [
    supabase.from("learning_topics").update({ sequence_order: tempOrder }).eq("id", topic.id),
    supabase
      .from("learning_topics")
      .update({ sequence_order: topic.sequence_order })
      .eq("id", sibling.id),
    supabase
      .from("learning_topics")
      .update({ sequence_order: sibling.sequence_order })
      .eq("id", topic.id),
  ];

  for (const update of updates) {
    const { error } = await update;
    if (error) {
      throw new Error(`Topicvolgorde aanpassen is mislukt: ${error.message}`);
    }
  }

  revalidateLearningCourse(courseCode);
  redirect(`/learning/admin/courses/${courseCode}`);
}

export async function deleteLearningTopic(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const topicId = readRequired(formData, "topicId");
  const courseCode = readRequired(formData, "courseCode");

  if (!isUuid(topicId)) {
    revalidateLearningCourse(courseCode);
    return;
  }

  const { error } = await supabase
    .from("learning_topics")
    .delete()
    .eq("id", topicId);

  if (error) {
    throw new Error(`Onderwerp verwijderen is mislukt: ${error.message}`);
  }

  revalidateLearningCourse(courseCode);
  redirect(`/learning/admin/courses/${courseCode}`);
}

export async function moveLearningPage(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const pageId = readRequired(formData, "pageId");
  const courseCode = readRequired(formData, "courseCode");
  const direction = String(formData.get("direction") ?? "");

  if (!isUuid(pageId)) {
    revalidateLearningCourse(courseCode);
    return;
  }

  const { data: page, error: pageError } = await supabase
    .from("learning_pages")
    .select("id, topic_id, sequence_order")
    .eq("id", pageId)
    .single<{ id: string; topic_id: string; sequence_order: number }>();

  if (pageError || !page) {
    throw new Error(`Volgorde aanpassen is mislukt: ${pageError?.message ?? "pagina niet gevonden"}`);
  }

  const siblingQuery = supabase
    .from("learning_pages")
    .select("id, sequence_order")
    .eq("topic_id", page.topic_id);

  const { data: sibling, error: siblingError } =
    direction === "up"
      ? await siblingQuery
          .lt("sequence_order", page.sequence_order)
          .order("sequence_order", { ascending: false })
          .limit(1)
          .maybeSingle<{ id: string; sequence_order: number }>()
      : await siblingQuery
          .gt("sequence_order", page.sequence_order)
          .order("sequence_order", { ascending: true })
          .limit(1)
          .maybeSingle<{ id: string; sequence_order: number }>();

  if (siblingError) {
    throw new Error(`Volgorde aanpassen is mislukt: ${siblingError.message}`);
  }

  if (!sibling) {
    redirect(`/learning/admin/courses/${courseCode}`);
  }

  const tempOrder = 100000 + page.sequence_order;
  const updates = [
    supabase.from("learning_pages").update({ sequence_order: tempOrder }).eq("id", page.id),
    supabase
      .from("learning_pages")
      .update({ sequence_order: page.sequence_order })
      .eq("id", sibling.id),
    supabase
      .from("learning_pages")
      .update({ sequence_order: sibling.sequence_order })
      .eq("id", page.id),
  ];

  for (const update of updates) {
    const { error } = await update;
    if (error) {
      throw new Error(`Volgorde aanpassen is mislukt: ${error.message}`);
    }
  }

  revalidateTag("learning-admin");
  revalidatePath("/learning");
  revalidatePath("/learning/admin/lessons");
  revalidatePath(`/learning/admin/courses/${courseCode}`);
  revalidatePath(`/learning/${courseCode}`);
}

export async function moveLearningPageToTopic(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const pageId = readRequired(formData, "pageId");
  const courseCode = readRequired(formData, "courseCode");
  const targetTopicId = readRequired(formData, "targetTopicId");

  if (!isUuid(pageId) || !isUuid(targetTopicId)) {
    revalidateLearningCourse(courseCode);
    return;
  }

  const { data: page, error: pageError } = await supabase
    .from("learning_pages")
    .select("id, topic_id")
    .eq("id", pageId)
    .single<{ id: string; topic_id: string }>();

  if (pageError || !page) {
    throw new Error(`Topic wijzigen is mislukt: ${pageError?.message ?? "pagina niet gevonden"}`);
  }

  if (page.topic_id === targetTopicId) {
    redirect(`/learning/admin/courses/${courseCode}`);
  }

  const sequenceOrder = await resolveSequenceOrder(supabase, targetTopicId, 1);
  const { error } = await supabase
    .from("learning_pages")
    .update({
      topic_id: targetTopicId,
      sequence_order: sequenceOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pageId);

  if (error) {
    throw new Error(`Topic wijzigen is mislukt: ${error.message}`);
  }

  revalidateLearningCourse(courseCode);
  redirect(`/learning/admin/courses/${courseCode}`);
}

export async function toggleLearningPageRequired(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const pageId = readRequired(formData, "pageId");
  const courseCode = readRequired(formData, "courseCode");
  const isRequired = String(formData.get("isRequired") ?? "") === "true";

  if (!isUuid(pageId)) {
    revalidateLearningCourse(courseCode);
    return;
  }

  const { error } = await supabase
    .from("learning_pages")
    .update({
      is_required: !isRequired,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pageId);

  if (error) {
    throw new Error(`Verplichtstelling wijzigen is mislukt: ${error.message}`);
  }

  revalidateLearningCourse(courseCode);
  redirect(`/learning/admin/courses/${courseCode}`);
}

export async function archiveLearningPage(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const pageId = readRequired(formData, "pageId");
  const courseCode = readRequired(formData, "courseCode");

  if (!isUuid(pageId)) {
    revalidateLearningCourse(courseCode);
    return;
  }

  const { error } = await supabase
    .from("learning_pages")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", pageId);

  if (error) {
    throw new Error(`Les verwijderen is mislukt: ${error.message}`);
  }

  revalidateTag("learning-admin");
  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath("/learning/admin/lessons");
  revalidatePath(`/learning/admin/courses/${courseCode}`);
  revalidatePath(`/learning/${courseCode}`);
}

export async function updateLearningPageContent(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const pageId = readRequired(formData, "pageId");
  const courseCode = readRequired(formData, "courseCode");
  const pageCode = readRequired(formData, "pageCode");
  const title = readRequired(formData, "title");
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const pageType = String(formData.get("pageType") ?? "content");
  const estimatedMinutes = Number(formData.get("estimatedMinutes") ?? 5);
  const isRequired = String(formData.get("isRequired") ?? "true") === "true";
  const status = String(formData.get("status") ?? "published");
  const contentText = readRequired(formData, "content");
  const content = parseContentJson(contentText);
  const estimatedDurationMinutes = Number.isFinite(estimatedMinutes)
    ? estimatedMinutes
    : 5;

  if (!isUuid(pageId)) {
    writeLocalLearningPageOverride({
      courseCode,
      pageCode,
      title,
      summary,
      pageType,
      estimatedDurationMinutes,
      isRequired,
      status,
      content,
    });
    revalidateLearningCourse(courseCode);
    revalidatePath(`/learning/admin/lessons/${pageCode}`);
    revalidatePath(`/learning/${courseCode}/${pageCode}`);
    return;
  }

  const { data: updatedPage, error } = await supabase
    .from("learning_pages")
    .update({
      title,
      summary,
      page_type: pageType,
      estimated_duration_minutes: estimatedDurationMinutes,
      is_required: isRequired,
      status,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pageId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(`Pagina opslaan is mislukt: ${error.message}`);
  }

  if (!updatedPage && isDevContentEditorBypassEnabled()) {
    writeLocalLearningPageOverride({
      courseCode,
      pageCode,
      title,
      summary,
      pageType,
      estimatedDurationMinutes,
      isRequired,
      status,
      content,
    });
  }

  revalidateTag("learning-admin");
  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath("/learning/admin/lessons");
  revalidatePath(`/learning/admin/lessons/${pageCode}`);
  revalidatePath(`/learning/${courseCode}`);
  revalidatePath(`/learning/${courseCode}/${pageCode}`);
}

export async function updateMicroLearningContent(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const lessonId = readRequired(formData, "pageId");
  const lessonCode = readRequired(formData, "pageCode");
  const title = await readMicroLearningTitle(supabase, lessonId, formData);
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const estimatedMinutes = Number(formData.get("estimatedMinutes") ?? 8);
  const status = String(formData.get("status") ?? "published");
  const contentText = readRequired(formData, "content");
  const content = parseContentJson(contentText);

  const { error } = await supabase
    .from("learning_lessons")
    .update({
      title,
      summary,
      estimated_duration_minutes: Number.isFinite(estimatedMinutes) ? estimatedMinutes : 8,
      status,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lessonId)
    .eq("lesson_type", "microlearning");

  if (error) {
    throw new Error(`Micro-learning opslaan is mislukt: ${error.message}`);
  }

  revalidateTag("learning-admin");
  revalidatePath("/learning/admin");
  revalidatePath("/learning/admin/courses");
  revalidatePath("/learning/admin/courses?view=microlearnings");
  revalidatePath("/learning/admin/lessons");
  revalidatePath(`/learning/admin/microlearnings/${lessonCode}`);
  revalidatePath("/learning");
  revalidatePath("/learning?view=microlearnings");
  revalidatePath(`/learning/lessons/${lessonCode}`);
}

async function readMicroLearningTitle(
  supabase: Awaited<ReturnType<typeof requireLearningAdmin>>,
  lessonId: string,
  formData: FormData,
) {
  const submittedTitle = String(formData.get("title") ?? "").trim();
  if (submittedTitle) {
    return submittedTitle;
  }

  const { data, error } = await supabase
    .from("learning_lessons")
    .select("title")
    .eq("id", lessonId)
    .eq("lesson_type", "microlearning")
    .maybeSingle();

  if (error) {
    throw new Error(`Micro-learning titel ophalen is mislukt: ${error.message}`);
  }

  const existingTitle = String(data?.title ?? "").trim();
  if (!existingTitle) {
    throw new Error("title ontbreekt.");
  }

  return existingTitle;
}

export async function reviewLearningPageAttempt(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const attemptId = readRequired(formData, "attemptId");
  const courseId = readRequired(formData, "courseId");
  const courseCode = readRequired(formData, "courseCode");
  const userId = readRequired(formData, "userId");
  const decision = readRequired(formData, "decision");
  const reviewerNotes = String(formData.get("reviewerNotes") ?? "").trim() || null;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const passed = decision === "approve";
  const { error } = await supabase
    .from("learning_page_attempts")
    .update({
      status: "graded",
      manual_review_required: false,
      passed,
      reviewer_id: user?.id ?? null,
      reviewer_notes: reviewerNotes,
      graded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", attemptId);

  if (error) {
    throw new Error(`Review opslaan is mislukt: ${error.message}`);
  }

  await recomputeReviewedCourseProgress(supabase, courseId, userId);

  revalidateTag("learning-admin");
  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath("/learning/admin/reviews");
  revalidatePath(`/learning/${courseCode}`);
  redirect("/learning/admin/reviews");
}

export async function syncAiLiteracyContentFromSource() {
  const supabase = await requireLearningAdmin();

  await syncAllLearningCourseContentFromSource(supabase, {
    confirmOverwrite: LEARNING_CORE_CONTENT_SYNC_CONFIRMATION,
  });

  revalidateTag("learning-admin");
  revalidateLearningCourse("ai-literacy-foundation");
  revalidateLearningCourse("ai-proficiency");
  revalidateLearningCourse("ai-mastery");
  revalidatePath("/learning/admin/content-audit");
  redirect("/learning/admin/content-audit");
}

async function syncCourseContentFromSource(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>,
  sourceCourse: LearningCourseView,
  options: { overwriteExistingContent?: boolean } = {},
) {
  const { data: course, error: courseError } = await supabase
    .from("learning_courses")
    .select("id, org_id")
    .eq("course_code", sourceCourse.course_code)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; org_id: string | null }>();

  if (courseError || !course) {
    throw new Error(`${sourceCourse.title} cursus niet gevonden: ${courseError?.message ?? "geen cursus"}`);
  }

  const sourceTopicCodes = sourceCourse.topics.map((topic) => topic.topic_code);
  const sourceTopicCodeSet = new Set(sourceTopicCodes);
  const { data: existingTopics, error: existingTopicsError } = await supabase
    .from("learning_topics")
    .select("id, topic_code, sequence_order")
    .eq("course_id", course.id)
    .order("sequence_order", { ascending: true });

  if (existingTopicsError || !existingTopics) {
    throw new Error(`Bestaande topics ophalen is mislukt: ${existingTopicsError?.message ?? "geen topics"}`);
  }

  const existingTopicRows = existingTopics as Array<{ id: string; topic_code: string; sequence_order: number }>;
  await moveTopicsToTemporaryOrder(supabase, existingTopicRows);

  const topicRows = sourceCourse.topics.map((topic, index) => ({
    course_id: course.id,
    org_id: course.org_id,
    topic_code: topic.topic_code,
    title: topic.title,
    summary: topic.summary ?? "",
    status: "published",
    sequence_order: index + 1,
    is_required: true,
    updated_at: new Date().toISOString(),
  }));

  const { error: topicError } = await supabase
    .from("learning_topics")
    .upsert(topicRows, { onConflict: "course_id,topic_code" });

  if (topicError) {
    throw new Error(`Topics synchroniseren is mislukt: ${topicError.message}`);
  }

  await moveTopicsAfterSourceTopics(
    supabase,
    existingTopicRows.filter((topic) => !sourceTopicCodeSet.has(topic.topic_code)),
    sourceCourse.topics.length,
  );

  const { data: topics, error: topicsError } = await supabase
    .from("learning_topics")
    .select("id, topic_code")
    .eq("course_id", course.id)
    .in("topic_code", sourceCourse.topics.map((topic) => topic.topic_code));

  if (topicsError || !topics) {
    throw new Error(`Topics ophalen is mislukt: ${topicsError?.message ?? "geen topics"}`);
  }

  const topicIdByCode = new Map(
    (topics as Array<{ id: string; topic_code: string }>).map((topic) => [
      topic.topic_code,
      topic.id,
    ]),
  );

  const { data: existingPages, error: existingPagesError } = await supabase
    .from("learning_pages")
    .select("id, topic_id, page_code, sequence_order, content")
    .eq("course_id", course.id)
    .order("sequence_order", { ascending: true });

  if (existingPagesError || !existingPages) {
    throw new Error(`Bestaande pagina's ophalen is mislukt: ${existingPagesError?.message ?? "geen pagina's"}`);
  }

  await movePagesToTemporaryOrder(
    supabase,
    existingPages as Array<{ id: string; topic_id: string; sequence_order: number }>,
  );

  const existingPageByCode = new Map(
    (existingPages as Array<{
      id: string;
      topic_id: string;
      page_code: string;
      sequence_order: number;
      content: { blocks?: unknown[] } | null;
    }>).map((page) => [page.page_code, page]),
  );

  const pageRows = sourceCourse.topics.flatMap((topic) =>
    topic.pages.map((page) => {
      const topicId = topicIdByCode.get(topic.topic_code);
      if (!topicId) {
        throw new Error(`Topic ontbreekt voor ${topic.topic_code}.`);
      }

      const existingPage = existingPageByCode.get(page.page_code);
      const existingBlocks = Array.isArray(existingPage?.content?.blocks)
        ? existingPage.content.blocks
        : [];
      const shouldBackfillContent = !existingPage || existingBlocks.length === 0;
      const shouldOverwriteContent = options.overwriteExistingContent || shouldBackfillContent;

      return {
        course_id: course.id,
        topic_id: topicId,
        org_id: course.org_id,
        page_code: page.page_code,
        title: page.title,
        summary: page.summary,
        page_type: page.page_type,
        status: "published",
        estimated_duration_minutes: page.estimated_duration_minutes,
        sequence_order: page.sequence_order,
        is_required: page.is_required,
        content_schema_version: 1,
        content: shouldOverwriteContent
          ? {
              version: 1,
              blocks: page.content.blocks,
            }
          : existingPage.content,
        updated_at: new Date().toISOString(),
      };
    }),
  );

  const { error: pageError } = await supabase
    .from("learning_pages")
    .upsert(pageRows, { onConflict: "course_id,page_code" });

  if (pageError) {
    throw new Error(`Pagina's synchroniseren is mislukt: ${pageError.message}`);
  }

  await moveExtraPagesAfterSourcePages(supabase, course.id, sourceCourse, topicIdByCode);
}

async function moveTopicsToTemporaryOrder(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>,
  topics: Array<{ id: string; topic_code: string; sequence_order: number }>,
) {
  const tempBase = 10000;

  for (const [index, topic] of topics.entries()) {
    const { error } = await supabase
      .from("learning_topics")
      .update({ sequence_order: tempBase + index + 1, updated_at: new Date().toISOString() })
      .eq("id", topic.id);

    if (error) {
      throw new Error(`Tijdelijke topicvolgorde instellen is mislukt: ${error.message}`);
    }
  }
}

async function moveTopicsAfterSourceTopics(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>,
  topics: Array<{ id: string; topic_code: string; sequence_order: number }>,
  sourceTopicCount: number,
) {
  for (const [index, topic] of topics.entries()) {
    const { error } = await supabase
      .from("learning_topics")
      .update({
        sequence_order: sourceTopicCount + index + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", topic.id);

    if (error) {
      throw new Error(`Bestaande topicvolgorde herstellen is mislukt: ${error.message}`);
    }
  }
}

async function movePagesToTemporaryOrder(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>,
  pages: Array<{ id: string; topic_id: string; sequence_order: number }>,
) {
  const seenByTopic = new Map<string, number>();

  for (const page of pages) {
    const index = seenByTopic.get(page.topic_id) ?? 0;
    seenByTopic.set(page.topic_id, index + 1);

    const { error } = await supabase
      .from("learning_pages")
      .update({ sequence_order: 10000 + index + 1, updated_at: new Date().toISOString() })
      .eq("id", page.id);

    if (error) {
      throw new Error(`Tijdelijke paginavolgorde instellen is mislukt: ${error.message}`);
    }
  }
}

async function moveExtraPagesAfterSourcePages(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>,
  courseId: string,
  sourceCourse: LearningCourseView,
  topicIdByCode: Map<string, string>,
) {
  const sourcePageCodesByTopicId = new Map<string, Set<string>>();

  for (const topic of sourceCourse.topics) {
    const topicId = topicIdByCode.get(topic.topic_code);

    if (!topicId) {
      continue;
    }

    sourcePageCodesByTopicId.set(
      topicId,
      new Set(topic.pages.map((page) => page.page_code)),
    );
  }

  const { data: pages, error } = await supabase
    .from("learning_pages")
    .select("id, topic_id, page_code, sequence_order")
    .eq("course_id", courseId)
    .neq("status", "archived")
    .order("sequence_order", { ascending: true });

  if (error || !pages) {
    throw new Error(`Extra paginavolgorde herstellen is mislukt: ${error?.message ?? "geen pagina's"}`);
  }

  const extraPagesByTopicId = new Map<
    string,
    Array<{ id: string; topic_id: string; page_code: string; sequence_order: number }>
  >();

  for (const page of pages as Array<{ id: string; topic_id: string; page_code: string; sequence_order: number }>) {
    const sourcePageCodes = sourcePageCodesByTopicId.get(page.topic_id);

    if (!sourcePageCodes || sourcePageCodes.has(page.page_code)) {
      continue;
    }

    const topicPages = extraPagesByTopicId.get(page.topic_id) ?? [];
    topicPages.push(page);
    extraPagesByTopicId.set(page.topic_id, topicPages);
  }

  for (const [topicId, extraPages] of extraPagesByTopicId.entries()) {
    const sourcePageCount = sourcePageCodesByTopicId.get(topicId)?.size ?? 0;

    for (const [index, page] of extraPages.entries()) {
      const { error: updateError } = await supabase
        .from("learning_pages")
        .update({
          sequence_order: sourcePageCount + index + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", page.id);

      if (updateError) {
        throw new Error(`Extra paginavolgorde herstellen is mislukt: ${updateError.message}`);
      }
    }
  }
}

async function requireLearningAdmin() {
  if (isDevContentEditorBypassEnabled()) {
    const supabase = getDevContentEditorSupabaseClient();

    if (supabase) {
      return supabase;
    }
  }

  const supabase = await getSupabaseServerClient();
  const context = await getCurrentUserContext(supabase);

  if (!supabase || !context) {
    redirect("/auth/login?next=/learning/admin");
  }

  if (
    context.primaryRole !== "content_editor" &&
    context.primaryRole !== "super_admin"
  ) {
    redirect("/dashboard");
  }

  return supabase;
}

async function recomputeReviewedCourseProgress(
  supabase: Awaited<ReturnType<typeof requireLearningAdmin>>,
  courseId: string,
  learnerUserId: string,
) {
  const { data: requiredPages, error: pagesError } = await supabase
    .from("learning_pages")
    .select("id, content")
    .eq("course_id", courseId)
    .eq("is_required", true);

  if (pagesError) {
    throw new Error(`Cursusvoortgang herberekenen is mislukt: ${pagesError.message}`);
  }

  const pageRows = (requiredPages ?? []) as RequiredPageRow[];
  const pageIds = pageRows.map((page) => page.id);
  const requiredCount = pageIds.length;

  const { data: completedProgress, error: progressError } = pageIds.length
    ? await supabase
        .from("learning_page_progress")
        .select("page_id")
        .eq("course_id", courseId)
        .eq("user_id", learnerUserId)
        .eq("status", "completed")
        .in("page_id", pageIds)
    : { data: [], error: null };

  if (progressError) {
    throw new Error(`Cursusvoortgang herberekenen is mislukt: ${progressError.message}`);
  }

  const completedPageIds = new Set(
    ((completedProgress ?? []) as PageProgressRow[]).map((row) => row.page_id),
  );
  const latestAttemptsByPageId = await getLatestReviewAttemptsForPages(
    supabase,
    learnerUserId,
    courseId,
    pageIds,
  );
  const passingThreshold = await getAdminCoursePassingThreshold(supabase, courseId);
  const eligibility = evaluateLearningCertificationEligibility(
    pageRows
      .map((page) =>
        isLessonContent(page.content)
          ? {
              page_id: page.id,
              is_required: true,
              content: page.content,
              is_completed: completedPageIds.has(page.id),
              latest_attempt: latestAttemptsByPageId.get(page.id) ?? null,
            }
          : null,
      )
      .filter((page): page is NonNullable<typeof page> => Boolean(page)),
    passingThreshold,
  );
  const progressPercentage =
    requiredCount === 0 ? 0 : Math.round((eligibility.completed_required_page_count / requiredCount) * 100);
  const isCompleted = eligibility.eligible && eligibility.required_page_count === requiredCount;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", learnerUserId)
    .single<{ org_id: string | null }>();

  if (profileError || !profile?.org_id) {
    throw new Error("Learner profiel heeft geen organisatiekoppeling.");
  }

  const { error: enrollmentError } = await supabase
    .from("learning_course_enrollments")
    .upsert(
      {
        org_id: profile.org_id,
        user_id: learnerUserId,
        course_id: courseId,
        status: isCompleted ? "completed" : "in_progress",
        source: "onboarding",
        progress_percentage: progressPercentage,
        completed_at: isCompleted ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,course_id" },
    );

  if (enrollmentError) {
    throw new Error(`Cursusvoortgang herberekenen is mislukt: ${enrollmentError.message}`);
  }
}

async function getLatestReviewAttemptsForPages(
  supabase: Awaited<ReturnType<typeof requireLearningAdmin>>,
  userId: string,
  courseId: string,
  pageIds: string[],
) {
  if (pageIds.length === 0) {
    return new Map<string, PageAttemptRow>();
  }

  const { data: attemptRows, error } = await supabase
    .from("learning_page_attempts")
    .select("page_id, attempt_number, answers, percentage, passed, manual_review_required")
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

async function getAdminCoursePassingThreshold(
  supabase: Awaited<ReturnType<typeof requireLearningAdmin>>,
  courseId: string,
) {
  const { data } = await supabase
    .from("learning_courses")
    .select("passing_threshold")
    .eq("id", courseId)
    .maybeSingle<{ passing_threshold: number | null }>();

  return data?.passing_threshold ?? 80;
}

async function resolveSequenceOrder(
  supabase: Awaited<ReturnType<typeof requireLearningAdmin>>,
  topicId: string,
  requestedOrder: number,
) {
  const { data: pageRows } = await supabase
    .from("learning_pages")
    .select("sequence_order")
    .eq("topic_id", topicId);

  const existingOrders = new Set(
    (pageRows ?? []).map((page) => Number(page.sequence_order)).filter(Number.isFinite),
  );

  if (requestedOrder > 0 && !existingOrders.has(requestedOrder)) {
    return requestedOrder;
  }

  return Math.max(0, ...existingOrders) + 1;
}

async function resolveTopicSequenceOrder(
  supabase: Awaited<ReturnType<typeof requireLearningAdmin>>,
  courseId: string,
  requestedOrder: number,
) {
  const { data: topicRows } = await supabase
    .from("learning_topics")
    .select("sequence_order")
    .eq("course_id", courseId)
    .neq("status", "archived");

  const existingOrders = new Set(
    (topicRows ?? []).map((topic) => Number(topic.sequence_order)).filter(Number.isFinite),
  );

  if (requestedOrder > 0 && !existingOrders.has(requestedOrder)) {
    return requestedOrder;
  }

  return Math.max(0, ...existingOrders) + 1;
}

function readRequired(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} ontbreekt.`);
  }

  return value;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readCourseTopicTarget(formData: FormData) {
  const rawTarget = String(formData.get("target") ?? "").trim();

  if (rawTarget) {
    const [courseId, courseCode, topicId] = rawTarget.split("|");
    if (courseId && courseCode && topicId) {
      return { courseId, courseCode, topicId };
    }
  }

  return {
    courseId: readRequired(formData, "courseId"),
    courseCode: readRequired(formData, "courseCode"),
    topicId: readRequired(formData, "topicId"),
  };
}

function normalizeDifficultyLevel(value: string) {
  if (value === "advanced" || value === "intermediate") {
    return value;
  }

  return "foundation";
}

function revalidateLearningCourse(courseCode: string) {
  revalidateTag("learning-admin");
  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath("/learning/admin/courses");
  revalidatePath("/learning/admin/lessons");
  revalidatePath(`/learning/admin/courses/${courseCode}`);
  revalidatePath(`/learning/${courseCode}`);
}

function parseContentJson(value: string) {
  const parsed = JSON.parse(value) as unknown;

  if (!isLessonContent(parsed)) {
    throw new Error("Content moet een JSON-object met blocks[] zijn.");
  }

  return parsed;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueCode(baseCode: string, existingCodes: Set<string>) {
  if (!existingCodes.has(baseCode)) {
    return baseCode;
  }

  let index = 2;
  while (existingCodes.has(`${baseCode}-${index}`)) {
    index += 1;
  }

  return `${baseCode}-${index}`;
}

function mapLessonTypeToPageType(lessonType: string) {
  if (lessonType === "assessment") return "assessment";
  if (lessonType === "case_lab") return "case";
  return "content";
}
