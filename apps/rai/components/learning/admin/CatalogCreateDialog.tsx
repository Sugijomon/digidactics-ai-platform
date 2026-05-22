"use client";

import type { ReactNode } from "react";
import { useState } from "react";

export function NewCourseDialog({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="button button-primary" onClick={() => setIsOpen(true)} type="button">
        + Nieuwe cursus
      </button>
      {isOpen ? (
        <CatalogDialog
          description="Maak een cursus aan. Er wordt direct een starttopic toegevoegd, zodat je daarna pagina's kunt toevoegen."
          onClose={() => setIsOpen(false)}
          title="Nieuwe cursus"
        >
          <form action={action} className="admin-dialog-form">
            <label className="field">
              <span>Titel</span>
              <input name="title" placeholder="Bijv. AI Literacy Foundations" required />
            </label>
            <label className="field">
              <span>Course code</span>
              <input name="courseCode" placeholder="ai-literacy-foundations" required />
            </label>
            <label className="field">
              <span>Beschrijving</span>
              <textarea name="description" placeholder="Korte omschrijving van de cursus..." rows={4} />
            </label>
            <div className="editor-two-column">
              <label className="field">
                <span>Status</span>
                <select name="status" defaultValue="draft">
                  <option value="draft">Concept</option>
                  <option value="published">Gepubliceerd</option>
                </select>
              </label>
              <label className="field">
                <span>Slagingsnorm (%)</span>
                <input name="passingThreshold" defaultValue="80" min="0" max="100" type="number" />
              </label>
            </div>
            <label className="field">
              <span>Ontgrendelt capability</span>
              <input name="unlocksCapability" placeholder="routeai_usecase_check" />
            </label>
            <label className="field checkbox-field horizontal">
              <input name="requiredForOnboarding" type="checkbox" />
              <span>Verplicht voor onboarding</span>
            </label>
            <DialogActions onCancel={() => setIsOpen(false)} submitLabel="Cursus aanmaken" />
          </form>
        </CatalogDialog>
      ) : null}
    </>
  );
}

export function NewMicroLearningDialog({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="button button-primary" onClick={() => setIsOpen(true)} type="button">
        + Nieuwe micro-learning
      </button>
      {isOpen ? (
        <CatalogDialog
          description="Maak een standalone micro-learning template aan voor de RouteAI library."
          onClose={() => setIsOpen(false)}
          title="Nieuwe micro-learning"
        >
          <form action={action} className="admin-dialog-form">
            <label className="field">
              <span>Titel</span>
              <input name="title" placeholder="ML-001: Verification Gatekeeper" required />
            </label>
            <label className="field">
              <span>Lesson code</span>
              <input name="lessonCode" placeholder="ml-001-verification-gatekeeper" required />
            </label>
            <label className="field">
              <span>Samenvatting</span>
              <textarea name="summary" placeholder="Korte omschrijving van de micro-learning..." rows={4} />
            </label>
            <div className="editor-two-column">
              <label className="field">
                <span>Status</span>
                <select name="status" defaultValue="draft">
                  <option value="draft">Concept</option>
                  <option value="published">Gepubliceerd</option>
                </select>
              </label>
              <label className="field">
                <span>Duur</span>
                <input name="estimatedMinutes" defaultValue="8" min="1" type="number" />
              </label>
            </div>
            <DialogActions onCancel={() => setIsOpen(false)} submitLabel="Micro-learning aanmaken" />
          </form>
        </CatalogDialog>
      ) : null}
    </>
  );
}

function CatalogDialog({
  children,
  description,
  onClose,
  title,
}: {
  children: ReactNode;
  description: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="admin-dialog-backdrop" role="presentation">
      <section aria-labelledby="catalog-dialog-title" aria-modal="true" className="admin-dialog compact-dialog" role="dialog">
        <header className="admin-dialog-header">
          <div>
            <h2 id="catalog-dialog-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button aria-label="Sluiten" className="admin-dialog-close" onClick={onClose} type="button">
            x
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function DialogActions({
  onCancel,
  submitLabel,
}: {
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <footer className="admin-dialog-actions">
      <button className="button button-secondary" onClick={onCancel} type="button">
        Annuleren
      </button>
      <button className="button button-primary" type="submit">
        {submitLabel}
      </button>
    </footer>
  );
}
