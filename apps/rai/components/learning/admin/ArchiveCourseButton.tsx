"use client";

import { useState } from "react";

export function ArchiveCourseButton({
  action,
  courseCode,
  courseId,
  courseTitle,
}: {
  action: (formData: FormData) => void | Promise<void>;
  courseCode: string;
  courseId: string;
  courseTitle: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="button button-secondary button-compact danger-text"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Verwijderen
      </button>
      {isOpen ? (
        <div className="admin-dialog-backdrop" role="presentation">
          <section
            aria-labelledby={`archive-course-${courseId}`}
            aria-modal="true"
            className="admin-dialog compact-dialog"
            role="dialog"
          >
            <header className="admin-dialog-header">
              <div>
                <h2 id={`archive-course-${courseId}`}>Cursus archiveren?</h2>
                <p>
                  De cursus wordt uit het overzicht gehaald, maar voortgang,
                  certificaatsporen en auditdata blijven bewaard.
                </p>
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
              <input name="courseId" type="hidden" value={courseId} />
              <input name="courseCode" type="hidden" value={courseCode} />
              <div className="archive-confirm-card">
                <span>Cursus</span>
                <strong>{courseTitle}</strong>
                <small>{courseCode}</small>
              </div>
              <footer className="admin-dialog-actions">
                <button
                  className="button button-secondary"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  Annuleren
                </button>
                <button className="button button-primary danger-primary" type="submit">
                  Archiveren
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
