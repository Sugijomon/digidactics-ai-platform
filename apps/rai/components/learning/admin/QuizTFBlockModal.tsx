"use client";

import { useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

export function QuizTFBlockModal({
  blockNumber,
  initialAnswer = true,
  initialExplanation = "",
  initialMaxAttempts = 3,
  initialPoints = 10,
  initialQuestion = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialQuestion?: string;
  initialAnswer?: boolean;
  initialExplanation?: string;
  initialPoints?: number;
  initialMaxAttempts?: number;
  onClose: () => void;
  onSave: (data: {
    question: string;
    correct_answer: boolean;
    explanation?: string;
    points: number;
    max_attempts: number;
  }) => void;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState(initialAnswer);
  const [explanation, setExplanation] = useState(initialExplanation);
  const [points, setPoints] = useState(initialPoints);
  const [maxAttempts, setMaxAttempts] = useState(initialMaxAttempts);
  const [showValidation, setShowValidation] = useState(false);
  const canSave = Boolean(question.trim());

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      question: question.trim(),
      correct_answer: answer,
      explanation: explanation.trim() || undefined,
      points: Number(points) || 10,
      max_attempts: Math.max(1, Number(maxAttempts) || 1),
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Waar/Onwaar"
      description="Pas de inhoud van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Quiz - Waar/Onwaar Block"
    >
      <div className="modal-field">
        <label className="m-label" htmlFor="quiz-tf-question">
          Stelling <span className="m-label-opt">verplicht</span>
        </label>
        <textarea
          className={showValidation && !question.trim() ? "m-textarea m-input-error" : "m-textarea"}
          id="quiz-tf-question"
          onChange={(event) => {
            setQuestion(event.target.value);
            setShowValidation(false);
          }}
          placeholder="[Stelling die waar of onwaar is]"
          rows={3}
          value={question}
        />
        {showValidation && !question.trim() ? (
          <span className="field-error">Vul een stelling in.</span>
        ) : null}
      </div>

      <div className="modal-field">
        <span className="m-label">Correct antwoord</span>
        <div className="tf-toggle">
          <button
            className={answer === true ? "tf-btn tf-waar tf-active-waar" : "tf-btn tf-waar"}
            onClick={() => setAnswer(true)}
            type="button"
          >
            ✓ Waar
          </button>
          <button
            className={answer === false ? "tf-btn tf-onwaar tf-active-onwaar" : "tf-btn tf-onwaar"}
            onClick={() => setAnswer(false)}
            type="button"
          >
            ✕ Onwaar
          </button>
        </div>
      </div>

      <div className="explanation-box">
        <div className="explanation-box-label">
          💡 Uitleg na antwoord <span className="explanation-muted">(optioneel)</span>
        </div>
        <textarea
          onChange={(event) => setExplanation(event.target.value)}
          placeholder="Leg uit waarom de stelling waar/onwaar is..."
          value={explanation}
        />
      </div>

      <div className="modal-field">
        <span className="m-label">Quizinstellingen</span>
        <div className="quiz-settings">
          <div className="quiz-setting">
            <div className="quiz-setting-label">Punten</div>
            <input
              className="m-input"
              min={0}
              onChange={(event) => setPoints(Number(event.target.value))}
              type="number"
              value={points}
            />
          </div>
          <div className="quiz-setting">
            <div className="quiz-setting-label">Max. pogingen</div>
            <input
              className="m-input"
              min={1}
              onChange={(event) => setMaxAttempts(Number(event.target.value))}
              type="number"
              value={maxAttempts}
            />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
