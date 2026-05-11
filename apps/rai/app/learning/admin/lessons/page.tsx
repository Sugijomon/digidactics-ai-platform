import Link from "next/link";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { getLearningAdminOverview } from "@/lib/learning-admin-data";

export default async function AdminLessonsPage() {
  const overview = await getLearningAdminOverview();
  const lessons = [...overview.lessons, ...overview.microLearnings];

  return (
    <ContentEditorShell active="lessons">
      <div className="admin-page-header compact-header">
        <div>
          <p className="breadcrumb">Admin / Lessen</p>
          <h1>Lessen</h1>
        </div>
        <button className="button button-primary" disabled type="button">
          Nieuwe Les
        </button>
      </div>

      <div className="admin-filter-row">
        <input placeholder="Zoek op lesnaam..." readOnly />
        <select defaultValue="all">
          <option value="all">Alle cursussen</option>
          {overview.courses.map((course) => (
            <option key={course.id} value={course.course_code}>
              {course.title}
            </option>
          ))}
        </select>
        <select defaultValue="all">
          <option value="all">Alle statussen</option>
          <option value="published">Gepubliceerd</option>
          <option value="draft">Concept</option>
        </select>
      </div>

      <section className="admin-table-card">
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
                  <small>{lesson.kind === "microlearning" ? "Micro-learning" : "Cursusles"}</small>
                </td>
                <td>{lesson.course_title ?? "Niet gekoppeld"}</td>
                <td>{lesson.estimated_duration_minutes ? `${lesson.estimated_duration_minutes} min` : "-"}</td>
                <td>
                  <span className={`status-badge ${lesson.status === "published" ? "published" : ""}`}>
                    {lesson.status === "published" ? "Gepubliceerd" : "Concept"}
                  </span>
                </td>
                <td>
                  {lesson.kind === "course_page" ? (
                    <Link href={`/learning/admin/lessons/${lesson.code}`}>Bewerken</Link>
                  ) : (
                    <span className="muted">Later</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </ContentEditorShell>
  );
}
