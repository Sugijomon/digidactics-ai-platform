"use client";

import { useMemo, useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

type QuizOption = { id: string; label: string };

export function QuizMSBlockModal({
  blockNumber,
  initialCorrectIds,
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
  initialOptions?: QuizOption[];
  initialCorrectIds?: string[];
  initialExplanation?: string;
  initialPoints?: number;
  initialMaxAttempts?: number;
  onClose: () => void;
  onSave: (data: {
    question: string;
    options: QuizOption[];
    correct_option_ids: string[];
    explanation?: string;
    points: number;
    max_attempts: number;
  }) => void;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [options, setOptions] = useState<QuizOption[]>(
    initialOptions?.length
      ? initialOptions
      : [
          { id: "a", label: "" },
          { id: "b", label: "" },
          { id: "c", label: "" },
        ],
  );
  const [correctIds, setCorrectIds] = useState<string[]>(initialCorrectIds?.length ? initialCorrectIds : []);
  const [explanation, setExplanation] = useState(initialExplanation);
  const [points, setPoints] = useState(initialPoints);
  const [maxAttempts, setMaxAttempts] = useState(initialMaxAttempts);
  const [showValidation, setShowValidation] = useState(false);
  const canSave = Boolean(question.trim()) && correctIds.length > 0;
  const correctIdSet = useMemo(() => new Set(correctIds), [correctIds]);

  function addOption() {
    if (options.length >= LETTERS.length) return;
    const id = String.fromCharCode(97 + options.length);
    setOptions([...options, { id, label: "" }]);
  }

  function updateOption(index: number, label: string) {
    setOptions(options.map((option, optionIndex) => (optionIndex === index ? { ...option, label } : option)));
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    const removedId = options[index]?.id;
    setOptions(options.filter((_, optionIndex) => optionIndex !== index));
    setCorrectIds(correctIds.filter((id) => id !== removedId));
  }

  function toggleCorrect(optionId: string) {
    setShowValidation(false);
    setCorrectIds((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    );
  }

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    const cleanOptions = options
      .map((option) => ({ ...option, label: option.label.trim() }))
      .filter((option) => option.label);
    const cleanOptionIds = new Set(cleanOptions.map((option) => option.id));

    onSave({
      question: question.trim(),
      options: cleanOptions,
      correct_option_ids: correctIds.filter((id) => cleanOptionIds.has(id)),
      explanation: explanation.trim() || undefined,
      points: Number(points) || 10,
      max_attempts: Math.max(1, Number(maxAttempts) || 1),
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Multi-select"
      description="Pas de inhoud van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Quiz - Multi Select Block"
    >
      <div className="modal-field">
        <div className="m-label">
          Vraag <span className="m-label-opt">verplicht</span>
        </div>
        <textarea
          className={showValidation && !question.trim() ? "m-textarea m-input-error" : "m-textarea"}
          id="quiz-ms-question"
          onChange={(event) => {
            setQuestion(event.target.value);
            setShowValidation(false);
          }}
          rows={3}
          value={question}
        />
        <p className="m-hint">Meerdere antwoorden kunnen correct zijn.</p>
      </div>

      <div className="modal-field">
        <div className="item-heading">
          <span className="m-label">
            Antwoordopties <span className="m-label-opt">klik om juist te markeren</span>
          </span>
          <button className="add-btn" disabled={options.length >= LETTERS.length} onClick={addOption} type="button">
            + Optie
          </button>
        </div>
        <div className="opt-rows">
          {options.map((option, index) => {
            const isCorrect = correctIdSet.has(option.id);

            return (
              <div
                className={isCorrect ? "opt-row opt-correct" : "opt-row"}
                key={option.id}
                onClick={() => toggleCorrect(option.id)}
              >
                <input
                  checked={isCorrect}
                  className="correct-radio"
                  onChange={() => toggleCorrect(option.id)}
                  onClick={(event) => event.stopPropagation()}
                  type="checkbox"
                />
                <div className="opt-letter">{LETTERS[index]}</div>
                <input
                  className="opt-input"
                  onChange={(event) => {
                    event.stopPropagation();
                    updateOption(index, event.target.value);
                  }}
                  onClick={(event) => event.stopPropagation()}
                  placeholder={`Optie ${LETTERS[index]}...`}
                  value={option.label}
                />
                <span className="opt-correct-label">{isCorrect ? "Juist" : "Juist?"}</span>
                <button
                  className="opt-remove"
                  disabled={options.length <= 2}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeOption(index);
                  }}
                  type="button"
                >
                  x
                </button>
              </div>
            );
          })}
        </div>
        {showValidation && correctIds.length === 0 ? (
          <p className="field-error quiz-option-error">Markeer minimaal een correct antwoord.</p>
        ) : null}
      </div>

      <div className="explanation-box">
        <div className="explanation-box-label">Uitleg na antwoord</div>
        <textarea
          onChange={(event) => setExplanation(event.target.value)}
          placeholder="Leg uit waarom deze antwoorden correct zijn..."
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
              id="quiz-ms-points"
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
              id="quiz-ms-attempts"
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
