import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aiLiteracyPreviewCourse,
  aiMasteryPreviewCourse,
  aiProficiencyPreviewCourse,
  type LearningCourseView,
} from "@/lib/learning-preview-data";

type LearningSyncClient = SupabaseClient<any, "public", any>;

export const LEARNING_CORE_CONTENT_SYNC_CONFIRMATION = "git-canonical-overwrite-core-courses";

export async function syncAllLearningCourseContentFromSource(
  supabase: LearningSyncClient,
  options: { confirmOverwrite?: string } = {},
) {
  if (options.confirmOverwrite !== LEARNING_CORE_CONTENT_SYNC_CONFIRMATION) {
    throw new Error(
      "Sync geweigerd: bevestig expliciet dat Git-canonieke cursuscontent bestaande editorcontent mag overschrijven.",
    );
  }

  await syncCourseContentFromSource(supabase, aiLiteracyPreviewCourse, {
    overwriteExistingContent: true,
  });
  await syncCourseContentFromSource(supabase, aiProficiencyPreviewCourse, {
    overwriteExistingContent: true,
  });
  await syncCourseContentFromSource(supabase, aiMasteryPreviewCourse, {
    overwriteExistingContent: true,
  });
}

async function syncCourseContentFromSource(
  supabase: LearningSyncClient,
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
  supabase: LearningSyncClient,
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
  supabase: LearningSyncClient,
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
  supabase: LearningSyncClient,
  pages: Array<{ id: string; topic_id: string; sequence_order: number }>,
) {
  const tempBase = 10000;

  for (const [index, page] of pages.entries()) {
    const { error } = await supabase
      .from("learning_pages")
      .update({ sequence_order: tempBase + index + 1, updated_at: new Date().toISOString() })
      .eq("id", page.id);

    if (error) {
      throw new Error(`Tijdelijke paginavolgorde instellen is mislukt: ${error.message}`);
    }
  }
}

async function moveExtraPagesAfterSourcePages(
  supabase: LearningSyncClient,
  courseId: string,
  sourceCourse: LearningCourseView,
  topicIdByCode: Map<string, string>,
) {
  const sourcePageCodes = new Set(
    sourceCourse.topics.flatMap((topic) => topic.pages.map((page) => page.page_code)),
  );
  const sourcePagesByTopicId = new Map(
    sourceCourse.topics.map((topic) => [
      topicIdByCode.get(topic.topic_code),
      topic.pages.length,
    ]),
  );
  const { data: extraPages, error } = await supabase
    .from("learning_pages")
    .select("id, topic_id, page_code, sequence_order")
    .eq("course_id", courseId)
    .order("sequence_order", { ascending: true });

  if (error || !extraPages) {
    throw new Error(`Extra pagina's ophalen is mislukt: ${error?.message ?? "geen pagina's"}`);
  }

  const grouped = new Map<string, Array<{ id: string; topic_id: string; page_code: string; sequence_order: number }>>();
  for (const page of extraPages as Array<{ id: string; topic_id: string; page_code: string; sequence_order: number }>) {
    if (sourcePageCodes.has(page.page_code)) continue;

    const list = grouped.get(page.topic_id) ?? [];
    list.push(page);
    grouped.set(page.topic_id, list);
  }

  for (const [topicId, pages] of grouped.entries()) {
    const sourcePageCount = sourcePagesByTopicId.get(topicId) ?? 0;

    for (const [index, page] of pages.entries()) {
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
