import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireContentEditor } from "@/lib/learning-admin-data";
import { syncAllLearningCourseContentFromSource } from "@/lib/learning-content-sync";

export async function POST(request: Request) {
  const { supabase } = await requireContentEditor();

  if (!supabase) {
    throw new Error("Supabase client ontbreekt voor content sync.");
  }

  try {
    await syncAllLearningCourseContentFromSource(supabase);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende syncfout";
    const url = new URL("/learning/admin/content-audit", request.url);
    url.searchParams.set("sync_error", message.slice(0, 300));

    return NextResponse.redirect(url, { status: 303 });
  }

  revalidateTag("learning-admin");
  revalidatePath("/learning");
  revalidatePath("/learning/admin");
  revalidatePath("/learning/admin/content-audit");
  revalidatePath("/learning/ai-literacy-foundation");
  revalidatePath("/learning/ai-proficiency");
  revalidatePath("/learning/ai-mastery");

  return NextResponse.redirect(new URL("/learning/admin/content-audit?synced=1", request.url), {
    status: 303,
  });
}
