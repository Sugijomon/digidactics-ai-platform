"use client";

import { useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

type ProgressCheckSaveData = {
  question: string;
  scale: 3 | 5;
  label_low: string;
  label_high: string;
  show_labels: boolean;
};

export function ProgressCheckBlockModal({
  blockNumber,
  initialLabels,
  initialQuestion = "",
  initialScale = 5,
  initialShowLabels = true,
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialQuestion?: string;
  initialScale?: 3 | 5;
  initialLabels?: { low: string; high: string };
  initialShowLabels?: boolean;
  onClose: () => void;
  onSave: (data: ProgressCheckSaveData) => void;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [scale, setScale] = useState<3 | 5>(initialScale);
  const [labelLow, setLabelLow] = useState(initialLabels?.low ?? "Helemaal niet zeker");
  const [labelHigh, setLabelHigh] = useState(initialLabels?.high ?? "Volledig zeker");
  const [showLabels, setShowLabels] = useState(initialShowLabels);
  const [previewValue, setPreviewValue] = useState<number | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const canSave = Boolean(question.trim());

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      question: question.trim(),
      scale,
      label_low: labelLow.trim() || "Helemaal niet zeker",
      label_high: labelHigh.trim() || "Volledig zeker",
      show_labels: showLabels,
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Progress check"
      description="Pas de zelfbeoordelingsvraag van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Progress Check Block"
    >
      <div className="modal-field">
        <div className="m-label">Voorvertoning</div>
        <div className="progress-check-preview">
          <div className="progress-check-question">
            {question || <em className="empty">Zelfbeoordelingsvraag verschijnt hier...</em>}
          </div>
          <div className="star-row">
            {Array.from({ length: scale }).map((_, index) => (
              <button
                className={previewValue !== null && index < previewValue ? "star-btn filled" : "star-btn"}
                key={index}
                onClick={() => setPreviewValue(previewValue === index + 1 ? null : index + 1)}
                type="button"
              >
                *
              </button>
            ))}
          </div>
          {showLabels ? (
            <div className="star-labels">
              <span>{labelLow}</span>
              <span>{labelHigh}</span>
            </div>
          ) : null}
          {previewValue ? (
            <div className="star-feedback">
              Je hebt {previewValue} van de {scale} geselecteerd. <em>(Niet opgeslagen - dit is een preview)</em>
            </div>
          ) : null}
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="progress-check-question">
          Vraag <span className="m-label-opt">verplicht</span>
        </label>
        <textarea
          className={showValidation && !question.trim() ? "m-textarea m-input-error" : "m-textarea"}
          id="progress-check-question"
          onChange={(event) => {
            setQuestion(event.target.value);
            setShowValidation(false);
          }}
          placeholder={"Bijv. Hoe zeker ben je dat je de EU AI Act\nkunt uitleggen aan een collega?"}
          rows={2}
          value={question}
        />
        <p className="m-hint">Stel de vraag in de eerste persoon - hoe zeker BEN JE.</p>
      </div>

      <div className="modal-field">
        <div className="m-label">Aantal sterren</div>
        <div className="tone-pills">
          {([3, 5] as const).map((value) => (
            <button
              className={scale === value ? "tone-pill selected-info" : "tone-pill"}
              key={value}
              onClick={() => {
                setScale(value);
                setPreviewValue(null);
              }}
              type="button"
            >
              {"*".repeat(value)} {value} sterren
            </button>
          ))}
        </div>
        <p className="m-hint">5 sterren voor genuanceerde zelfbeoordeling, 3 sterren voor een snelle check.</p>
      </div>

      <div className="quiz-settings">
        <div className="quiz-setting">
          <div className="quiz-setting-label">Label laag (1 ster)</div>
          <input
            className="m-input"
            onChange={(event) => setLabelLow(event.target.value)}
            placeholder="Helemaal niet zeker"
            type="text"
            value={labelLow}
          />
        </div>
        <div className="quiz-setting">
          <div className="quiz-setting-label">Label hoog ({scale} sterren)</div>
          <input
            className="m-input"
            onChange={(event) => setLabelHigh(event.target.value)}
            placeholder="Volledig zeker"
            type="text"
            value={labelHigh}
          />
        </div>
      </div>

      <label className="toggle-row">
        <div className="toggle-switch">
          <input checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} type="checkbox" />
          <span className="toggle-track">
            <span className="toggle-thumb" />
          </span>
        </div>
        <span className="toggle-label">Labels tonen in de les</span>
      </label>

      <div className="review-notice">
        <span>i</span>
        <div>
          <strong>Geen goed of fout</strong>
          <p>
            De zelfbeoordeling heeft geen correct antwoord en telt niet mee voor de score. De uitkomst is zichtbaar in
            de leerling-analytics als gemiddeld zelfvertrouwen per onderwerp.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
