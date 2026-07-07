import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { completeAiLiteracyPage } from "@/app/learning/actions";
import { CourseNavigator } from "@/components/learning/CourseNavigator";
import { LearningPageInteraction } from "@/components/learning/LearningPageInteraction";
import { getAiLiteracyPage, getLearnerState } from "@/lib/learning-data";
import { getCoursePages, normalizeAiLiteracyPageCode } from "@/lib/learning-preview-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseCode: string; lessonCode: string }>;
}) {
  const { courseCode, lessonCode } = await params;
  const normalizedLessonCode = normalizeAiLiteracyPageCode(lessonCode);

  if (normalizedLessonCode !== lessonCode) {
    redirect(`/learning/${courseCode}/${normalizedLessonCode}`);
  }

  const coursePage = await getAiLiteracyPage(lessonCode, courseCode).catch(() => null);

  if (!coursePage) {
    notFound();
  }

  const { course, page } = coursePage;
  const learnerState = await getLearnerState(course);

  if (course.course_code !== courseCode || !page) {
    notFound();
  }

  const orderedPageEntries = course.topics.flatMap((topic) =>
    topic.pages.map((topicPage) => ({ page: topicPage, topic })),
  );
  const currentIndex = orderedPageEntries.findIndex(
    (entry) => entry.page.id === page.id || entry.page.page_code === page.page_code,
  );
  const previousPage = currentIndex > 0 ? orderedPageEntries[currentIndex - 1]?.page : undefined;
  const nextEntry =
    currentIndex >= 0 && currentIndex < orderedPageEntries.length - 1
      ? orderedPageEntries[currentIndex + 1]
      : undefined;
  const nextPage = nextEntry?.page;
  const activeTopic =
    course.topics.find((topic) => topic.pages.some((topicPage) => topicPage.id === page.id)) ??
    course.topics[0];
  const isTopicTransition = Boolean(
    nextEntry && activeTopic && nextEntry.topic.id !== activeTopic.id,
  );
  const topicPages = activeTopic?.pages ?? [];
  const topicPageIndex = topicPages.findIndex((topicPage) => topicPage.id === page.id);
  const modulePageIndex = currentIndex >= 0 ? currentIndex : 0;
  const modulePageTotal = orderedPageEntries.length;
  const pageProgress =
    learnerState.progressByPageId[page.id] ??
    learnerState.progressByLessonId[page.id] ??
    null;
  const isCompleted = pageProgress?.status === "completed";
  const pageProgressPercent = isCompleted ? 100 : 0;

  return (
    <main className="lesson-player">
      <CourseNavigator activePage={page} course={course} learnerState={learnerState} />

      <section className="player-content">
        <header className="player-topbar">
          <div className="player-topbar-center">
            <svg className="player-lesson-icon" aria-hidden="true" fill="none" viewBox="0 0 32 32">
              <path d="M5 7.5c3.5-1.2 7.2-.7 11 1.5v17c-3.8-2.2-7.5-2.7-11-1.5v-17Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
              <path d="M16 9c3.8-2.2 7.5-2.7 11-1.5v17c-3.5-1.2-7.2-.7-11 1.5V9Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
              <path d="M8 10.5c2-.3 3.8 0 5.5.8M8 13.7c2-.3 3.8 0 5.5.8M24 10.5c-2-.3-3.8 0-5.5.8M24 13.7c-2-.3-3.8 0-5.5.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.25" />
            </svg>
            <span className="player-lesson-name">{activeTopic?.title ?? page.title}</span>
          </div>

          <div className="player-topbar-right">
            <span className="player-time">~{page.estimated_duration_minutes ?? 0} min</span>
            <div className="player-progress-track">
              <div className="player-progress-fill" style={{ width: `${pageProgressPercent}%` }} />
            </div>
            <span className="player-progress-pct">{pageProgressPercent}%</span>
          </div>
        </header>

        <nav className="player-tabbar" aria-label="Lessen binnen dit onderwerp">
          {topicPages.map((topicPage) => {
            const topicPageProgress =
              learnerState.progressByPageId[topicPage.id] ??
              learnerState.progressByLessonId[topicPage.id] ??
              null;
            const topicPageDone = topicPageProgress?.status === "completed";
            const isActive = topicPage.id === page.id;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`player-tab ${topicPageDone ? "done" : ""}`}
                href={`/learning/${course.course_code}/${topicPage.page_code}`}
                key={topicPage.id}
              >
                {topicPage.title}
              </Link>
            );
          })}
        </nav>

        <div className="content-topic-label">
          <span className="content-topic-eyebrow">Onderwerp</span>
          <span className="content-topic-title">{activeTopic?.title ?? "Onderwerp"}</span>
        </div>

        <LearningPageInteraction
          action={completeAiLiteracyPage}
          course={course}
          isAuthenticated={learnerState.isAuthenticated}
          isCompleted={isCompleted}
          latestAttempt={learnerState.attemptsByPageId[page.id] ?? null}
          nextPageCode={nextPage?.page_code ?? ""}
          nextPageTitle={nextPage?.title ?? ""}
          nextTopicTitle={nextEntry?.topic.title ?? ""}
          page={page}
          previousPageCode={previousPage?.page_code ?? ""}
          isTopicTransition={isTopicTransition}
          topicPageIndex={modulePageIndex}
          topicPageTotal={modulePageTotal}
        />
      </section>
    </main>
  );
}
