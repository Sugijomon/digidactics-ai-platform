"use client";

import { useMemo, useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

type AccordionItem = {
  id: string;
  question: string;
  answer: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

export function AccordionBlockModal({
  blockNumber,
  initialAllowMultiple = false,
  initialItems,
  initialTitle = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialTitle?: string;
  initialItems?: AccordionItem[];
  initialAllowMultiple?: boolean;
  onClose: () => void;
  onSave: (data: {
    title?: string;
    items: AccordionItem[];
    allow_multiple_open: boolean;
  }) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [items, setItems] = useState<AccordionItem[]>(
    initialItems?.length ? initialItems : [{ id: uid(), question: "", answer: "" }],
  );
  const [allowMultiple, setAllowMultiple] = useState(initialAllowMultiple);
  const [previewOpen, setPreviewOpen] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const filledItems = useMemo(() => items.filter((item) => item.question.trim()), [items]);
  const canSave = filledItems.length > 0;

  const addItem = () => setItems([...items, { id: uid(), question: "", answer: "" }]);

  const updateItem = (id: string, patch: Partial<{ question: string; answer: string }>) =>
    setItems(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  function togglePreview(itemId: string) {
    setPreviewOpen(previewOpen === itemId ? null : itemId);
  }

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      title: title.trim() || undefined,
      items: filledItems.map((item) => ({
        id: item.id,
        question: item.question.trim(),
        answer: item.answer.trim(),
      })),
      allow_multiple_open: allowMultiple,
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Accordion"
      description="Pas de uitklapbare vragen en antwoorden aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Accordion Block"
    >
      <div className="modal-field">
        <div className="m-label">Voorvertoning</div>
        <div className="accordion-preview">
          {title ? <div className="accordion-preview-title">{title}</div> : null}
          {filledItems.length === 0 ? (
            <p className="checklist-preview-empty">Voeg vragen toe om de preview te zien.</p>
          ) : (
            filledItems.map((item) => (
              <div className="accordion-preview-item" key={item.id}>
                <button
                  className="accordion-preview-trigger"
                  onClick={() => togglePreview(item.id)}
                  type="button"
                >
                  <span>{item.question}</span>
                  <span className="accordion-chevron">{previewOpen === item.id ? "▲" : "▼"}</span>
                </button>
                {previewOpen === item.id && item.answer ? (
                  <div className="accordion-preview-answer">{item.answer}</div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="accordion-title">
          Opschrift <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="accordion-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Bijv. Veelgestelde vragen, Definities"
          type="text"
          value={title}
        />
      </div>

      <div className="modal-field">
        <div className="item-heading">
          <span className="m-label">
            Vragen & antwoorden <span className="m-label-opt">verplicht, min. 1</span>
          </span>
          <button className="add-btn" onClick={addItem} type="button">
            + Item toevoegen
          </button>
        </div>
        <div className="item-rows">
          {items.map((item, idx) => (
            <div className="accordion-item-card" key={item.id}>
              <div className="accordion-item-card-head">
                <span className="item-num">Item {idx + 1}</span>
                <button
                  className="opt-remove"
                  disabled={items.length <= 1}
                  onClick={() => removeItem(item.id)}
                  type="button"
                >
                  ×
                </button>
              </div>
              <div className="accordion-item-fields">
                <div>
                  <div className="quiz-setting-label">Vraag / term</div>
                  <input
                    className={showValidation && idx === 0 && !filledItems.length ? "m-input m-input-error" : "m-input"}
                    onChange={(event) => {
                      updateItem(item.id, { question: event.target.value });
                      setShowValidation(false);
                    }}
                    placeholder="Bijv. Wat is een hoog-risico AI-systeem?"
                    type="text"
                    value={item.question}
                  />
                </div>
                <div>
                  <div className="quiz-setting-label">Antwoord / definitie</div>
                  <textarea
                    className="m-textarea"
                    onChange={(event) => updateItem(item.id, { answer: event.target.value })}
                    placeholder="Het antwoord of de uitleg..."
                    rows={3}
                    value={item.answer}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="toggle-row">
        <div className="toggle-switch">
          <input
            checked={allowMultiple}
            onChange={(event) => setAllowMultiple(event.target.checked)}
            type="checkbox"
          />
          <span className="toggle-track">
            <span className="toggle-thumb" />
          </span>
        </div>
        <div>
          <span className="toggle-label">Meerdere items tegelijk kunnen openstaan</span>
          <p className="m-hint" style={{ marginTop: 2 }}>
            Als uitgeschakeld sluit het vorige item als een nieuwe wordt geopend.
          </p>
        </div>
      </label>
    </ModalShell>
  );
}
