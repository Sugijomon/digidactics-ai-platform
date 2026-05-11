import Link from "next/link";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { getLearningAdminOverview } from "@/lib/learning-admin-data";

export default async function AdminCoursesPage() {
  const overview = await getLearningAdminOverview();
  const publishedCourses = overview.courses.filter((course) => course.status === "published");

  return (
    <ContentEditorShell active="courses">
      <div className="admin-page-header compact-header">
        <div>
          <p className="breadcrumb">Content Editor / Cursussen</p>
          <h1>Cursussen</h1>
        </div>
        <Link className="button button-primary" href="/learning">
          Learner bekijken
        </Link>
      </div>

      <div className="admin-tabs">
        <Link aria-current="page" href="/learning/admin/courses">
          Cursussen
        </Link>
        <Link href="/learning/admin/lessons">
          Micro-learnings <strong>{overview.microLearnings.length}</strong>
        </Link>
      </div>

      <section className="admin-stat-grid" aria-label="Cursusstatistieken">
        <StatCard label="Cursussen" value={String(overview.courses.length)} />
        <StatCard label="Lessen" value={String(overview.lessons.length)} />
        <StatCard label="Gepubliceerd" value={String(publishedCourses.length)} />
      </section>

      <section className="admin-course-grid" aria-label="Cursussen">
        {overview.courses.map((course) => (
          <article className="admin-course-card" key={course.id}>
            <div className="admin-card-title-row">
              <h2>{course.title}</h2>
              <StatusBadge status={course.status} />
            </div>
            <p>{course.description ?? "Geen beschrijving ingesteld."}</p>
            <div className="admin-card-footer">
              <span>
                {course.page_count} {course.page_count === 1 ? "les" : "lessen"}
              </span>
              <Link
                className="button button-secondary"
                href={`/learning/admin/courses/${course.course_code}`}
              >
                Bewerken
              </Link>
            </div>
          </article>
        ))}
      </section>
    </ContentEditorShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="admin-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge ${status === "published" ? "published" : ""}`}>
      {status === "published" ? "Gepubliceerd" : "Concept"}
    </span>
  );
}
