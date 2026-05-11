import Link from "next/link";
import type {
  LearnerStateView,
  LearningCourseView,
  LearningPageView,
} from "@/lib/learning-preview-data";

export function CourseNavigator({
  course,
  activePage,
  learnerState,
}: {
  course: LearningCourseView;
  activePage: LearningPageView;
  learnerState: LearnerStateView;
}) {
  const pages = course.topics.flatMap((topic) => topic.pages);
  const completedCount = pages.filter((page) => getPageStatus(page, learnerState) === "completed")
    .length;
  const progress = pages.length === 0 ? 0 : Math.round((completedCount / pages.length) * 100);

  return (
    <aside className="learning-nav" aria-label="Cursusnavigatie">
      <Link className="learning-back-link" href="/learning">
        Terug naar cursusoverzicht
      </Link>

      <div className="learning-nav-header">
        <h2>{course.title}</h2>
        <div className="learning-progress-meta">
          <span>Voortgang</span>
          <strong>{progress}%</strong>
        </div>
        <div className="learning-progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="topic-nav-list">
        {course.topics.map((topic) => {
          const topicCompletedCount = topic.pages.filter(
            (page) => getPageStatus(page, learnerState) === "completed",
          ).length;

          return (
            <section className="topic-nav-group" key={topic.id}>
              <div className="topic-nav-heading">
                <h3>{topic.title}</h3>
                <span>
                  {topicCompletedCount}/{topic.pages.length}
                </span>
              </div>
              <div className="topic-page-links">
                {topic.pages.map((page, pageIndex) => {
                  const status = getPageStatus(page, learnerState);

                  return (
                    <Link
                      aria-current={page.id === activePage.id ? "page" : undefined}
                      className="topic-page-link"
                      href={`/learning/${course.course_code}/${page.page_code}`}
                      key={page.id}
                    >
                      <small className={`page-status-dot ${status}`}>
                        {status === "not_started" ? pageIndex + 1 : ""}
                      </small>
                      <span>{page.title}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="learning-nav-footer">
        <span>AI Rijbewijs</span>
        <strong>
          {completedCount}/{pages.length} pagina's
        </strong>
      </div>
    </aside>
  );
}

function getPageStatus(page: LearningPageView, learnerState: LearnerStateView) {
  return (
    learnerState.progressByPageId[page.id]?.status ??
    learnerState.progressByLessonId[page.id]?.status ??
    "not_started"
  );
}
