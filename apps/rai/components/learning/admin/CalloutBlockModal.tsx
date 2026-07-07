"use client";

import { useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

type Tone = "tip" | "info" | "warning";

const TONE_LABELS: Record<Tone, string> = {
  tip: "Tip",
  info: "Info",
  warning: "Waarschuwing",
};

const SELECTED_CLASS: Record<Tone, string> = {
  tip: "selected-tip",
  info: "selected-info",
  warning: "selected-warning",
};

const TONE_ICONS: Record<Tone, string> = {
  tip: "💡",
  info: "ℹ️",
  warning: "⚠️",
};

export function CalloutBlockModal({
  blockNumber,
  initialContent,
  initialTitle,
  initialTone = "info",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialTone?: Tone;
  initialTitle?: string;
  initialContent?: string;
  onClose: () => void;
  onSave: (data: {
    tone: Tone;
    title?: string;
    content: string;
  }) => void;
}) {
  const [tone, setTone] = useState<Tone>(initialTone ?? "info");
  const [title, setTitle] = useState(initialTitle ?? "");
  const [content, setContent] = useState(initialContent ?? "");
  const [showValidation, setShowValidation] = useState(false);
  const canSave = Boolean(content.trim());

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      tone,
      title: title.trim() || undefined,
      content: content.trim(),
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Callout"
      description="Pas de inhoud van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      title="Edit Callout Block"
    >
      <div className="modal-field">
        <span className="m-label">Type</span>
        <div className="tone-pills">
          {(["tip", "info", "warning"] as const).map((item) => (
            <button
              className={tone === item ? `tone-pill ${SELECTED_CLASS[item]}` : "tone-pill"}
              key={item}
              onClick={() => setTone(item)}
              type="button"
            >
              <span className={`tone-dot dot-${item}`} />
              {TONE_LABELS[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="modal-field">
        <span className="preview-label">Voorvertoning</span>
        <div className={`callout-preview callout-${tone}`}>
          <span className="callout-icon">{TONE_ICONS[tone]}</span>
          <div>
            {title ? <div className="callout-content-title">{title}</div> : null}
            <div className="callout-content-body">
              {content || <em className="empty">De inhoud verschijnt hier…</em>}
            </div>
          </div>
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="callout-block-title">
          Titel <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="callout-block-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Bijv. Let op! of Tip:"
          type="text"
          value={title}
        />
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="callout-block-content">
          Inhoud <span className="m-label-opt">verplicht</span>
        </label>
        <textarea
          className={showValidation && !canSave ? "m-textarea m-input-error" : "m-textarea"}
          id="callout-block-content"
          onChange={(event) => {
            setContent(event.target.value);
            setShowValidation(false);
          }}
          placeholder="De inhoud van de callout…"
          value={content}
        />
        {showValidation && !canSave ? (
          <span className="field-error">Vul de inhoud van de callout in</span>
        ) : null}
      </div>
    </ModalShell>
  );
}
