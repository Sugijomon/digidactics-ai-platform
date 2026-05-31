"use client";

import { useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

type QuizFillSaveData = {
  question: string;
  correct_answer: string;
  alternative_answers: string[];
  case_sensitive: boolean;
  placeholder?: string;
  explanation?: string;
  points: number;
  max_attempts: number;
};

export function QuizFillBlockModal({
  blockNumber,
  initialAlternatives,
  initialAnswer = "",
  initialCaseSensitive = false,
  initialExplanation = "",
  initialMaxAttempts = 3,
  initialPlaceholder = "Vul hier je antwoord in...",
  initialPoints = 10,
  initialQuestion = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialQuestion?: string;
  initialAnswer?: string;
  initialAlternatives?: string[];
  initialCaseSensitive?: boolean;
  initialPlaceholder?: string;
  initialExplanation?: string;
  initialPoints?: number;
  initialMaxAttempts?: number;
  onClose: () => void;
  onSave: (data: QuizFillSaveData) => void;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState(initialAnswer);
  const [alternatives, setAlternatives] = useState(initialAlternatives?.join("\n") ?? "");
  const [caseSensitive, setCaseSensitive] = useState(initialCaseSensitive);
  const [placeholder, setPlaceholder] = useState(initialPlaceholder);
  const [explanation, setExplanation] = useState(initialExplanation);
  const [points, setPoints] = useState(initialPoints);
  const [maxAttempts, setMaxAttempts] = useState(initialMaxAttempts);
  const [showValidation, setShowValidation] = useState(false);

  const canSave = Boolean(question.trim()) && Boolean(answer.trim());

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      question: question.trim(),
      correct_answer: answer.trim(),
      alternative_answers: alternatives
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      case_sensitive: caseSensitive,
      placeholder: placeholder.trim() || undefined,
      explanation: explanation.trim() || undefined,
      points: Number(points) || 10,
      max_attempts: Math.max(1, Number(maxAttempts) || 1),
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Invulvraag"
      description="Pas de inhoud van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Quiz - Invulvraag Block"
    >
      <div className="modal-field">
        <label className="m-label" htmlFor="quiz-fill-question">
          Vraag <span className="m-label-opt">verplicht</span>
        </label>
        <textarea
          className={showValidation && !question.trim() ? "m-textarea m-input-error" : "m-textarea"}
          id="quiz-fill-question"
          onChange={(event) => {
            setQuestion(event.target.value);
            setShowValidation(false);
          }}
          placeholder="Vul het ontbrekende woord in: De hoofdstad van Nederland is ____."
          rows={3}
          value={question}
        />
        <p className="m-hint">Gebruik ____ om aan te geven waar het antwoord moet komen.</p>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="quiz-fill-answer">
          Correct antwoord <span className="m-label-opt">verplicht</span>
        </label>
        <input
          className={showValidation && !answer.trim() ? "m-input m-input-error" : "m-input"}
          id="quiz-fill-answer"
          onChange={(event) => {
            setAnswer(event.target.value);
            setShowValidation(false);
          }}
          placeholder="Amsterdam"
          type="text"
          value={answer}
        />
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="quiz-fill-alternatives">
          Accepteer ook <span className="m-label-opt">optioneel</span>
        </label>
        <textarea
          className="m-textarea"
          id="quiz-fill-alternatives"
          onChange={(event) => setAlternatives(event.target.value)}
          placeholder="Alternatieve correcte antwoorden, een per regel"
          rows={3}
          value={alternatives}
        />
        <p className="m-hint">Voeg alternatieve spellingen of synoniemen toe, een per regel.</p>
      </div>

      <label className="toggle-row">
        <div className="toggle-switch">
          <input
            checked={caseSensitive}
            onChange={(event) => setCaseSensitive(event.target.checked)}
            type="checkbox"
          />
          <span className="toggle-track">
            <span className="toggle-thumb" />
          </span>
        </div>
        <span className="toggle-label">Hoofdlettergevoelig</span>
      </label>

      <div className="modal-field">
        <label className="m-label" htmlFor="quiz-fill-placeholder">
          Placeholder tekst <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="quiz-fill-placeholder"
          onChange={(event) => setPlaceholder(event.target.value)}
          placeholder="Vul hier je antwoord in..."
          type="text"
          value={placeholder}
        />
        <p className="m-hint">Grijze tekst in het antwoordveld van de learner.</p>
      </div>

      <div className="explanation-box">
        <div className="explanation-box-label">
          Uitleg na antwoord <span className="explanation-muted">(optioneel)</span>
        </div>
        <textarea
          onChange={(event) => setExplanation(event.target.value)}
          placeholder="Leg uit waarom dit het correcte antwoord is..."
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
