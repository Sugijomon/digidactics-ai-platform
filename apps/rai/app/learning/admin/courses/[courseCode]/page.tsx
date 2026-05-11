import Link from "next/link";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { getAdminCourse, getLearningAdminOverview } from "@/lib/learning-admin-data";
import {
  addExistingLessonToCourse,
  archiveLearningPage,
  moveLearningPage,
  updateLearningCourseDetails,
} from "../../actions";

export default async function AdminCourseEditorPage({
  params,
}: {
  params: Promise<{ courseCode: string }>;
}) {
  const { courseCode } = await params;
  const [course, overview] = await Promise.all([
    getAdminCourse(courseCode),
    getLearningAdminOverview(),
  ]);
  const courseSummary = overview.courses.find((item) => item.course_code === course.course_code);
  const pages = course.topics.flatMap((topic) => topic.pages);
  const defaultTopic = course.topics[0];

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
            <details className="admin-inline-details">
              <summary className="button button-primary">Lessen toevoegen</summary>
              <form action={addExistingLessonToCourse} className="admin-popover-form">
                <input name="courseId" type="hidden" value={course.id} />
                <input name="courseCode" type="hidden" value={course.course_code} />
                <label className="field">
                  <span>Topic</span>
                  <select name="topicId" defaultValue={defaultTopic?.id}>
                    {course.topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Microlearning</span>
                  <select name="lessonId">
                    {overview.microLearnings.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button button-primary" type="submit">
                  Toevoegen
                </button>
              </form>
            </details>
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
                    <div className="table-actions">
                      <Link href={`/learning/admin/lessons/${page.page_code}`}>Bewerken</Link>
                      <form action={moveLearningPage}>
                        <input name="pageId" type="hidden" value={page.id} />
                        <input name="courseCode" type="hidden" value={course.course_code} />
                        <input name="direction" type="hidden" value="up" />
                        <button disabled={index === 0} type="submit" aria-label="Omhoog">
                          ^
                        </button>
                      </form>
                      <form action={moveLearningPage}>
                        <input name="pageId" type="hidden" value={page.id} />
                        <input name="courseCode" type="hidden" value={course.course_code} />
                        <input name="direction" type="hidden" value="down" />
                        <button disabled={index === pages.length - 1} type="submit" aria-label="Omlaag">
                          v
                        </button>
                      </form>
                      <form action={archiveLearningPage}>
                        <input name="pageId" type="hidden" value={page.id} />
                        <input name="courseCode" type="hidden" value={course.course_code} />
                        <button type="submit" aria-label="Verwijderen">
                          x
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="admin-side-stack">
          <form action={updateLearningCourseDetails} className="admin-side-panel">
            <h2>Cursus Details</h2>
            <input name="courseId" type="hidden" value={course.id} />
            <input name="courseCode" type="hidden" value={course.course_code} />
            <label className="field">
              <span>Titel</span>
              <input name="title" defaultValue={course.title} />
            </label>
            <label className="field">
              <span>Beschrijving</span>
              <textarea name="description" defaultValue={course.description ?? ""} rows={5} />
            </label>
            <label className="field">
              <span>Ontgrendelt capability</span>
              <input
                name="unlocksCapability"
                defaultValue={courseSummary?.unlocks_capability ?? "routeai_usecase_check"}
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select name="status" defaultValue={courseSummary?.status ?? "published"}>
                <option value="draft">Concept</option>
                <option value="published">Gepubliceerd</option>
              </select>
            </label>
            <label className="field checkbox-field horizontal-field">
              <span>Verplicht voor onboarding</span>
              <input
                defaultChecked={course.required_for_onboarding}
                name="requiredForOnboarding"
                type="checkbox"
              />
            </label>
            <label className="field">
              <span>Slagingsdrempel (%)</span>
              <input name="passingThreshold" defaultValue={course.passing_threshold} type="number" />
            </label>
            <button className="button button-primary" type="submit">
              Wijzigingen opslaan
            </button>
          </form>

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
