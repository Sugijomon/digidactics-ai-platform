import Link from "next/link";
import { NewCourseDialog, NewMicroLearningDialog } from "@/components/learning/admin/CatalogCreateDialog";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { getLearningAdminOverview } from "@/lib/learning-admin-data";
import { createLearningCourse, createMicroLearning } from "../actions";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const overview = await getLearningAdminOverview();
  const publishedCourses = overview.courses.filter((course) => course.status === "published");
  const activeView = params?.view === "microlearnings" ? "microlearnings" : "courses";

  return (
    <ContentEditorShell active="courses">
      <div className="admin-page-header compact-header catalog-page-header">
        <div>
          <p className="breadcrumb">Content Editor / Cursussen</p>
          <h1>Content Editor</h1>
        </div>
        {activeView === "courses" ? (
          <NewCourseDialog action={createLearningCourse} />
        ) : (
          <NewMicroLearningDialog action={createMicroLearning} />
        )}
      </div>

      <CatalogTabs activeView={activeView} microLearningCount={overview.microLearnings.length} />

      {activeView === "courses" ? (
        <>
          <section className="catalog-summary-grid" aria-label="Cursusstatistieken">
            <StatCard label="Cursussen" value={String(overview.courses.length)} />
            <StatCard label="Micro-learnings" value={String(overview.microLearnings.length)} />
            <StatCard label="Gepubliceerd" value={String(publishedCourses.length)} />
          </section>
          <section className="admin-course-grid catalog-course-grid" aria-label="Cursussen">
            {overview.courses.map((course) => (
              <article className="admin-course-card" key={course.id}>
                <div className="admin-card-title-row">
                  <h2>{course.title}</h2>
                  <StatusBadge status={course.status} />
                </div>
                <p>{course.description ?? "Geen beschrijving ingesteld."}</p>
                <div className="admin-card-footer">
                  <span>
                    {course.page_count} {course.page_count === 1 ? "pagina" : "pagina's"}
                  </span>
                  <Link
                    className="button button-secondary"
                    href={`/learning/admin/courses/${course.course_code}`}
                  >
                    Cursus bewerken
                  </Link>
                </div>
              </article>
            ))}
          </section>
        </>
      ) : (
        <section className="catalog-table-section" aria-label="Micro-learnings">
          <div className="catalog-section-heading">
            <div>
              <h2>Micro-learnings</h2>
              <p>Standalone modules voor RouteAI risico- en activatiebibliotheek.</p>
            </div>
          </div>
          <div className="admin-table-card catalog-table-card">
            <table className="admin-data-table catalog-data-table">
              <thead>
                <tr>
                  <th>Titel</th>
                  <th>Cluster</th>
                  <th>Archetypen</th>
                  <th>Activatie-eis</th>
                  <th>Status</th>
                  <th>Actie</th>
                </tr>
              </thead>
              <tbody>
                {overview.microLearnings.map((lesson) => (
                  <tr key={lesson.id}>
                    <td>
                      <strong>{lesson.title}</strong>
                      <span>{lesson.summary ?? "Geen samenvatting ingesteld."}</span>
                    </td>
                    <td>-</td>
                    <td>-</td>
                    <td>Nee</td>
                    <td>
                      <StatusBadge status={lesson.status} />
                    </td>
                    <td>
                      <Link
                        className="button button-secondary"
                        href={`/learning/admin/microlearnings/${lesson.code}`}
                      >
                        Bewerken
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!overview.microLearnings.length ? (
              <p className="empty-state">Er zijn nog geen micro-learnings aangemaakt.</p>
            ) : null}
          </div>
        </section>
      )}
    </ContentEditorShell>
  );
}

function CatalogTabs({
  activeView,
  microLearningCount,
}: {
  activeView: "courses" | "microlearnings";
  microLearningCount: number;
}) {
  return (
    <div className="admin-tabs catalog-tabs">
      <Link aria-current={activeView === "courses" ? "page" : undefined} href="/learning/admin/courses">
        Cursussen
      </Link>
      <Link
        aria-current={activeView === "microlearnings" ? "page" : undefined}
        href="/learning/admin/courses?view=microlearnings"
      >
        Micro-learnings <strong>{microLearningCount}</strong>
      </Link>
    </div>
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
