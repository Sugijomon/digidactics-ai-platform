"use client";

import { useMemo, useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

type ScenarioChoice = {
  id: string;
  label: string;
  consequence: string;
  isRecommended: boolean;
};

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

export function ScenarioBlockModal({
  blockNumber,
  initialChoices,
  initialQuestion = "",
  initialSituation = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialSituation?: string;
  initialQuestion?: string;
  initialChoices?: ScenarioChoice[];
  onClose: () => void;
  onSave: (data: {
    situation: string;
    question: string;
    choices: Array<{
      id: string;
      label: string;
      consequence: string;
      is_recommended: boolean;
    }>;
  }) => void;
}) {
  const [situation, setSituation] = useState(initialSituation);
  const [question, setQuestion] = useState(initialQuestion);
  const [choices, setChoices] = useState<ScenarioChoice[]>(
    initialChoices?.length
      ? initialChoices
      : [
          { id: uid(), label: "", consequence: "", isRecommended: false },
          { id: uid(), label: "", consequence: "", isRecommended: false },
        ],
  );
  const [previewChoice, setPreviewChoice] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const filledChoices = useMemo(() => choices.filter((choice) => choice.label.trim()), [choices]);
  const hasRecommendedChoice = choices.some((choice) => choice.isRecommended);
  const canSave = Boolean(situation.trim()) && Boolean(question.trim()) && filledChoices.length >= 2;

  const addChoice = () => {
    if (choices.length >= 4) return;
    setChoices([...choices, { id: uid(), label: "", consequence: "", isRecommended: false }]);
  };

  const updateChoice = (id: string, patch: Partial<ScenarioChoice>) =>
    setChoices(choices.map((choice) => (choice.id === id ? { ...choice, ...patch } : choice)));

  const removeChoice = (id: string) => {
    if (choices.length <= 2) return;
    setChoices(choices.filter((choice) => choice.id !== id));
  };

  const setRecommended = (id: string) =>
    setChoices(choices.map((choice) => ({ ...choice, isRecommended: choice.id === id })));

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      situation: situation.trim(),
      question: question.trim(),
      choices: filledChoices.map((choice) => ({
        id: choice.id,
        label: choice.label.trim(),
        consequence: choice.consequence.trim(),
        is_recommended: choice.isRecommended,
      })),
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Scenario"
      description="Pas de interactieve keuze-scenario's aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Scenario Block"
    >
      <div className="modal-field">
        <div className="m-label">Voorvertoning</div>
        <div className="scenario-preview">
          <div className="scenario-preview-header">
            <span className="case-preview-tag">Scenario</span>
          </div>
          {situation ? (
            <div className="scenario-preview-situation">
              {situation.slice(0, 140)}
              {situation.length > 140 ? "..." : ""}
            </div>
          ) : null}
          {question ? (
            <div className="scenario-preview-question">
              <strong>{question}</strong>
            </div>
          ) : null}
          <div className="scenario-preview-choices">
            {filledChoices.map((choice) => (
              <div key={choice.id}>
                <button
                  className={[
                    "scenario-choice-btn",
                    previewChoice === choice.id ? "chosen" : "",
                    choice.isRecommended ? "recommended" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setPreviewChoice(previewChoice === choice.id ? null : choice.id)}
                  type="button"
                >
                  {choice.label}
                  {choice.isRecommended ? <span className="recommended-badge">★</span> : null}
                </button>
                {previewChoice === choice.id && choice.consequence ? (
                  <div className={choice.isRecommended ? "scenario-consequence good" : "scenario-consequence neutral"}>
                    {choice.consequence}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          {!filledChoices.length ? (
            <p className="comparison-empty" style={{ padding: "12px 14px" }}>
              Voeg keuzes toe om de preview te zien.
            </p>
          ) : null}
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="scenario-situation">
          Situatie <span className="m-label-opt">verplicht</span>
        </label>
        <textarea
          className={showValidation && !situation.trim() ? "m-textarea m-input-error" : "m-textarea"}
          id="scenario-situation"
          onChange={(event) => {
            setSituation(event.target.value);
            setShowValidation(false);
          }}
          placeholder={"Beschrijf de concrete situatie die de\nlearner moet beoordelen. Geef genoeg context."}
          rows={4}
          value={situation}
        />
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="scenario-question">
          Beslissingsvraag <span className="m-label-opt">verplicht</span>
        </label>
        <textarea
          className={showValidation && !question.trim() ? "m-textarea m-input-error" : "m-textarea"}
          id="scenario-question"
          onChange={(event) => {
            setQuestion(event.target.value);
            setShowValidation(false);
          }}
          placeholder="Wat doe jij in deze situatie?"
          rows={2}
          value={question}
        />
        <p className="m-hint">Directe vraag die de learner naar een keuze leidt.</p>
      </div>

      <div className="modal-field">
        <div className="item-heading">
          <span className="m-label">
            Keuzes <span className="m-label-opt">min. 2, max. 4</span>
          </span>
          <button className="add-btn" disabled={choices.length >= 4} onClick={addChoice} type="button">
            + Keuze
          </button>
        </div>
        <div className="item-rows">
          {choices.map((choice, idx) => (
            <div className="accordion-item-card" key={choice.id}>
              <div className="accordion-item-card-head">
                <span className="item-num">Keuze {idx + 1}</span>
                <div style={{ alignItems: "center", display: "flex", gap: 6 }}>
                  <label className="highlight-toggle" title="Markeer als aanbevolen keuze">
                    <input
                      checked={choice.isRecommended}
                      name="recommended"
                      onChange={() => setRecommended(choice.id)}
                      style={{ display: "none" }}
                      type="radio"
                    />
                    <span className={choice.isRecommended ? "highlight-on" : ""}>★ Aanbevolen</span>
                  </label>
                  <button
                    className="opt-remove"
                    disabled={choices.length <= 2}
                    onClick={() => removeChoice(choice.id)}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="accordion-item-fields">
                <div>
                  <div className="quiz-setting-label">Keuze-tekst</div>
                  <input
                    className={showValidation && filledChoices.length < 2 && !choice.label.trim() ? "m-input m-input-error" : "m-input"}
                    onChange={(event) => {
                      updateChoice(choice.id, { label: event.target.value });
                      setShowValidation(false);
                    }}
                    placeholder="Bijv. Ik gebruik het AI-systeem zoals gevraagd"
                    type="text"
                    value={choice.label}
                  />
                </div>
                <div>
                  <div className="quiz-setting-label">Gevolg / feedback</div>
                  <textarea
                    className="m-textarea"
                    onChange={(event) => updateChoice(choice.id, { consequence: event.target.value })}
                    placeholder={"Wat gebeurt er na deze keuze?\nWelke consequentie ervaart de learner?"}
                    rows={2}
                    value={choice.consequence}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="m-hint">
          ★ = aanbevolen keuze - wordt groen gemarkeerd na selectie. Niet-aanbevolen keuzes tonen een oranje waarschuwing.
        </p>
        {!hasRecommendedChoice ? (
          <p style={{ color: "var(--warn)", fontSize: "0.82rem" }}>
            Tip: markeer de aanbevolen keuze zodat de learner gerichte feedback krijgt.
          </p>
        ) : null}
      </div>
    </ModalShell>
  );
}
