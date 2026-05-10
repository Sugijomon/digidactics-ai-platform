import Link from "next/link";
import type {
  LearnerStateView,
  LearningCourseView,
} from "@/lib/learning-preview-data";
import { getCoursePages } from "@/lib/learning-preview-data";

export function LessonList({
  course,
  learnerState,
}: {
  course: LearningCourseView;
  learnerState: LearnerStateView;
}) {
  const pages = getCoursePages(course);

  return (
    <section>
      <h2>Programma</h2>
      <div className="topic-list">
        {course.topics.map((topic) => (
          <article className="topic-card" key={topic.id}>
            <div className="topic-card-header">
              <span className="lesson-index">{topic.sequence_order}</span>
              <div>
                <h3>{topic.title}</h3>
                {topic.summary ? <p>{topic.summary}</p> : null}
              </div>
              <span className="pill">{topic.pages.length} pagina's</span>
            </div>
            <div className="lesson-list compact">
              {topic.pages.map((page) => (
                <Link
                  className="page-row"
                  href={`/learning/${course.course_code}/${page.page_code}`}
                  key={page.id}
                >
                  <span>{page.title}</span>
                  <span className="muted">
                    {page.estimated_duration_minutes ?? 0} min ·{" "}
                    {getLessonProgressLabel(
                      learnerState.progressByPageId[page.id]?.status ??
                        learnerState.progressByLessonId[page.id]?.status,
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
      {pages.length === 0 ? (
        <p className="empty-state">Er zijn nog geen learning pagina's ingericht.</p>
      ) : null}
    </section>
  );
}

function getLessonProgressLabel(status?: string) {
  switch (status) {
    case "completed":
      return "afgerond";
    case "in_progress":
      return "bezig";
    default:
      return "nog niet gestart";
  }
}
