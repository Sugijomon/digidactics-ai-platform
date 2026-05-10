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
  return (
    <aside className="learning-nav" aria-label="Cursusnavigatie">
      <div className="learning-nav-header">
        <p className="eyebrow">Cursus</p>
        <h2>{course.title}</h2>
      </div>
      <div className="topic-nav-list">
        {course.topics.map((topic) => (
          <section className="topic-nav-group" key={topic.id}>
            <h3>{topic.title}</h3>
            <div className="topic-page-links">
              {topic.pages.map((page) => {
                const status =
                  learnerState.progressByPageId[page.id]?.status ??
                  learnerState.progressByLessonId[page.id]?.status;

                return (
                  <Link
                    aria-current={page.id === activePage.id ? "page" : undefined}
                    className="topic-page-link"
                    href={`/learning/${course.course_code}/${page.page_code}`}
                    key={page.id}
                  >
                    <span>{page.title}</span>
                    <small>{getProgressSymbol(status)}</small>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <Link className="button button-secondary" href="/learning">
        Programma
      </Link>
    </aside>
  );
}

function getProgressSymbol(status?: string) {
  switch (status) {
    case "completed":
      return "Afgerond";
    case "in_progress":
      return "Bezig";
    default:
      return "Open";
  }
}
