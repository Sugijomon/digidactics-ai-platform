"use client";

import { useMemo, useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

type ChecklistItem = {
  id: string;
  label: string;
  required: boolean;
};

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

export function ChecklistBlockModal({
  blockNumber,
  initialItems,
  initialRequireAll = true,
  initialTitle = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialTitle?: string;
  initialItems?: ChecklistItem[];
  initialRequireAll?: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    items: ChecklistItem[];
    require_all: boolean;
  }) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [items, setItems] = useState<ChecklistItem[]>(
    initialItems?.length ? initialItems : [{ id: uid(), label: "", required: true }],
  );
  const [requireAll, setRequireAll] = useState(initialRequireAll);
  const [showValidation, setShowValidation] = useState(false);
  const filledItems = useMemo(() => items.filter((item) => item.label.trim() !== ""), [items]);
  const canSave = filledItems.length > 0;

  const addItem = () => setItems([...items, { id: uid(), label: "", required: true }]);

  const updateItem = (id: string, patch: Partial<ChecklistItem>) =>
    setItems(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      title: title.trim(),
      items: filledItems.map((item) => ({ ...item, label: item.label.trim() })),
      require_all: requireAll,
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Checklist"
      description="Pas de actiepunten van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Checklist Block"
    >
      <div className="modal-field">
        <div className="m-label">Voorvertoning</div>
        <div className="checklist-preview">
          {title ? <div className="checklist-preview-title">{title}</div> : null}
          <div className="checklist-preview-items">
            {filledItems.length === 0 ? (
              <p className="checklist-preview-empty">Voeg actiepunten toe om de preview te zien.</p>
            ) : (
              filledItems.map((item) => (
                <div className="checklist-preview-row" key={item.id}>
                  <div className={item.required ? "checklist-box required" : "checklist-box"} />
                  <span>{item.label}</span>
                  {item.required ? <span className="required-tag">verplicht</span> : null}
                </div>
              ))
            )}
          </div>
          {requireAll && filledItems.length > 0 ? (
            <p className="checklist-preview-notice">Alle punten moeten afgevinkt zijn om verder te gaan.</p>
          ) : null}
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="checklist-title">
          Titel <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="checklist-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Bijv. Doe dit voor je verder gaat"
          type="text"
          value={title}
        />
        <p className="m-hint">Koptekst boven de checklist in de les.</p>
      </div>

      <div className="modal-field">
        <div className="item-heading">
          <span className="m-label">
            Actiepunten <span className="m-label-opt">verplicht, min. 1</span>
          </span>
          <button className="add-btn" onClick={addItem} type="button">
            + Punt toevoegen
          </button>
        </div>
        <div className="item-rows">
          {items.map((item, idx) => (
            <div className="checklist-item-row" key={item.id}>
              <span className="drag-handle">⠿</span>
              <span className="item-num">{idx + 1}.</span>
              <input
                autoFocus={idx === items.length - 1 && idx > 0}
                className={showValidation && idx === 0 && !filledItems.length ? "m-input m-input-error" : "m-input"}
                onChange={(event) => {
                  updateItem(item.id, { label: event.target.value });
                  setShowValidation(false);
                }}
                placeholder="Actiepunt..."
                style={{ flex: 1 }}
                value={item.label}
              />
              <label
                className={item.required ? "required-toggle required-toggle-on" : "required-toggle"}
                title="Verplicht afvinken"
              >
                <input
                  checked={item.required}
                  onChange={(event) => updateItem(item.id, { required: event.target.checked })}
                  style={{ display: "none" }}
                  type="checkbox"
                />
                {item.required ? "★" : "☆"}
              </label>
              <button
                className="opt-remove"
                disabled={items.length <= 1}
                onClick={() => removeItem(item.id)}
                title="Verwijderen"
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <p className="m-hint">★ = verplicht afvinken. ☆ = optioneel voor de learner.</p>
      </div>

      <div className="modal-field">
        <div className="m-label">Voortgang</div>
        <label className="toggle-row">
          <div className="toggle-switch">
            <input
              checked={requireAll}
              onChange={(event) => setRequireAll(event.target.checked)}
              type="checkbox"
            />
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
          </div>
          <div>
            <span className="toggle-label">Alle verplichte punten moeten afgevinkt zijn</span>
            <p className="m-hint" style={{ marginTop: 2 }}>
              Als uitgeschakeld is de checklist informatief en blokkeert hij geen voortgang.
            </p>
          </div>
        </label>
      </div>

      <div className="review-notice">
        <span>💡</span>
        <div>
          <strong>Checklist vs Kernpunten</strong>
          <p>
            Een checklist is een actiedoel - de learner vinkt af wat hij gedaan heeft. Kernpunten zijn leesdoelen - wat
            de learner moet onthouden. Gebruik een checklist voor taken, niet voor samenvattingen.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
