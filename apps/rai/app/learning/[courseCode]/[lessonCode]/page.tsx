import Link from "next/link";
import { notFound } from "next/navigation";
import { completeAiLiteracyPage } from "@/app/learning/actions";
import { CourseNavigator } from "@/components/learning/CourseNavigator";
import { LessonBlockRenderer } from "@/components/learning/LessonBlockRenderer";
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

          <form action={completeAiLiteracyPage} className="lesson-player-form">
            <input name="courseId" type="hidden" value={course.id} />
            <input name="courseCode" type="hidden" value={course.course_code} />
            <input name="pageId" type="hidden" value={page.id} />
            <input name="pageCode" type="hidden" value={page.page_code} />
            <input name="nextPageCode" type="hidden" value={nextPage?.page_code ?? ""} />

            <article className="lesson-shell page-canvas">
              {page.content.blocks.map((block) => (
                <LessonBlockRenderer block={block} key={block.id} />
              ))}
            </article>

            <nav className="lesson-completion-bar" aria-label="Pagina voortgang">
              {previousPage ? (
                <Link
                  className="button button-secondary"
                  href={`/learning/${course.course_code}/${previousPage.page_code}`}
                >
                  Vorige
                </Link>
              ) : (
                <span />
              )}
              <span className="lesson-position">
                Pagina {topicPageIndex + 1} van {topicPages.length}
              </span>
              {isCompleted && nextPage ? (
                <Link
                  className="button button-primary"
                  href={`/learning/${course.course_code}/${nextPage.page_code}`}
                >
                  Volgende
                </Link>
              ) : isCompleted ? (
                <Link className="button button-primary" href="/learning">
                  Terug naar cursus
                </Link>
              ) : learnerState.isAuthenticated ? (
                <button className="button button-primary" type="submit">
                  {nextPage ? "Afronden" : "Cursus afronden"}
                </button>
              ) : (
                <span className="button button-secondary">Login vereist</span>
              )}
            </nav>
          </form>
        </section>
      </div>
    </main>
  );
}
