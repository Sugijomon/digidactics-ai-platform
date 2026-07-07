import Link from "next/link";
import type { LearningAdminCourseSummary, LearningAdminLessonSummary } from "@/lib/learning-admin-data";

export function LessonsTable({
  courses,
  lessons,
}: {
  courses: LearningAdminCourseSummary[];
  lessons: LearningAdminLessonSummary[];
}) {
  const courseCount = courses.length;

  return (
    <section className="admin-table-card">
      <div className="admin-table-meta">
        <span>
          {lessons.length} lessen en micro-learnings beschikbaar vanuit {courseCount}{" "}
          {courseCount === 1 ? "cursus" : "cursussen"}.
        </span>
      </div>
      <table className="admin-data-table lesson-table">
        <thead>
          <tr>
            <th>Titel</th>
            <th>Gebruikt in</th>
            <th>Duur</th>
            <th>Status</th>
            <th>Acties</th>
          </tr>
        </thead>
        <tbody>
          {lessons.map((lesson) => (
            <tr key={`${lesson.kind}-${lesson.id}`}>
              <td>
                <strong>{lesson.title}</strong>
                <span>{lesson.summary ?? "Geen samenvatting ingesteld."}</span>
                <small>{lesson.kind === "microlearning" ? "Micro-learning" : "Cursuspagina"}</small>
              </td>
              <td>
                <strong>{lesson.course_title ?? "Niet gekoppeld"}</strong>
                {lesson.course_code ? <small>{lesson.course_code}</small> : null}
              </td>
              <td>{lesson.estimated_duration_minutes ? `${lesson.estimated_duration_minutes} min` : "-"}</td>
              <td>
                <span className={`status-badge ${lesson.status === "published" ? "published" : ""}`}>
                  {lesson.status === "published" ? "Gepubliceerd" : "Concept"}
                </span>
              </td>
              <td>
                {lesson.kind === "course_page" ? (
                  <Link
                    href={
                      lesson.course_code
                        ? `/learning/admin/lessons/${lesson.code}?courseCode=${lesson.course_code}&pageId=${lesson.id}`
                        : `/learning/admin/lessons/${lesson.code}`
                    }
                  >
                    Bewerken
                  </Link>
                ) : (
                  <span className="muted">Template</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!lessons.length ? <p className="empty-state">Er zijn nog geen lessen aangemaakt.</p> : null}
    </section>
  );
}
