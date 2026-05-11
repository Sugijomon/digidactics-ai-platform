"use client";

import { useState } from "react";
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
  const defaultTopic = course.topics[0];
  const hasLessons = lessons.length > 0;

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
                <span>Microlearning-template</span>
                <select name="lessonId" disabled={!hasLessons}>
                  {hasLessons ? (
                    lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </option>
                    ))
                  ) : (
                    <option value="">Geen microlearnings beschikbaar</option>
                  )}
                </select>
              </label>
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
                <button className="button button-primary" disabled={!hasLessons} type="submit">
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
