"use client";

import { useMemo, useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

type ComparisonColor = "green" | "red" | "blue" | "neutral";

const COLORS: Record<ComparisonColor, { bg: string; border: string; dot: string }> = {
  green: { bg: "#f2f9f5", border: "#a8d5b8", dot: "#2f7a50" },
  red: { bg: "#fdf2f2", border: "#f5b8b8", dot: "#c0392b" },
  blue: { bg: "#f0f7ff", border: "#c5dff8", dot: "#005e70" },
  neutral: { bg: "#fafafa", border: "#d9d3c8", dot: "#60706c" },
};

export function ComparisonBlockModal({
  blockNumber,
  initialLeftColor = "green",
  initialLeftItems,
  initialLeftLabel = "✓ Toegestaan",
  initialRightColor = "red",
  initialRightItems,
  initialRightLabel = "✕ Verboden",
  initialTitle = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialTitle?: string;
  initialLeftLabel?: string;
  initialRightLabel?: string;
  initialLeftItems?: string[];
  initialRightItems?: string[];
  initialLeftColor?: ComparisonColor;
  initialRightColor?: ComparisonColor;
  onClose: () => void;
  onSave: (data: {
    title?: string;
    left_label: string;
    right_label: string;
    left_items: string[];
    right_items: string[];
    left_color: string;
    right_color: string;
  }) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [leftLabel, setLeftLabel] = useState(initialLeftLabel);
  const [rightLabel, setRightLabel] = useState(initialRightLabel);
  const [leftItems, setLeftItems] = useState<string[]>(initialLeftItems?.length ? initialLeftItems : [""]);
  const [rightItems, setRightItems] = useState<string[]>(initialRightItems?.length ? initialRightItems : [""]);
  const [leftColor, setLeftColor] = useState<ComparisonColor>(initialLeftColor);
  const [rightColor, setRightColor] = useState<ComparisonColor>(initialRightColor);
  const cleanLeftItems = useMemo(() => leftItems.map((item) => item.trim()).filter(Boolean), [leftItems]);
  const cleanRightItems = useMemo(() => rightItems.map((item) => item.trim()).filter(Boolean), [rightItems]);
  const canSave = cleanLeftItems.length + cleanRightItems.length > 0;

  const addLeft = () => setLeftItems([...leftItems, ""]);
  const addRight = () => setRightItems([...rightItems, ""]);
  const updateLeft = (i: number, value: string) =>
    setLeftItems(leftItems.map((item, index) => (index === i ? value : item)));
  const updateRight = (i: number, value: string) =>
    setRightItems(rightItems.map((item, index) => (index === i ? value : item)));
  const removeLeft = (i: number) => {
    if (leftItems.length <= 1) return;
    setLeftItems(leftItems.filter((_, index) => index !== i));
  };
  const removeRight = (i: number) => {
    if (rightItems.length <= 1) return;
    setRightItems(rightItems.filter((_, index) => index !== i));
  };

  function handleSave() {
    if (!canSave) return;
    onSave({
      title: title.trim() || undefined,
      left_label: leftLabel.trim() || "Linker kolom",
      right_label: rightLabel.trim() || "Rechter kolom",
      left_items: cleanLeftItems,
      right_items: cleanRightItems,
      left_color: leftColor,
      right_color: rightColor,
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Comparison"
      description="Pas de twee vergelijkingskolommen aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Comparison Block"
    >
      <div className="modal-field">
        <div className="m-label">Voorvertoning</div>
        <div className="comparison-preview">
          {title ? <div className="comparison-preview-title">{title}</div> : null}
          <div className="comparison-cols">
            <div
              className="comparison-col"
              style={{ background: COLORS[leftColor].bg, borderColor: COLORS[leftColor].border }}
            >
              <div className="comparison-col-label" style={{ color: COLORS[leftColor].dot }}>
                {leftLabel || "Linker kolom"}
              </div>
              {cleanLeftItems.map((item, i) => (
                <div className="comparison-col-item" key={i}>
                  <span className="comparison-dot" style={{ background: COLORS[leftColor].dot }} />
                  <span>{item}</span>
                </div>
              ))}
              {!cleanLeftItems.length ? <p className="comparison-empty">Voeg items toe...</p> : null}
            </div>
            <div
              className="comparison-col"
              style={{ background: COLORS[rightColor].bg, borderColor: COLORS[rightColor].border }}
            >
              <div className="comparison-col-label" style={{ color: COLORS[rightColor].dot }}>
                {rightLabel || "Rechter kolom"}
              </div>
              {cleanRightItems.map((item, i) => (
                <div className="comparison-col-item" key={i}>
                  <span className="comparison-dot" style={{ background: COLORS[rightColor].dot }} />
                  <span>{item}</span>
                </div>
              ))}
              {!cleanRightItems.length ? <p className="comparison-empty">Voeg items toe...</p> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="comparison-title">
          Titel <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="comparison-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Bijv. Wel/niet toegestaan onder de EU AI Act"
          type="text"
          value={title}
        />
      </div>

      <div className="quiz-settings">
        <div className="quiz-setting">
          <div className="quiz-setting-label">Label linker kolom</div>
          <input
            className="m-input"
            onChange={(event) => setLeftLabel(event.target.value)}
            placeholder="✓ Toegestaan"
            value={leftLabel}
          />
          <div className="color-row" style={{ marginTop: 6 }}>
            {Object.entries(COLORS).map(([key, color]) => (
              <button
                className={leftColor === key ? "color-swatch-sm selected" : "color-swatch-sm"}
                key={key}
                onClick={() => setLeftColor(key as ComparisonColor)}
                style={{ background: color.dot }}
                title={key}
                type="button"
              />
            ))}
          </div>
        </div>
        <div className="quiz-setting">
          <div className="quiz-setting-label">Label rechter kolom</div>
          <input
            className="m-input"
            onChange={(event) => setRightLabel(event.target.value)}
            placeholder="✕ Verboden"
            value={rightLabel}
          />
          <div className="color-row" style={{ marginTop: 6 }}>
            {Object.entries(COLORS).map(([key, color]) => (
              <button
                className={rightColor === key ? "color-swatch-sm selected" : "color-swatch-sm"}
                key={key}
                onClick={() => setRightColor(key as ComparisonColor)}
                style={{ background: color.dot }}
                title={key}
                type="button"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="comparison-editors">
        <div className="comparison-editor">
          <div className="comparison-editor-head">
            <span className="quiz-setting-label">{leftLabel}</span>
            <button className="add-btn" onClick={addLeft} type="button">
              + Item
            </button>
          </div>
          {leftItems.map((item, i) => (
            <div className="item-row" key={i}>
              <input
                className="m-input"
                onChange={(event) => updateLeft(i, event.target.value)}
                placeholder="Item..."
                style={{ flex: 1 }}
                value={item}
              />
              <button
                className="opt-remove"
                disabled={leftItems.length <= 1}
                onClick={() => removeLeft(i)}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="comparison-editor">
          <div className="comparison-editor-head">
            <span className="quiz-setting-label">{rightLabel}</span>
            <button className="add-btn" onClick={addRight} type="button">
              + Item
            </button>
          </div>
          {rightItems.map((item, i) => (
            <div className="item-row" key={i}>
              <input
                className="m-input"
                onChange={(event) => updateRight(i, event.target.value)}
                placeholder="Item..."
                style={{ flex: 1 }}
                value={item}
              />
              <button
                className="opt-remove"
                disabled={rightItems.length <= 1}
                onClick={() => removeRight(i)}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}
