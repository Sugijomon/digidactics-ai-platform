"use client";

import { useMemo, useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

export function KeyTakeawaysBlockModal({
  blockNumber,
  initialItems,
  initialTitle = "Kernpunten",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialItems?: string[];
  initialTitle?: string;
  onClose: () => void;
  onSave: (data: { title: string; items: string[] }) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [items, setItems] = useState<string[]>(initialItems?.length ? initialItems : [""]);
  const [showValidation, setShowValidation] = useState(false);
  const filledItems = useMemo(() => items.filter((item) => item.trim() !== ""), [items]);
  const canSave = filledItems.length > 0;
  const previewTitle = title.trim() || "Kernpunten";

  const updateItem = (idx: number, val: string) =>
    setItems(items.map((item, i) => (i === idx ? val : item)));

  const addItem = () => setItems([...items, ""]);

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      title: previewTitle,
      items: filledItems.map((item) => item.trim()),
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Kernpunten"
      description="Pas de inhoud van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      title="Edit Kernpunten Block"
    >
      <div className="modal-field">
        <label className="m-label" htmlFor="key-takeaways-title">
          Titel <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="key-takeaways-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Bijv. Wat je leert"
          type="text"
          value={title}
        />
      </div>

      <div className="modal-field">
        <span className="preview-label">Voorvertoning</span>
        <div className="kp-preview">
          <div className="kp-preview-title">{previewTitle}</div>
          {filledItems.length === 0 ? (
            <p className="kp-empty">Voeg kernpunten toe om de preview te zien.</p>
          ) : (
            <div className="kp-list">
              {filledItems.map((item, i) => (
                <div className="kp-item" key={`${item}-${i}`}>
                  <div className="kp-check">
                    <CheckIcon />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="modal-field">
        <div className="item-heading">
          <span className="m-label">
            Kernpunten <span className="m-label-opt">verplicht, min. 1</span>
          </span>
          <button className="add-btn" onClick={addItem} type="button">
            + Punt toevoegen
          </button>
        </div>
        <div className="item-rows">
          {items.map((item, idx) => (
            <div className="item-row" key={idx}>
              <span className="drag-handle">::</span>
              <span className="item-num">{idx + 1}.</span>
              <input
                autoFocus={idx === items.length - 1 && idx > 0}
                className={showValidation && !canSave ? "m-input m-input-error item-input" : "m-input item-input"}
                onChange={(event) => {
                  updateItem(idx, event.target.value);
                  setShowValidation(false);
                }}
                placeholder="Kernpunt..."
                value={item}
              />
              <button
                className="remove-btn"
                disabled={items.length <= 1}
                onClick={() => removeItem(idx)}
                type="button"
              >
                x
              </button>
            </div>
          ))}
        </div>
        {showValidation && !canSave ? (
          <span className="field-error">Voeg minimaal een kernpunt toe</span>
        ) : null}
      </div>
    </ModalShell>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="10" viewBox="0 0 10 10" width="10">
      <path
        d="M2 5.1 4.1 7 8 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
