"use client";

import { useState } from "react";
import type { LearningCourseView } from "@/lib/learning-preview-data";

export function NewLessonDialog({
  courseOptions,
  createAction,
  nextSequenceOrder,
}: {
  courseOptions: Array<{ course: LearningCourseView; topics: LearningCourseView["topics"] }>;
  createAction: (formData: FormData) => void | Promise<void>;
  nextSequenceOrder: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="button button-primary" onClick={() => setIsOpen(true)} type="button">
        Nieuwe les
      </button>
      {isOpen ? (
        <div className="admin-dialog-backdrop" role="presentation">
          <section
            aria-labelledby="new-lesson-title"
            aria-modal="true"
            className="admin-dialog"
            role="dialog"
          >
            <header className="admin-dialog-header">
              <div>
                <h2 id="new-lesson-title">Nieuwe les aanmaken</h2>
                <p>Maak een cursusles aan. Daarna kun je direct contentblokken toevoegen.</p>
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

            <form action={createAction} className="admin-dialog-form">
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
              <input name="sequenceOrder" type="hidden" value={String(nextSequenceOrder)} />
              <footer className="admin-dialog-actions">
                <button
                  className="button button-secondary"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  Annuleren
                </button>
                <button className="button button-primary" type="submit">
                  Aanmaken & bewerken
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
