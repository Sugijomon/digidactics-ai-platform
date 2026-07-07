"use client";

import { useMemo, useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

type QuizOption = { id: string; label: string };

export function QuizMCBlockModal({
  blockNumber,
  initialCorrectId = "a",
  initialExplanation = "",
  initialMaxAttempts = 3,
  initialOptions,
  initialPoints = 10,
  initialQuestion = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialQuestion?: string;
  initialOptions?: Array<{ id: string; label: string }>;
  initialCorrectId?: string;
  initialExplanation?: string;
  initialPoints?: number;
  initialMaxAttempts?: number;
  onClose: () => void;
  onSave: (data: {
    question: string;
    options: Array<{ id: string; label: string }>;
    correct_option_id: string;
    explanation?: string;
    points: number;
    max_attempts: number;
  }) => void;
}) {
  const [question, setQuestion] = useState(initialQuestion ?? "");
  const [options, setOptions] = useState<QuizOption[]>(
    initialOptions ?? [
      { id: "a", label: "" },
      { id: "b", label: "" },
      { id: "c", label: "" },
    ],
  );
  const [correctId, setCorrectId] = useState(initialCorrectId ?? "a");
  const [explanation, setExplanation] = useState(initialExplanation ?? "");
  const [points, setPoints] = useState(initialPoints ?? 10);
  const [maxAttempts, setMaxAttempts] = useState(initialMaxAttempts ?? 3);
  const [showValidation, setShowValidation] = useState(false);
  const filledOptions = useMemo(
    () => options.filter((option) => option.label.trim() !== ""),
    [options],
  );
  const canSave = Boolean(question.trim()) && filledOptions.length >= 2;

  const addOption = () => {
    if (options.length >= LETTERS.length) return;
    const id = String.fromCharCode(97 + options.length);
    setOptions([...options, { id, label: "" }]);
  };

  const updateOption = (idx: number, label: string) =>
    setOptions(options.map((option, i) => (i === idx ? { ...option, label } : option)));

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    const next = options.filter((_, i) => i !== idx);
    setOptions(next);
    if (!next.find((option) => option.id === correctId)) setCorrectId(next[0].id);
  };

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    const cleanOptions = options
      .map((option) => ({ ...option, label: option.label.trim() }))
      .filter((option) => option.label);
    const safeCorrectId = cleanOptions.some((option) => option.id === correctId)
      ? correctId
      : cleanOptions[0].id;

    onSave({
      question: question.trim(),
      options: cleanOptions,
      correct_option_id: safeCorrectId,
      explanation: explanation.trim() || undefined,
      points: Number(points) || 10,
      max_attempts: Math.max(1, Number(maxAttempts) || 1),
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Meerkeuze"
      description="Pas de inhoud van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Quiz - Multiple Choice Block"
    >
      <div className="modal-field">
        <label className="m-label" htmlFor="quiz-mc-question">
          Vraag <span className="m-label-opt">verplicht</span>
        </label>
        <textarea
          className={showValidation && !question.trim() ? "m-textarea m-input-error" : "m-textarea"}
          id="quiz-mc-question"
          onChange={(event) => {
            setQuestion(event.target.value);
            setShowValidation(false);
          }}
          rows={3}
          value={question}
        />
        {showValidation && !question.trim() ? (
          <span className="field-error">Vul een vraag in</span>
        ) : null}
      </div>

      <div className="modal-field">
        <div className="item-heading">
          <span className="m-label">
            Antwoordopties <span className="m-label-opt">min. 2 — klik om juist te markeren</span>
          </span>
          <button className="add-btn" disabled={options.length >= LETTERS.length} onClick={addOption} type="button">
            + Optie
          </button>
        </div>
        <div className="opt-rows">
          {options.map((opt, idx) => (
            <div
              className={correctId === opt.id ? "opt-row opt-correct" : "opt-row"}
              key={opt.id}
              onClick={() => setCorrectId(opt.id)}
            >
              <input
                checked={correctId === opt.id}
                className="correct-radio"
                name="correct-option"
                onChange={() => setCorrectId(opt.id)}
                onClick={(event) => event.stopPropagation()}
                type="radio"
              />
              <div className="opt-letter">{LETTERS[idx]}</div>
              <input
                className="opt-input"
                onChange={(event) => {
                  event.stopPropagation();
                  updateOption(idx, event.target.value);
                  setShowValidation(false);
                }}
                onClick={(event) => event.stopPropagation()}
                placeholder={`Optie ${LETTERS[idx]}…`}
                value={opt.label}
              />
              <span className="opt-correct-label">
                {correctId === opt.id ? "✓ Juist" : "Juist?"}
              </span>
              <button
                className="opt-remove"
                disabled={options.length <= 2}
                onClick={(event) => {
                  event.stopPropagation();
                  removeOption(idx);
                }}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {showValidation && filledOptions.length < 2 ? (
          <span className="field-error">Vul minimaal twee antwoordopties in</span>
        ) : null}
      </div>

      <div className="explanation-box">
        <div className="explanation-box-label">
          💡 Uitleg na antwoord

        </div>
        <textarea
          onChange={(event) => setExplanation(event.target.value)}
          placeholder="Leg uit waarom dit het correcte antwoord is…"
          value={explanation}
        />
      </div>

      <div>
        <div className="quiz-setting-label" style={{ marginBottom: 8 }}>
          Quizinstellingen
        </div>
        <div className="quiz-settings">
          <div className="quiz-setting">
            <div className="quiz-setting-label">Punten</div>
            <input
              className="m-input"
              min="0"
              onChange={(event) => setPoints(Number(event.target.value))}
              type="number"
              value={points}
            />
          </div>
          <div className="quiz-setting">
            <div className="quiz-setting-label">Max. pogingen</div>
            <input
              className="m-input"
              min="1"
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
