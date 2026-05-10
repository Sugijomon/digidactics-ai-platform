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

  const courseId = readRequired(formData, "courseId");
  const courseCode = readRequired(formData, "courseCode");
  const topicId = readRequired(formData, "topicId");
  const pageCode = slugify(readRequired(formData, "pageCode"));
  const title = readRequired(formData, "title");
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const pageType = String(formData.get("pageType") ?? "content");
  const estimatedMinutes = Number(formData.get("estimatedMinutes") ?? 5);
  const sequenceOrder = Number(formData.get("sequenceOrder") ?? 1);

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
    sequence_order: Number.isFinite(sequenceOrder) ? sequenceOrder : 1,
    is_required: true,
    content_schema_version: 1,
    content: defaultPageContent,
  });

  if (error) {
    throw new Error(`Pagina aanmaken is mislukt: ${error.message}`);
  }

  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath(`/learning/${courseCode}`);
  redirect(`/learning/${courseCode}/${pageCode}`);
}

export async function updateLearningPageContent(formData: FormData) {
  const supabase = await requireLearningAdmin();

  const pageId = readRequired(formData, "pageId");
  const courseCode = readRequired(formData, "courseCode");
  const pageCode = readRequired(formData, "pageCode");
  const title = readRequired(formData, "title");
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const contentText = readRequired(formData, "content");
  const content = parseContentJson(contentText);

  const { error } = await supabase
    .from("learning_pages")
    .update({
      title,
      summary,
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

function readRequired(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} ontbreekt.`);
  }

  return value;
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
