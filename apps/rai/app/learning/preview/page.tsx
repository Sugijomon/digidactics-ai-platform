import Link from "next/link";
import {
  aiLiteracyPreviewCourse,
  aiMasteryPreviewCourse,
  aiProficiencyPreviewCourse,
  getCoursePages,
  type LearningCourseView,
  type LearningPageView,
  type LearningTopicView,
} from "@/lib/learning-preview-data";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PreviewCourse extends LearningCourseView {
  status: string;
  source: "supabase-admin" | "repo-preview";
}

interface CourseRow {
  id: string;
  course_code: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  difficulty_level: string | null;
  status: string;
  required_for_onboarding: boolean;
  passing_threshold: number;
}

interface TopicRow {
  id: string;
  course_id: string;
  topic_code: string;
  title: string;
  summary: string | null;
  status: string;
  sequence_order: number;
  is_required: boolean;
}

interface PageRow {
  id: string;
  course_id: string;
  topic_id: string;
  page_code: string;
  title: string;
  summary: string | null;
  page_type: string;
  status: string;
  estimated_duration_minutes: number | null;
  sequence_order: number;
  is_required: boolean;
  content: unknown;
}

export default async function LearningPreviewIndexPage() {
  const { courses, sourceNote } = await getPreviewIndexCourses();
  const totals = courses.reduce(
    (acc, course) => {
      const pages = getCoursePages(course);
      acc.topics += course.topics.length;
      acc.pages += pages.length;
      acc.minutes += pages.reduce((sum, page) => sum + (page.estimated_duration_minutes ?? 0), 0);
      return acc;
    },
    { topics: 0, pages: 0, minutes: 0 },
  );

  return (
    <main className="learning-preview-index">
      <header className="learning-preview-hero">
        <div>
          <p>Learning Preview Index</p>
          <h1>Alle cursussen en lespagina&apos;s</h1>
          <span>{sourceNote}</span>
        </div>
        <div className="learning-preview-kpis" aria-label="Content totalen">
          <PreviewMetric label="Cursussen" value={String(courses.length)} />
          <PreviewMetric label="Onderwerpen" value={String(totals.topics)} />
          <PreviewMetric label="Lespagina's" value={String(totals.pages)} />
          <PreviewMetric label="Minuten" value={String(totals.minutes)} />
        </div>
      </header>

      <section className="learning-preview-note">
        <strong>Gebruik</strong>
        <p>
          Open vanaf hier de publieke cursuspagina, de lesson player of de editor. Conceptcontent is alleen
          volledig browser-onafhankelijk zichtbaar wanneer de lokale server een Supabase service role key heeft.
        </p>
      </section>

      <section className="learning-preview-course-list" aria-label="Cursussen en lespagina's">
        {courses.map((course) => (
          <CoursePreviewCard course={course} key={course.id} />
        ))}
      </section>
    </main>
  );
}

function CoursePreviewCard({ course }: { course: PreviewCourse }) {
  const pages = getCoursePages(course);
  const minutes = pages.reduce((sum, page) => sum + (page.estimated_duration_minutes ?? 0), 0);
  const firstPage = pages[0] ?? null;

  return (
    <article className="learning-preview-course">
      <div className="learning-preview-course-head">
        <div>
          <div className="learning-preview-badges">
            <span className={course.status === "published" ? "is-published" : "is-draft"}>
              {course.status === "published" ? "Gepubliceerd" : "Concept"}
            </span>
            <span>{course.source === "supabase-admin" ? "Supabase" : "Repo preview"}</span>
            <span>{course.required_for_onboarding ? "Verplicht" : "Optioneel"}</span>
          </div>
          <h2>{course.title}</h2>
          <p>{course.description ?? course.subtitle ?? "Geen beschrijving ingesteld."}</p>
        </div>
        <div className="learning-preview-actions">
          <Link href={`/learning/${course.course_code}`}>Open cursus</Link>
          {firstPage ? (
            <Link href={`/learning/${course.course_code}/${firstPage.page_code}`}>Start player</Link>
          ) : null}
          <Link href={`/learning/admin/courses/${course.course_code}`}>Bewerk cursus</Link>
        </div>
      </div>

      <div className="learning-preview-course-meta">
        <span>{course.topics.length} onderwerpen</span>
        <span>{pages.length} lespagina&apos;s</span>
        <span>{minutes} min</span>
        <span>{course.passing_threshold}% norm</span>
      </div>

      <div className="learning-preview-topics">
        {course.topics.map((topic) => (
          <TopicPreview course={course} key={topic.id} topic={topic} />
        ))}
      </div>
    </article>
  );
}

function TopicPreview({
  course,
  topic,
}: {
  course: PreviewCourse;
  topic: LearningTopicView;
}) {
  return (
    <details className="learning-preview-topic" open>
      <summary>
        <strong>{topic.title}</strong>
        <span>{topic.pages.length} pagina&apos;s</span>
      </summary>
      <div className="learning-preview-pages">
        {topic.pages.map((page) => (
          <PagePreview course={course} key={page.id} page={page} />
        ))}
      </div>
    </details>
  );
}

