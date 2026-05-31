"use client";

import { useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

export function CaseStudyBlockModal({
  blockNumber,
  initialChallenge = "",
  initialContext = "",
  initialHints,
  initialQuestion = "",
  initialReflection = "",
  initialRole = "",
  initialTitle = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialTitle?: string;
  initialContext?: string;
  initialChallenge?: string;
  initialQuestion?: string;
  initialHints?: string[];
  initialReflection?: string;
  initialRole?: string;
  onClose: () => void;
  onSave: (data: {
    title: string;
    context: string;
    challenge: string;
    question: string;
    hints: string[];
    reflection_prompt?: string;
    role?: string;
  }) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [context, setContext] = useState(initialContext);
  const [challenge, setChallenge] = useState(initialChallenge);
  const [question, setQuestion] = useState(initialQuestion);
  const [hints, setHints] = useState<string[]>(initialHints?.length ? initialHints : [""]);
  const [reflection, setReflection] = useState(initialReflection);
  const [role, setRole] = useState(initialRole);
  const [showValidation, setShowValidation] = useState(false);

  const canSave = Boolean(title.trim() && context.trim() && challenge.trim() && question.trim());

  const addHint = () => setHints([...hints, ""]);
  const updateHint = (idx: number, val: string) => setHints(hints.map((hint, i) => (i === idx ? val : hint)));
  const removeHint = (idx: number) => {
    if (hints.length <= 1) return;
    setHints(hints.filter((_, i) => i !== idx));
  };

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      title: title.trim(),
      context: context.trim(),
      challenge: challenge.trim(),
      question: question.trim(),
      hints: hints.map((hint) => hint.trim()).filter(Boolean),
      reflection_prompt: reflection.trim() || undefined,
      role: role.trim() || undefined,
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Case"
      description="Pas de praktijkcasus van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Case Study Block"
    >
      <div className="modal-field">
        <div className="m-label">Voorvertoning</div>
        <div className="case-preview">
          <div className="case-preview-header">
            <span className="case-preview-tag">Case</span>
            {role ? <span className="case-preview-role">Rol: {role}</span> : null}
          </div>
          <div className="case-preview-title">
            {title || <em className="empty">Casetitel...</em>}
          </div>
          {context ? (
            <div className="case-preview-section">
              <span className="case-section-label">Situatie</span>
              <p>
                {context.slice(0, 120)}
                {context.length > 120 ? "..." : ""}
              </p>
            </div>
          ) : null}
          {challenge ? (
            <div className="case-preview-section">
              <span className="case-section-label">Uitdaging</span>
              <p>
                {challenge.slice(0, 80)}
                {challenge.length > 80 ? "..." : ""}
              </p>
            </div>
          ) : null}
          {question ? (
            <div className="case-preview-question">
              <span>?</span>
              <strong>{question}</strong>
            </div>
          ) : null}
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="case-title">
          Casetitel <span className="m-label-opt">verplicht</span>
        </label>
        <input
          className={showValidation && !title.trim() ? "m-input m-input-error" : "m-input"}
          id="case-title"
          onChange={(event) => {
            setTitle(event.target.value);
            setShowValidation(false);
          }}
          placeholder="Bijv. CV-screening bij een HR-afdeling"
          type="text"
          value={title}
        />
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="case-role">
          Rol van de learner <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="case-role"
          onChange={(event) => setRole(event.target.value)}
          placeholder="Bijv. HR-medewerker, Manager, Inkoper"
          type="text"
          value={role}
        />
        <p className="m-hint">Geeft de learner een perspectief voor de casus.</p>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="case-context">
          Situatie <span className="m-label-opt">verplicht</span>
        </label>
        <textarea
          className={showValidation && !context.trim() ? "m-textarea m-input-error" : "m-textarea"}
          id="case-context"
          onChange={(event) => {
            setContext(event.target.value);
            setShowValidation(false);
          }}
          placeholder={"Beschrijf de context en achtergrond van de casus.\nWat is er aan de hand? Wat is de setting?"}
          rows={4}
          value={context}
        />
        <p className="m-hint">Geef genoeg context zodat de learner zich kan inleven.</p>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="case-challenge">
          Uitdaging <span className="m-label-opt">verplicht</span>
        </label>
        <textarea
          className={showValidation && !challenge.trim() ? "m-textarea m-input-error" : "m-textarea"}
          id="case-challenge"
          onChange={(event) => {
            setChallenge(event.target.value);
            setShowValidation(false);
          }}
          placeholder={"Wat is het concrete probleem of de beslissing\ndie genomen moet worden?"}
          rows={3}
          value={challenge}
        />
        <p className="m-hint">Een scherpe zin die het dilemma benoemt.</p>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="case-question">
          Centrale vraag <span className="m-label-opt">verplicht</span>
        </label>
        <textarea
          className={showValidation && !question.trim() ? "m-textarea m-input-error" : "m-textarea"}
          id="case-question"
          onChange={(event) => {
            setQuestion(event.target.value);
            setShowValidation(false);
          }}
          placeholder="Wat zou jij doen in deze situatie?"
          rows={2}
          value={question}
        />
        <p className="m-hint">De hoofdvraag waarover de learner nadenkt of schrijft.</p>
      </div>

      <div className="modal-field">
        <div className="item-heading">
          <span className="m-label">
            Hints <span className="m-label-opt">optioneel</span>
          </span>
          <button className="add-btn" onClick={addHint} type="button">
            + Hint toevoegen
          </button>
        </div>
        <div className="item-rows">
          {hints.map((hint, idx) => (
            <div className="checklist-item-row" key={idx}>
              <span className="item-num">{idx + 1}.</span>
              <input
                className="m-input"
                onChange={(event) => updateHint(idx, event.target.value)}
                placeholder="Denk aan..."
                style={{ flex: 1 }}
                value={hint}
              />
              <button
                className="opt-remove"
                disabled={hints.length <= 1}
                onClick={() => removeHint(idx)}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <p className="m-hint">Hints helpen de learner op weg zonder het antwoord te geven. Verschijnen als uitklapbare tips.</p>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="case-reflection">
          Reflectievraag <span className="m-label-opt">optioneel</span>
        </label>
        <textarea
          className="m-textarea"
          id="case-reflection"
          onChange={(event) => setReflection(event.target.value)}
          placeholder="Wat betekent dit voor jouw eigen werkpraktijk?"
          rows={3}
          value={reflection}
        />
        <p className="m-hint">Persoonlijke verdieping na de casus. Antwoord wordt niet beoordeeld.</p>
      </div>

      <div className="case-steps">
        {[
          { key: "context", label: "Situatie", filled: Boolean(context.trim()) },
          { key: "challenge", label: "Uitdaging", filled: Boolean(challenge.trim()) },
          { key: "question", label: "Vraag", filled: Boolean(question.trim()) },
          { key: "hints", label: "Hints", filled: hints.some((hint) => hint.trim()) },
          { key: "reflect", label: "Reflectie", filled: Boolean(reflection.trim()) },
        ].map((step, i) => (
          <div className="case-step" key={step.key}>
            <div className={step.filled ? "case-step-dot filled" : "case-step-dot"}>
              {step.filled ? "✓" : i + 1}
            </div>
            <span className={step.filled ? "filled-label" : ""}>{step.label}</span>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
