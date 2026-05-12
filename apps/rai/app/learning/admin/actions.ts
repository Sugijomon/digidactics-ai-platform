"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@digidactics/auth";
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

export async function createLearningPage(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const target = readCourseTopicTarget(formData);
  const { courseId, courseCode, topicId } = target;
  const pageCode = slugify(readRequired(formData, "pageCode"));
  const title = readRequired(formData, "title");
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const pageType = String(formData.get("pageType") ?? "content");
  const estimatedMinutes = Number(formData.get("estimatedMinutes") ?? 5);
  const requestedSequenceOrder = Number(formData.get("sequenceOrder") ?? 1);
  const sequenceOrder = await resolveSequenceOrder(
    supabase,
    topicId,
    Number.isFinite(requestedSequenceOrder) ? requestedSequenceOrder : 1,
  );

  const { error } = await supabase.from("learning_pages").insert({
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
  });

  if (error) {
    throw new Error(`Pagina aanmaken is mislukt: ${error.message}`);
  }

  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath("/learning/admin/lessons");
  revalidatePath(`/learning/admin/courses/${courseCode}`);
  revalidatePath(`/learning/${courseCode}`);
  redirect(`/learning/admin/lessons/${pageCode}`);
}

export async function addExistingLessonToCourse(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const courseId = readRequired(formData, "courseId");
  const courseCode = readRequired(formData, "courseCode");
  const topicId = readRequired(formData, "topicId");
  const lessonId = readRequired(formData, "lessonId");

  const { data: lesson, error: lessonError } = await supabase
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

  if (lessonError || !lesson) {
    throw new Error(`Les toevoegen is mislukt: ${lessonError?.message ?? "les niet gevonden"}`);
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

  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath("/learning/admin/lessons");
  revalidatePath(`/learning/admin/courses/${courseCode}`);
  revalidatePath(`/learning/${courseCode}`);
  redirect(`/learning/admin/courses/${courseCode}`);
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

  const { error } = await supabase
    .from("learning_courses")
    .update({
      title,
      description,
      unlocks_capability: unlocksCapability,
      passing_threshold: Number.isFinite(passingThreshold) ? passingThreshold : 80,
      required_for_onboarding: requiredForOnboarding,
      status: status === "published" ? "published" : "draft",
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId);

  if (error) {
    throw new Error(`Cursus opslaan is mislukt: ${error.message}`);
  }

  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath(`/learning/admin/courses/${courseCode}`);
  revalidatePath(`/learning/${courseCode}`);
}

export async function moveLearningPage(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const pageId = readRequired(formData, "pageId");
  const courseCode = readRequired(formData, "courseCode");
  const direction = String(formData.get("direction") ?? "");

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

  revalidatePath("/learning");
  revalidatePath("/learning/admin/lessons");
  revalidatePath(`/learning/admin/courses/${courseCode}`);
  revalidatePath(`/learning/${courseCode}`);
  redirect(`/learning/admin/courses/${courseCode}`);
}

export async function moveLearningPageToTopic(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const pageId = readRequired(formData, "pageId");
  const courseCode = readRequired(formData, "courseCode");
  const targetTopicId = readRequired(formData, "targetTopicId");

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

  const { error } = await supabase
    .from("learning_pages")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", pageId);

  if (error) {
    throw new Error(`Les verwijderen is mislukt: ${error.message}`);
  }

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
  const contentText = readRequired(formData, "content");
  const content = parseContentJson(contentText);

  const { error } = await supabase
    .from("learning_pages")
    .update({
      title,
      summary,
      page_type: pageType,
      estimated_duration_minutes: Number.isFinite(estimatedMinutes)
        ? estimatedMinutes
        : 5,
      is_required: isRequired,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pageId);

  if (error) {
    throw new Error(`Pagina opslaan is mislukt: ${error.message}`);
  }

  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath(`/learning/${courseCode}`);
  revalidatePath(`/learning/${courseCode}/${pageCode}`);
}

async function requireLearningAdmin() {
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

function readRequired(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} ontbreekt.`);
  }

  return value;
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

function revalidateLearningCourse(courseCode: string) {
  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath("/learning/admin/courses");
  revalidatePath("/learning/admin/lessons");
  revalidatePath(`/learning/admin/courses/${courseCode}`);
  revalidatePath(`/learning/${courseCode}`);
}

function parseContentJson(value: string) {
  const parsed = JSON.parse(value) as unknown;

  if (!parsed || typeof parsed !== "object" || !("blocks" in parsed)) {
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
