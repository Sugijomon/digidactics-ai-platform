"use client";

import { useState } from "react";
import { useMemo } from "react";
import type { LearningAdminLessonSummary } from "@/lib/learning-admin-data";
import type { LearningCourseView } from "@/lib/learning-preview-data";

export function AddLessonDialog({
  action,
  course,
  lessons,
}: {
  action: (formData: FormData) => void | Promise<void>;
  course: LearningCourseView;
  lessons: LearningAdminLessonSummary[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0]?.id ?? "");
  const defaultTopic = course.topics[0];
  const hasLessons = lessons.length > 0;
  const filteredLessons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return lessons.filter((lesson) => {
      const matchesQuery =
        !normalizedQuery ||
        lesson.title.toLowerCase().includes(normalizedQuery) ||
        lesson.code.toLowerCase().includes(normalizedQuery) ||
        (lesson.summary ?? "").toLowerCase().includes(normalizedQuery);
      const matchesStatus = status === "all" || lesson.status === status;

      return matchesQuery && matchesStatus;
    });
  }, [lessons, query, status]);
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

  return (
    <>
      <button className="button button-primary" onClick={() => setIsOpen(true)} type="button">
        Lessen toevoegen
      </button>
      {isOpen ? (
        <div className="admin-dialog-backdrop" role="presentation">
          <section
            aria-labelledby="add-lesson-title"
            aria-modal="true"
            className="admin-dialog compact-dialog"
            role="dialog"
          >
            <header className="admin-dialog-header">
              <div>
                <h2 id="add-lesson-title">Lessen toevoegen</h2>
                <p>Kies een microlearning-template en plaats die als cursusles in een topic.</p>
              </div>
              <button
                aria-label="Sluiten"
                className="admin-dialog-close"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                x
              </button>
            </header>

            <form action={action} className="admin-dialog-form">
              <input name="courseId" type="hidden" value={course.id} />
              <input name="courseCode" type="hidden" value={course.course_code} />
              <input name="lessonId" type="hidden" value={selectedLessonId} />
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
              <div className="template-picker">
                <div className="template-picker-toolbar">
                  <label className="field">
                    <span>Zoeken</span>
                    <input
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Zoek op titel, code of omschrijving..."
                      value={query}
                    />
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select onChange={(event) => setStatus(event.target.value)} value={status}>
                      <option value="all">Alle statussen</option>
                      <option value="published">Gepubliceerd</option>
                      <option value="draft">Concept</option>
                    </select>
                  </label>
                </div>
                <div className="template-picker-meta">
                  <span>{filteredLessons.length} templates gevonden</span>
                  {selectedLesson ? <strong>Geselecteerd: {selectedLesson.title}</strong> : null}
                </div>
                <div className="template-card-list" aria-label="Microlearning templates">
                  {filteredLessons.map((lesson) => (
                    <button
                      aria-pressed={selectedLessonId === lesson.id}
                      className="template-card"
                      key={lesson.id}
                      onClick={() => setSelectedLessonId(lesson.id)}
                      type="button"
                    >
                      <span className="template-card-check" aria-hidden="true" />
                      <span>
                        <strong>{lesson.title}</strong>
                        <small>{lesson.summary ?? "Geen omschrijving ingesteld."}</small>
                      </span>
                      <span className="template-card-meta">
                        <span>{lesson.estimated_duration_minutes ?? "-"} min</span>
                        <span>{lesson.block_count} blokken</span>
                      </span>
                    </button>
                  ))}
                </div>
                {hasLessons && !filteredLessons.length ? (
                  <p className="admin-dialog-note">Geen templates gevonden met deze filters.</p>
                ) : null}
              </div>
              {!hasLessons ? (
                <p className="admin-dialog-note">
                  Maak eerst microlearning templates aan voordat je ze aan een cursus toevoegt.
                </p>
              ) : null}
              <footer className="admin-dialog-actions">
                <button
                  className="button button-secondary"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  Annuleren
                </button>
                <button
                  className="button button-primary"
                  disabled={!hasLessons || !selectedLessonId}
                  type="submit"
                >
                  Toevoegen
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