function PagePreview({
  course,
  page,
}: {
  course: PreviewCourse;
  page: LearningPageView;
}) {
  const blockCount = page.content.blocks.length;

  return (
    <div className="learning-preview-page-row">
      <div>
        <strong>{page.title}</strong>
        <span>
          {page.page_code} · {page.page_type} · {page.estimated_duration_minutes ?? 0} min · {blockCount} blocks
        </span>
      </div>
      <div>
        <Link href={`/learning/${course.course_code}/${page.page_code}`}>Player</Link>
        <Link href={`/learning/admin/lessons/${page.page_code}`}>Editor</Link>
      </div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

async function getPreviewIndexCourses(): Promise<{ courses: PreviewCourse[]; sourceNote: string }> {
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const adminResult = await getPreviewIndexCoursesFromSupabase(
      supabase,
      "Bron: Supabase admin-data. Concepten en gepubliceerde cursussen staan hier samen.",
    );

    if (adminResult) {
      return adminResult;
    }
  }

  const sessionSupabase = await getSupabaseServerClient();

  if (sessionSupabase) {
    const sessionResult = await getPreviewIndexCoursesFromSupabase(
      sessionSupabase,
      "Bron: jouw browser-sessie. Log in als content editor om conceptcursussen in deze browser te zien.",
    );

    if (sessionResult) {
      return sessionResult;
    }
  }

  return {
    courses: getRepoPreviewCourses(),
    sourceNote: "Bron: repo-previewdata. Voeg SUPABASE_SERVICE_ROLE_KEY toe om ook live conceptcursussen browser-onafhankelijk te tonen.",
  };
}

async function getPreviewIndexCoursesFromSupabase(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>> | NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>,
  sourceNote: string,
): Promise<{ courses: PreviewCourse[]; sourceNote: string } | null> {
  const { data: courseRows, error: courseError } = await supabase
    .from("learning_courses")
    .select(
      "id, course_code, title, subtitle, description, difficulty_level, status, required_for_onboarding, passing_threshold",
    )
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (courseError || !courseRows?.length) {
    return null;
  }

  const courseIds = (courseRows as CourseRow[]).map((course) => course.id);
  const [{ data: topicRows }, { data: pageRows }] = await Promise.all([
    supabase
      .from("learning_topics")
      .select("id, course_id, topic_code, title, summary, status, sequence_order, is_required")
      .in("course_id", courseIds)
      .neq("status", "archived")
      .order("sequence_order", { ascending: true }),
    supabase
      .from("learning_pages")
      .select(
        "id, course_id, topic_id, page_code, title, summary, page_type, status, estimated_duration_minutes, sequence_order, is_required, content",
      )
      .in("course_id", courseIds)
      .neq("status", "archived")
      .order("sequence_order", { ascending: true }),
  ]);

  const pagesByTopicId = new Map<string, LearningPageView[]>();
  for (const page of (pageRows ?? []) as PageRow[]) {
    const content = normalizeContent(page.content);
    const pages = pagesByTopicId.get(page.topic_id) ?? [];
    pages.push({
      id: page.id,
      page_code: page.page_code,
      topic_id: page.topic_id,
      title: page.title,
      summary: page.summary,
      page_type: page.page_type,
      status: page.status,
      estimated_duration_minutes: page.estimated_duration_minutes,
      sequence_order: page.sequence_order,
      is_required: page.is_required,
      content,
    });
    pagesByTopicId.set(page.topic_id, pages);
  }

  const topicsByCourseId = new Map<string, LearningTopicView[]>();
  for (const topic of (topicRows ?? []) as TopicRow[]) {
    const topics = topicsByCourseId.get(topic.course_id) ?? [];
    topics.push({
      id: topic.id,
      topic_code: topic.topic_code,
      title: topic.title,
      summary: topic.summary,
      sequence_order: topic.sequence_order,
      is_required: topic.is_required,
      pages: pagesByTopicId.get(topic.id) ?? [],
    });
    topicsByCourseId.set(topic.course_id, topics);
  }

  return {
    courses: (courseRows as CourseRow[]).map((course) => {
      const topics = topicsByCourseId.get(course.id) ?? [];

      return {
        id: course.id,
        course_code: course.course_code,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        difficulty_level: course.difficulty_level ?? "foundation",
        required_for_onboarding: course.required_for_onboarding,
        passing_threshold: course.passing_threshold,
        status: course.status,
        source: "supabase-admin",
        topics,
        pages: topics.flatMap((topic) => topic.pages),
      };
    }),
    sourceNote,
  };
}

function getRepoPreviewCourses(): PreviewCourse[] {
  return [aiLiteracyPreviewCourse, aiProficiencyPreviewCourse, aiMasteryPreviewCourse].map((course) => ({
    ...course,
    status: "published",
    source: "repo-preview",
  }));
}

function normalizeContent(content: unknown): { version: number; blocks: LearningPageView["content"]["blocks"] } {
  if (
    content &&
    typeof content === "object" &&
    "blocks" in content &&
    Array.isArray((content as { blocks?: unknown }).blocks)
  ) {
    return content as { version: number; blocks: LearningPageView["content"]["blocks"] };
  }

  return { version: 1, blocks: [] };
}
