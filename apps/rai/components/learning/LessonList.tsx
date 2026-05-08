import Link from "next/link";
import type { LearningCourseView } from "@/lib/learning-preview-data";

export function LessonList({ course }: { course: LearningCourseView }) {
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

