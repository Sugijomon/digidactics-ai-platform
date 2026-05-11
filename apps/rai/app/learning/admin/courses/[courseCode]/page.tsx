import Link from "next/link";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { getAdminCourse } from "@/lib/learning-admin-data";

export default async function AdminCourseEditorPage({
  params,
}: {
  params: Promise<{ courseCode: string }>;
}) {
  const { courseCode } = await params;
  const course = await getAdminCourse(courseCode);
  const pages = course.topics.flatMap((topic) => topic.pages);

  return (
    <ContentEditorShell active="courses">
      <div className="admin-page-header compact-header">
        <div>
          <p className="breadcrumb">Content Editor / Cursussen / {course.title}</p>
          <h1>Cursus Bewerken</h1>
        </div>
        <Link className="button button-secondary" href="/learning/admin">
          Terug
        </Link>
      </div>

      <div className="admin-split-layout">
        <section className="admin-table-card">
          <div className="admin-section-heading">
            <div>
              <h2>Lessen in Cursus</h2>
              <p>Voeg lessen toe en bepaal de volgorde. Gebruikers doorlopen de lessen in deze volgorde.</p>
            </div>
            <Link className="button button-primary" href="/learning/admin/lessons">
              Lessen toevoegen
            </Link>
          </div>

          <table className="admin-data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Les</th>
                <th>Verplicht</th>
                <th>Acties</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page, index) => (
                <tr key={page.id}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{page.title}</strong>
                    <span>{page.summary ?? "Geen samenvatting ingesteld."}</span>
                  </td>
                  <td>{page.is_required ? "Ja" : "Nee"}</td>
                  <td>
                    <Link href={`/learning/admin/lessons/${page.page_code}`}>Bewerken</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="admin-side-stack">
          <section className="admin-side-panel">
            <h2>Cursus Details</h2>
            <label className="field">
              <span>Titel</span>
              <input readOnly value={course.title} />
            </label>
            <label className="field">
              <span>Beschrijving</span>
              <textarea readOnly rows={5} value={course.description ?? ""} />
            </label>
            <label className="field checkbox-field horizontal-field">
              <span>Verplicht voor onboarding</span>
              <input checked={course.required_for_onboarding} readOnly type="checkbox" />
            </label>
            <label className="field">
              <span>Slagingsdrempel (%)</span>
              <input readOnly value={course.passing_threshold} />
            </label>
            <button className="button button-primary" disabled type="button">
              Wijzigingen opslaan
            </button>
          </section>

          <section className="admin-side-panel">
            <h2>Statistieken</h2>
            <div className="meta-list">
              <div className="meta-row">
                <span>Aantal lessen</span>
                <strong>{pages.length}</strong>
              </div>
              <div className="meta-row">
                <span>Verplichte lessen</span>
                <strong>{pages.filter((page) => page.is_required).length}</strong>
              </div>
              <div className="meta-row">
                <span>Status</span>
                <strong>Gepubliceerd</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </ContentEditorShell>
  );
}
