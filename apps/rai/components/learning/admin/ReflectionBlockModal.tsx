"use client";

import { useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

type ReflectionSaveData = {
  prompt: string;
  placeholder?: string;
  min_words?: number;
  save_personal: boolean;
};

export function ReflectionBlockModal({
  blockNumber,
  initialMinWords,
  initialPlaceholder = "Schrijf hier je reflectie...",
  initialPrompt = "",
  initialSavePersonal = false,
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialPrompt?: string;
  initialPlaceholder?: string;
  initialMinWords?: number;
  initialSavePersonal?: boolean;
  onClose: () => void;
  onSave: (data: ReflectionSaveData) => void;
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [placeholder, setPlaceholder] = useState(initialPlaceholder);
  const [minWords, setMinWords] = useState<number | undefined>(initialMinWords ?? undefined);
  const [savePersonal, setSavePersonal] = useState(initialSavePersonal);
  const [showValidation, setShowValidation] = useState(false);

  const canSave = Boolean(prompt.trim());

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      prompt: prompt.trim(),
      placeholder: placeholder.trim() || undefined,
      min_words: minWords,
      save_personal: savePersonal,
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Reflectie"
      description="Pas de reflectievraag van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Reflection Block"
    >
      <div className="modal-field">
        <div className="m-label">Voorvertoning</div>
        <div className="reflection-preview">
          <div className="reflection-preview-header">
            <span className="reflection-tag">Reflectie</span>
            <span className="reflection-personal-badge">Niet beoordeeld</span>
          </div>
          <div className="reflection-prompt">
            {prompt || <em className="empty">Reflectievraag verschijnt hier...</em>}
          </div>
          <div className="reflection-textarea-mock">
            <span>{placeholder}</span>
          </div>
          {minWords ? <div className="reflection-min-words">Minimaal {minWords} woorden</div> : null}
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="reflection-prompt">
          Reflectievraag <span className="m-label-opt">verplicht</span>
        </label>
        <textarea
          className={showValidation && !prompt.trim() ? "m-textarea m-input-error" : "m-textarea"}
          id="reflection-prompt"
          onChange={(event) => {
            setPrompt(event.target.value);
            setShowValidation(false);
          }}
          placeholder={"Bijv. Wat betekent dit voor jouw eigen werkpraktijk?\nWelke AI-toepassingen gebruik jij al zonder het te weten?"}
          rows={3}
          value={prompt}
        />
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="reflection-placeholder">
          Placeholder tekst <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="reflection-placeholder"
          onChange={(event) => setPlaceholder(event.target.value)}
          placeholder="Schrijf hier je reflectie..."
          type="text"
          value={placeholder}
        />
        <p className="m-hint">Grijze tekst in het schrijfveld van de learner.</p>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="reflection-min-words">
          Minimum woorden <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="reflection-min-words"
          min="0"
          onChange={(event) => setMinWords(event.target.value ? Number(event.target.value) : undefined)}
          placeholder="Geen minimum"
          type="number"
          value={minWords ?? ""}
        />
        <p className="m-hint">Laat leeg voor geen woordlimiet.</p>
      </div>

      <label className="toggle-row">
        <div className="toggle-switch">
          <input
            checked={savePersonal}
            onChange={(event) => setSavePersonal(event.target.checked)}
            type="checkbox"
          />
          <span className="toggle-track">
            <span className="toggle-thumb" />
          </span>
        </div>
        <div>
          <span className="toggle-label">Antwoord opslaan in persoonlijk portfolio</span>
          <p className="m-hint" style={{ marginTop: 2 }}>
            De learner kan zijn reflectie terugzien in zijn profiel. Niet zichtbaar voor beheerders.
          </p>
        </div>
      </label>

      <div className="review-notice">
        <span>i</span>
        <div>
          <strong>Geen beoordeling</strong>
          <p>
            Reflecties worden niet beoordeeld en tellen niet mee voor de voortgang of het examen. Ze zijn bedoeld voor
            persoonlijke verdieping. Beheerders zien de antwoorden niet.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
