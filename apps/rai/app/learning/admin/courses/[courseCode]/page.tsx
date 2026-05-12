import Link from "next/link";
import { AddLessonDialog } from "@/components/learning/admin/AddLessonDialog";
import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { getAdminCourse, getLearningAdminOverview } from "@/lib/learning-admin-data";
import {
  addExistingLessonToCourse,
  archiveLearningPage,
  createLearningTopic,
  moveLearningPage,
  moveLearningPageToTopic,
  moveLearningTopic,
  toggleLearningPageRequired,
  updateLearningCourseDetails,
  updateLearningTopicDetails,
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
  const totalMinutes = pages.reduce(
    (sum, page) => sum + (page.estimated_duration_minutes ?? 0),
    0,
  );

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

      <section className="admin-table-card course-editor-hero">
        <div>
          <span className={`status-badge ${courseSummary?.status === "published" ? "published" : ""}`}>
            {courseSummary?.status === "published" ? "Gepubliceerd" : "Concept"}
          </span>
          <h2>{course.title}</h2>
          <p>{course.description ?? "Geen beschrijving ingesteld."}</p>
        </div>
        <div className="course-editor-metrics">
          <Metric label="Topics" value={String(course.topics.length)} />
          <Metric label="Lessen" value={String(pages.length)} />
          <Metric label="Duur" value={`${totalMinutes} min`} />
          <Metric label="Norm" value={`${course.passing_threshold}%`} />
        </div>
      </section>

      <section className="topic-summary-grid" aria-label="Topicoverzicht">
        {course.topics.map((topic) => {
          const topicPages = topic.pages;
          const topicMinutes = topicPages.reduce(
            (sum, page) => sum + (page.estimated_duration_minutes ?? 0),
            0,
          );

          return (
            <article className="topic-summary-card" key={topic.id}>
              <span>{topic.sequence_order}</span>
              <div>
                <h2>{topic.title}</h2>
                <p>{topic.summary ?? "Geen topicomschrijving ingesteld."}</p>
                <small>
                  {topicPages.length} lessen / {topicMinutes} min
                </small>
              </div>
            </article>
          );
        })}
      </section>

      <div className="admin-split-layout">
        <section className="admin-table-card">
          <div className="admin-section-heading">
            <div>
              <h2>Lessen in Cursus</h2>
              <p>Voeg lessen toe en bepaal de volgorde. Gebruikers doorlopen de lessen in deze volgorde.</p>
            </div>
            <AddLessonDialog
              action={addExistingLessonToCourse}
              course={course}
              lessons={overview.microLearnings}
            />
          </div>

          <table className="admin-data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Les</th>
                <th>Topic</th>
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
                    <small>
                      {page.page_type} / {page.estimated_duration_minutes ?? "-"} min
                    </small>
                  </td>
                  <td>
                    <form action={moveLearningPageToTopic} className="topic-move-form">
                      <input name="pageId" type="hidden" value={page.id} />
                      <input name="courseCode" type="hidden" value={course.course_code} />
                      <select
                        aria-label={`${page.title} naar topic verplaatsen`}
                        defaultValue={page.topic_id}
                        name="targetTopicId"
                      >
                        {course.topics.map((topic) => (
                          <option key={topic.id} value={topic.id}>
                            {topic.title}
                          </option>
                        ))}
                      </select>
                      <button type="submit">Verplaats</button>
                    </form>
                  </td>
                  <td>
                    <form action={toggleLearningPageRequired} className="required-toggle-form">
                      <input name="pageId" type="hidden" value={page.id} />
                      <input name="courseCode" type="hidden" value={course.course_code} />
                      <input name="isRequired" type="hidden" value={String(page.is_required)} />
                      <button
                        className={`status-badge button-badge ${page.is_required ? "published" : ""}`}
                        type="submit"
                      >
                        {page.is_required ? "Verplicht" : "Optioneel"}
                      </button>
                    </form>
                  </td>
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

          <section className="admin-side-panel topic-management-panel">
            <div>
              <h2>Topics beheren</h2>
              <p>Maak de cursusstructuur modulair: topics vormen de hoofdstukken waar lessen onder vallen.</p>
            </div>

            <form action={createLearningTopic} className="topic-create-form">
              <input name="courseId" type="hidden" value={course.id} />
              <input name="courseCode" type="hidden" value={course.course_code} />
              <label className="field">
                <span>Nieuw topic</span>
                <input name="title" placeholder="Bijv. AI Fundamentals" />
              </label>
              <label className="field">
                <span>Code</span>
                <input name="topicCode" placeholder="ai-fundamentals" />
              </label>
              <label className="field">
                <span>Samenvatting</span>
                <textarea name="summary" placeholder="Korte omschrijving van dit topic..." rows={3} />
              </label>
              <button className="button button-primary" type="submit">
                Topic toevoegen
              </button>
            </form>

            <div className="topic-management-list">
              {course.topics.map((topic, index) => (
                <article className="topic-management-card" key={topic.id}>
                  <form action={updateLearningTopicDetails} className="topic-update-form">
                    <input name="topicId" type="hidden" value={topic.id} />
                    <input name="courseCode" type="hidden" value={course.course_code} />
                    <div className="topic-management-card-header">
                      <span>{topic.sequence_order}</span>
                      <strong>{topic.pages.length} lessen</strong>
                    </div>
                    <label className="field">
                      <span>Titel</span>
                      <input name="title" defaultValue={topic.title} />
                    </label>
                    <label className="field">
                      <span>Samenvatting</span>
                      <textarea name="summary" defaultValue={topic.summary ?? ""} rows={3} />
                    </label>
                    <label className="field checkbox-field horizontal-field">
                      <span>Verplicht topic</span>
                      <input defaultChecked={topic.is_required} name="isRequired" type="checkbox" />
                    </label>
                    <button className="button button-secondary" type="submit">
                      Topic opslaan
                    </button>
                  </form>

                  <div className="topic-order-actions" aria-label={`${topic.title} volgorde`}>
                    <form action={moveLearningTopic}>
                      <input name="topicId" type="hidden" value={topic.id} />
                      <input name="courseCode" type="hidden" value={course.course_code} />
                      <input name="direction" type="hidden" value="up" />
                      <button disabled={index === 0} type="submit">
                        Omhoog
                      </button>
                    </form>
                    <form action={moveLearningTopic}>
                      <input name="topicId" type="hidden" value={topic.id} />
                      <input name="courseCode" type="hidden" value={course.course_code} />
                      <input name="direction" type="hidden" value="down" />
                      <button disabled={index === course.topics.length - 1} type="submit">
                        Omlaag
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
