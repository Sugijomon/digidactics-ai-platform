import { ContentEditorShell } from "@/components/learning/admin/ContentEditorShell";
import { LessonsTable } from "@/components/learning/admin/LessonsTable";
import { getAdminCourse, getLearningAdminOverview } from "@/lib/learning-admin-data";
import { createLearningPage } from "../actions";

export default async function AdminLessonsPage() {
  const [overview, aiLiteracyCourse] = await Promise.all([
    getLearningAdminOverview(),
    getAdminCourse("ai-literacy-foundation"),
  ]);
  const lessons = [...overview.lessons, ...overview.microLearnings];
  const courseOptions = [
    {
      course: aiLiteracyCourse,
      topics: aiLiteracyCourse.topics,
    },
  ];

  return (
    <ContentEditorShell active="lessons">
      <div className="admin-page-header compact-header">
        <div>
          <p className="breadcrumb">Admin / Lessen</p>
          <h1>Lessen</h1>
        </div>
        <details className="admin-inline-details align-right">
          <summary className="button button-primary">Nieuwe les</summary>
          <form action={createLearningPage} className="admin-popover-form wide">
            <div className="admin-popover-heading">
              <h2>Nieuwe les aanmaken</h2>
              <p>Maak een cursusles aan. Daarna kun je direct contentblokken toevoegen.</p>
            </div>
            <label className="field">
              <span>Cursus / topic</span>
              <select name="target">
                {courseOptions.flatMap(({ course, topics }) =>
                  topics.map((topic) => (
                    <option
                      key={`${course.id}-${topic.id}`}
                      value={`${course.id}|${course.course_code}|${topic.id}`}
                    >
                      {course.title} / {topic.title}
                    </option>
                  )),
                )}
              </select>
            </label>
            <label className="field">
              <span>Titel</span>
              <input name="title" placeholder="Bijv. Wat is AI?" required />
            </label>
            <label className="field">
              <span>Page code</span>
              <input name="pageCode" placeholder="wat-is-ai" required />
            </label>
            <label className="field">
              <span>Beschrijving</span>
              <textarea name="summary" placeholder="Korte beschrijving van de les..." rows={3} />
            </label>
            <div className="editor-two-column">
              <label className="field">
                <span>Type</span>
                <select name="pageType" defaultValue="content">
                  <option value="content">Content</option>
                  <option value="video">Video</option>
                  <option value="question">Vraag</option>
                  <option value="case">Casus</option>
                  <option value="assessment">Assessment</option>
                </select>
              </label>
              <label className="field">
                <span>Duur</span>
                <input name="estimatedMinutes" defaultValue="15" type="number" />
              </label>
            </div>
            <input name="sequenceOrder" type="hidden" value={String(aiLiteracyCourse.pages.length + 1)} />
            <button className="button button-primary" type="submit">
              Aanmaken & bewerken
            </button>
          </form>
        </details>
      </div>

      <LessonsTable courses={overview.courses} lessons={lessons} />
    </ContentEditorShell>
  );
}
