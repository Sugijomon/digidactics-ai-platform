import Link from "next/link";
import { notFound } from "next/navigation";
import { completeAiLiteracyPage } from "@/app/learning/actions";
import { CourseNavigator } from "@/components/learning/CourseNavigator";
import { LearningPageInteraction } from "@/components/learning/LearningPageInteraction";
import { getAiLiteracyPage, getLearnerState } from "@/lib/learning-data";
import { getCoursePages } from "@/lib/learning-preview-data";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseCode: string; lessonCode: string }>;
}) {
  const { courseCode, lessonCode } = await params;
  const { course, page } = await getAiLiteracyPage(lessonCode);
  const learnerState = await getLearnerState(course);

  if (course.course_code !== courseCode || !page) {
    notFound();
  }

  const pages = getCoursePages(course);
  const currentIndex = pages.findIndex((item) => item.page_code === page.page_code);
  const previousPage = pages[currentIndex - 1];
  const nextPage = pages[currentIndex + 1];
  const activeTopic =
    course.topics.find((topic) => topic.pages.some((topicPage) => topicPage.id === page.id)) ??
    course.topics[0];
  const topicPages = activeTopic?.pages ?? [];
  const topicPageIndex = topicPages.findIndex((topicPage) => topicPage.id === page.id);
  const topicCompletedCount = topicPages.filter((topicPage) => {
    const status =
      learnerState.progressByPageId[topicPage.id]?.status ??
      learnerState.progressByLessonId[topicPage.id]?.status;
    return status === "completed";
  }).length;
  const topicProgress =
    topicPages.length === 0 ? 0 : Math.round((topicCompletedCount / topicPages.length) * 100);
  const pageProgress =
    learnerState.progressByPageId[page.id] ??
    learnerState.progressByLessonId[page.id] ??
    null;
  const isCompleted = pageProgress?.status === "completed";

  return (
    <main className="lesson-player-shell">
      <div className="lesson-player-layout">
        <CourseNavigator
          activePage={page}
          course={course}
          learnerState={learnerState}
        />
        <section className="lesson-player-main">
          <header className="lesson-player-topbar">
            <div>
              <p className="eyebrow">Onderwerp</p>
              <h1>{activeTopic?.title ?? course.title}</h1>
            </div>
            <div className="topic-progress">
              <span>{topicProgress}%</span>
              <div className="learning-progress-track">
                <span style={{ width: `${topicProgress}%` }} />
              </div>
            </div>
          </header>

          <nav className="topic-tabs" aria-label="Pagina's binnen onderwerp">
            {topicPages.map((topicPage) => (
              <Link
                aria-current={topicPage.id === page.id ? "page" : undefined}
                className="topic-tab"
                href={`/learning/${course.course_code}/${topicPage.page_code}`}
                key={topicPage.id}
              >
                {topicPage.title}
              </Link>
            ))}
          </nav>

          <LearningPageInteraction
            action={completeAiLiteracyPage}
            course={course}
            isAuthenticated={learnerState.isAuthenticated}
            isCompleted={isCompleted}
            latestAttempt={learnerState.attemptsByPageId[page.id] ?? null}
            nextPageCode={nextPage?.page_code ?? ""}
            page={page}
            previousPageCode={previousPage?.page_code ?? ""}
            topicPageIndex={topicPageIndex}
            topicPageTotal={topicPages.length}
          />
        </section>
      </div>
    </main>
  );
}
