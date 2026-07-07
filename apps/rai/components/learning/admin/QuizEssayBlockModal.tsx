"use client";

import { useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

type QuizEssaySaveData = {
  question: string;
  min_words?: number;
  max_words?: number;
  placeholder?: string;
  points: number;
};

export function QuizEssayBlockModal({
  blockNumber,
  initialMaxWords,
  initialMinWords,
  initialPlaceholder = "Schrijf hier je antwoord...",
  initialPoints = 20,
  initialQuestion = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialQuestion?: string;
  initialMinWords?: number;
  initialMaxWords?: number;
  initialPlaceholder?: string;
  initialPoints?: number;
  onClose: () => void;
  onSave: (data: QuizEssaySaveData) => void;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [minWords, setMinWords] = useState<number | undefined>(initialMinWords ?? undefined);
  const [maxWords, setMaxWords] = useState<number | undefined>(initialMaxWords ?? undefined);
  const [placeholder, setPlaceholder] = useState(initialPlaceholder);
  const [points, setPoints] = useState(initialPoints);
  const [showValidation, setShowValidation] = useState(false);

  const canSave = Boolean(question.trim());

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      question: question.trim(),
      min_words: minWords,
      max_words: maxWords,
      placeholder: placeholder.trim() || undefined,
      points: Number(points) || 20,
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Essay"
      description="Pas de inhoud van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Quiz - Essay Block"
    >
      <div className="modal-field">
        <label className="m-label" htmlFor="quiz-essay-question">
          Vraag <span className="m-label-opt">verplicht</span>
        </label>
        <textarea
          className={showValidation && !question.trim() ? "m-textarea m-input-error" : "m-textarea"}
          id="quiz-essay-question"
          onChange={(event) => {
            setQuestion(event.target.value);
            setShowValidation(false);
          }}
          placeholder="Beschrijf in je eigen woorden..."
          rows={3}
          value={question}
        />
        <p className="m-hint" style={{ color: "var(--brand)", fontWeight: 500 }}>
          Essay vragen worden handmatig beoordeeld.
        </p>
      </div>

      <div className="quiz-settings">
        <div className="quiz-setting">
          <div className="quiz-setting-label">Minimum woorden</div>
          <input
            className="m-input"
            min="0"
            onChange={(event) => setMinWords(event.target.value ? Number(event.target.value) : undefined)}
            placeholder="Geen minimum"
            type="number"
            value={minWords ?? ""}
          />
        </div>
        <div className="quiz-setting">
          <div className="quiz-setting-label">Maximum woorden</div>
          <input
            className="m-input"
            min="0"
            onChange={(event) => setMaxWords(event.target.value ? Number(event.target.value) : undefined)}
            placeholder="Geen maximum"
            type="number"
            value={maxWords ?? ""}
          />
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="quiz-essay-placeholder">
          Placeholder tekst <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="quiz-essay-placeholder"
          onChange={(event) => setPlaceholder(event.target.value)}
          placeholder="Schrijf hier je antwoord..."
          type="text"
          value={placeholder}
        />
        <p className="m-hint">Grijze tekst in het antwoordveld van de learner.</p>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="quiz-essay-points">
          Punten
        </label>
        <input
          className="m-input"
          id="quiz-essay-points"
          min="0"
          onChange={(event) => setPoints(Number(event.target.value))}
          type="number"
          value={points}
        />
        <p className="m-hint">Punten worden toegekend na handmatige beoordeling.</p>
      </div>

      <div className="review-notice">
        <span>👁</span>
        <div>
          <strong>Handmatige review vereist</strong>
          <p>
            Dit antwoord verschijnt in de review-wachtrij voor een content editor voordat het wordt goedgekeurd.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
