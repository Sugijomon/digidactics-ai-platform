"use client";

import { useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export function HeadingBlockModal({
  blockNumber,
  initialLevel = 2,
  initialText,
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialText?: string;
  initialLevel?: HeadingLevel;
  onClose: () => void;
  onSave: (data: { text: string; level: HeadingLevel }) => void;
}) {
  const [text, setText] = useState(initialText ?? "");
  const [level, setLevel] = useState<HeadingLevel>(initialLevel);
  const [showValidation, setShowValidation] = useState(false);
  const canSave = Boolean(text.trim());

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({ text: text.trim(), level });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Heading"
      description="Voeg een gewone inhoudelijke kop toe aan de pagina."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Heading bewerken"
    >
      <div className="modal-field">
        <span className="preview-label">Voorvertoning</span>
        <div className="heading-preview">
          <span className={`heading-preview-text heading-preview-h${level}`}>
            {text || "Nieuwe heading"}
          </span>
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="heading-block-text">
          Tekst <span className="m-label-opt">verplicht</span>
        </label>
        <input
          className={showValidation && !canSave ? "m-input m-input-error" : "m-input"}
          id="heading-block-text"
          onChange={(event) => {
            setText(event.target.value);
            setShowValidation(false);
          }}
          placeholder="Bijv. Belangrijkste begrippen"
          type="text"
          value={text}
        />
        {showValidation && !canSave ? <span className="field-error">Vul een heading in</span> : null}
      </div>

      <div className="modal-field">
        <span className="m-label">Niveau</span>
        <div className="m-tabs heading-level-tabs">
          {([1, 2, 3, 4, 5, 6] as HeadingLevel[]).map((value) => (
            <button
              className={level === value ? "m-tab active" : "m-tab"}
              key={value}
              onClick={() => setLevel(value)}
              type="button"
            >
              H{value}
            </button>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}
