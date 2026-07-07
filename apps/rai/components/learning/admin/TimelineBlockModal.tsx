"use client";

import { useMemo, useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

type TimelineItem = {
  id: string;
  date: string;
  title: string;
  description?: string;
  highlight?: boolean;
};

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

export function TimelineBlockModal({
  blockNumber,
  initialItems,
  initialTitle = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialTitle?: string;
  initialItems?: TimelineItem[];
  onClose: () => void;
  onSave: (data: {
    title?: string;
    items: Array<{
      id: string;
      date: string;
      title: string;
      description?: string;
      highlight: boolean;
    }>;
  }) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [items, setItems] = useState<TimelineItem[]>(
    initialItems?.length
      ? initialItems
      : [{ id: uid(), date: "", title: "", description: "", highlight: false }],
  );
  const [showValidation, setShowValidation] = useState(false);
  const filledItems = useMemo(
    () => items.filter((item) => item.date.trim() || item.title.trim()),
    [items],
  );
  const completeItems = useMemo(
    () => items.filter((item) => item.date.trim() && item.title.trim()),
    [items],
  );
  const canSave = completeItems.length > 0;

  const addItem = () =>
    setItems([...items, { id: uid(), date: "", title: "", description: "", highlight: false }]);

  const updateItem = (id: string, patch: Partial<TimelineItem>) =>
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
      title: title.trim() || undefined,
      items: completeItems.map((item) => ({
        id: item.id,
        date: item.date.trim(),
        title: item.title.trim(),
        description: item.description?.trim() || undefined,
        highlight: Boolean(item.highlight),
      })),
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Timeline"
      description="Pas de tijdlijn en mijlpalen aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Timeline Block"
    >
      <div className="modal-field">
        <div className="m-label">Voorvertoning</div>
        <div className="timeline-preview">
          {title ? <div className="timeline-preview-title">{title}</div> : null}
          <div className="timeline-track">
            {filledItems.map((item) => (
              <div
                className={item.highlight ? "timeline-item timeline-item-highlight" : "timeline-item"}
                key={item.id}
              >
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <span className="timeline-date">{item.date}</span>
                  <strong className="timeline-event-title">{item.title}</strong>
                  {item.description ? <p className="timeline-desc">{item.description}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="timeline-title">
          Tijdlijntitel <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="timeline-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Bijv. EU AI Act implementatietijdlijn"
          type="text"
          value={title}
        />
      </div>

      <div className="modal-field">
        <div className="item-heading">
          <span className="m-label">
            Events <span className="m-label-opt">verplicht, min. 1</span>
          </span>
          <button className="add-btn" onClick={addItem} type="button">
            + Event toevoegen
          </button>
        </div>
        <div className="item-rows">
          {items.map((item, idx) => {
            const isFirstInvalid = showValidation && idx === 0 && !completeItems.length;

            return (
              <div className="accordion-item-card" key={item.id}>
                <div className="accordion-item-card-head">
                  <span className="item-num">Event {idx + 1}</span>
                  <div style={{ alignItems: "center", display: "flex", gap: 6 }}>
                    <label className="highlight-toggle" title="Markeer als mijlpaal">
                      <input
                        checked={Boolean(item.highlight)}
                        onChange={(event) => updateItem(item.id, { highlight: event.target.checked })}
                        style={{ display: "none" }}
                        type="checkbox"
                      />
                      <span className={item.highlight ? "highlight-on" : ""}>★ Mijlpaal</span>
                    </label>
                    <button
                      className="opt-remove"
                      disabled={items.length <= 1}
                      onClick={() => removeItem(item.id)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="accordion-item-fields">
                  <div className="quiz-settings">
                    <div className="quiz-setting">
                      <div className="quiz-setting-label">Datum / periode</div>
                      <input
                        className={isFirstInvalid && !item.date.trim() ? "m-input m-input-error" : "m-input"}
                        onChange={(event) => {
                          updateItem(item.id, { date: event.target.value });
                          setShowValidation(false);
                        }}
                        placeholder="Bijv. 2 feb 2025"
                        type="text"
                        value={item.date}
                      />
                    </div>
                    <div className="quiz-setting">
                      <div className="quiz-setting-label">Gebeurtenis</div>
                      <input
                        className={isFirstInvalid && !item.title.trim() ? "m-input m-input-error" : "m-input"}
                        onChange={(event) => {
                          updateItem(item.id, { title: event.target.value });
                          setShowValidation(false);
                        }}
                        placeholder="Bijv. AI Act treedt in werking"
                        type="text"
                        value={item.title}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="quiz-setting-label">Toelichting</div>
                    <input
                      className="m-input"
                      onChange={(event) => updateItem(item.id, { description: event.target.value })}
                      placeholder="Korte extra uitleg (optioneel)"
                      type="text"
                      value={item.description ?? ""}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}
