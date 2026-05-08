import Link from "next/link";
import type {
  LearnerStateView,
  LearningCourseView,
} from "@/lib/learning-preview-data";

export function LessonList({
  course,
  learnerState,
}: {
  course: LearningCourseView;
  learnerState: LearnerStateView;
}) {
  return (
    <section>
      <h2>Programma</h2>
      <div className="lesson-list">
        {course.lessons.map((lesson) => (
          <article className="lesson-item" key={lesson.id}>
            <span className="lesson-index">{lesson.sequence_order}</span>
            <div>
              <h3>{lesson.title}</h3>
              {lesson.summary ? <p>{lesson.summary}</p> : null}
              <div className="pill-row">
                <span className="pill">
                  {lesson.estimated_duration_minutes ?? 0} min
                </span>
                <span className="pill">{lesson.lesson_type}</span>
                {lesson.is_required ? <span className="pill">verplicht</span> : null}
                <span className="pill">
                  {getLessonProgressLabel(
                    learnerState.progressByLessonId[lesson.id]?.status,
                  )}
                </span>
              </div>
            </div>
            <Link
              className="button button-secondary"
              href={`/learning/${course.course_code}/${lesson.lesson_code}`}
            >
              Open
            </Link>
          </article>
        ))}
      </div>
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
