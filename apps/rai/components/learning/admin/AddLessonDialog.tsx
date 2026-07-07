"use client";

import { useMemo, useState, useTransition } from "react";
import type { LearningAdminLessonSummary } from "@/lib/learning-admin-data";
import type { LearningCourseView, LearningTopicView } from "@/lib/learning-preview-data";

type LessonAction = (formData: FormData) => void | Promise<void>;
type AddLessonTab = "new" | "copy";

export function AddLessonDialog({
  copyAction,
  course,
  createAction,
  lessons,
  triggerLabel = "+ Les toevoegen",
  topic,
}: {
  copyAction: LessonAction;
  course: LearningCourseView;
  createAction: LessonAction;
  lessons: LearningAdminLessonSummary[];
  triggerLabel?: string;
  topic: LearningTopicView;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AddLessonTab>("new");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const currentCoursePageCodes = useMemo(
    () => new Set(course.topics.flatMap((courseTopic) => courseTopic.pages.map((page) => page.page_code))),
    [course.topics],
  );
  const filteredLessons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return lessons.filter((lesson) => {
      const matchesQuery =
        !normalizedQuery ||
        lesson.title.toLowerCase().includes(normalizedQuery) ||
        lesson.code.toLowerCase().includes(normalizedQuery);
      const matchesStatus = status === "all" || lesson.status === status;

      return matchesQuery && matchesStatus;
    });
  }, [lessons, query, status]);

  function close() {
    setIsOpen(false);
    setActiveTab("new");
    setSelectedLessonIds([]);
    setQuery("");
    setStatus("all");
  }

  function toggleLesson(lessonId: string) {
    setSelectedLessonIds((current) =>
      current.includes(lessonId)
        ? current.filter((id) => id !== lessonId)
        : [...current, lessonId],
    );
  }

  function copySelectedLessons() {
    startTransition(async () => {
      for (const lessonId of selectedLessonIds) {
        const lesson = lessons.find((item) => item.id === lessonId);
        if (!lesson) continue;
        const formData = baseFormData(course, topic);
        formData.set("lessonId", lesson.id);
        formData.set("sourceKind", lesson.kind);
        await copyAction(formData);
      }
      close();
    });
  }

  return (
    <>
      <button className="button button-primary" onClick={() => setIsOpen(true)} type="button">
        {triggerLabel}
      </button>
      {isOpen ? (
        <div className="admin-dialog-backdrop" role="presentation">
          <section
            aria-labelledby="add-lesson-title"
            aria-modal="true"
            className="admin-dialog add-lesson-dialog"
            role="dialog"
          >
            <header className="admin-dialog-header">
              <div>
                <h2 id="add-lesson-title">Les toevoegen</h2>
                <p>Voeg een nieuwe les toe of gebruik een bestaande als startpunt.</p>
              </div>
              <button
                aria-label="Sluiten"
                className="admin-dialog-close"
                onClick={close}
                type="button"
              >
                x
              </button>
            </header>

            <div className="add-lesson-tabs" role="tablist" aria-label="Les toevoegen">
              <button
                aria-selected={activeTab === "new"}
                onClick={() => setActiveTab("new")}
                role="tab"
                type="button"
              >
                Nieuwe les
              </button>
              <button
                aria-selected={activeTab === "copy"}
                onClick={() => setActiveTab("copy")}
                role="tab"
                type="button"
              >
                Bestaande les kopiëren
              </button>
            </div>

            {activeTab === "new" ? (
              <form action={createAction} className="admin-dialog-form add-lesson-form">
                <input name="courseId" type="hidden" value={course.id} />
                <input name="courseCode" type="hidden" value={course.course_code} />
                <input name="topicId" type="hidden" value={topic.id} />
                <label className="field">
                  <span>Titel</span>
                  <input name="title" placeholder="Bijv. AI in besluitvorming" required />
                </label>
                <label className="field">
                  <span>Type</span>
                  <select name="pageType" defaultValue="content">
                    <option value="content">content</option>
                    <option value="case">case</option>
                    <option value="question">question</option>
                    <option value="assessment">assessment</option>
                  </select>
                </label>
                <label className="field">
                  <span>Geschatte duur in minuten</span>
                  <input name="estimatedMinutes" defaultValue={5} min={1} type="number" />
                </label>
                <div className="readonly-topic">
                  <span>Topic</span>
                  <strong>{topic.title}</strong>
                </div>
                <footer className="admin-dialog-actions">
                  <button className="button button-secondary" onClick={close} type="button">
                    Annuleren
                  </button>
                  <button className="button button-primary" type="submit">
                    Les aanmaken
                  </button>
                </footer>
              </form>
            ) : (
              <div className="admin-dialog-form add-lesson-form">
                <div className="add-lesson-filter-row">
                  <label className="field">
                    <span>Zoeken</span>
                    <input
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Filter op titel..."
                      value={query}
                    />
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select onChange={(event) => setStatus(event.target.value)} value={status}>
                      <option value="all">Alle</option>
                      <option value="published">Gepubliceerd</option>
                      <option value="draft">Concept</option>
                    </select>
                  </label>
                </div>

                <div className="copy-lesson-list" aria-label="Bestaande lessen">
                  {filteredLessons.map((lesson) => {
                    const alreadyAdded =
                      lesson.kind === "course_page" && lesson.course_code === course.course_code
                        ? true
                        : currentCoursePageCodes.has(lesson.code);
                    const isSelected = selectedLessonIds.includes(lesson.id);

                    return (
                      <button
                        aria-pressed={isSelected}
                        className="copy-lesson-row"
                        disabled={alreadyAdded}
                        key={`${lesson.kind}-${lesson.id}`}
                        onClick={() => toggleLesson(lesson.id)}
                        type="button"
                      >
                        <input checked={isSelected} readOnly type="checkbox" />
                        <span>
                          <strong>
                            {lesson.title} {alreadyAdded ? <em>(al toegevoegd)</em> : null}
                          </strong>
                          <small>{lesson.estimated_duration_minutes ?? "-"} min</small>
                        </span>
                        <span className={`lesson-type-badge ${getLessonTypeClass(lesson.kind === "microlearning" ? "content" : lesson.kind)}`}>
                          {lesson.kind === "microlearning" ? "micro" : "les"}
                        </span>
                        <span className={`status-badge ${lesson.status === "published" ? "published" : ""}`}>
                          {lesson.status === "published" ? "Gepubliceerd" : "Concept"}
                        </span>
                      </button>
                    );
                  })}
                  {!filteredLessons.length ? (
                    <p className="admin-dialog-note">Geen lessen gevonden met deze filters.</p>
                  ) : null}
                </div>

                <div className="add-lesson-selection-count">
                  {selectedLessonIds.length} lessen geselecteerd
                </div>

                <footer className="admin-dialog-actions">
                  <button className="button button-secondary" onClick={close} type="button">
                    Annuleren
                  </button>
                  <button
                    className="button button-primary"
                    disabled={!selectedLessonIds.length || isPending}
                    onClick={copySelectedLessons}
                    type="button"
                  >
                    Toevoegen ({selectedLessonIds.length})
                  </button>
                </footer>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}

function baseFormData(course: LearningCourseView, topic: LearningTopicView) {
  const formData = new FormData();
  formData.set("courseId", course.id);
  formData.set("courseCode", course.course_code);
  formData.set("topicId", topic.id);
  return formData;
}

function getLessonTypeClass(pageType: string) {
  if (pageType === "case") return "type-case";
  if (pageType === "question" || pageType === "quiz") return "type-question";
  if (pageType === "assessment" || pageType === "exam") return "type-assessment";
  return "type-content";
}
