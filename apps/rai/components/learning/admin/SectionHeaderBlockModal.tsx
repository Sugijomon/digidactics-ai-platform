"use client";

import { useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

export function SectionHeaderBlockModal({
  blockNumber,
  initialSubtitle,
  initialTitle,
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialTitle?: string;
  initialSubtitle?: string;
  onClose: () => void;
  onSave: (data: { title: string; subtitle?: string }) => void;
}) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [subtitle, setSubtitle] = useState(initialSubtitle ?? "");

  function handleSave() {
    onSave({
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Sectielijn"
      description="Pas de lijn met sectienaam aan."
      onClose={onClose}
      onSave={handleSave}
      title="Sectielijn bewerken"
    >
      <div className="modal-field">
        <span className="preview-label">Voorvertoning</span>
        <div className="section-preview">
          <div className="section-preview-inner">
            <div className="section-preview-title">
              {title || <span className="empty">Sectielijn...</span>}
            </div>
            {subtitle ? <div className="section-preview-sub">{subtitle}</div> : null}
          </div>
          <div className="section-preview-line" />
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="section-block-title">
          Sectienaam <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="section-block-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Bijv. Deel 1: Inleiding"
          type="text"
          value={title}
        />
        <p className="m-hint">Laat leeg voor alleen een horizontale sectielijn.</p>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="section-block-subtitle">
          Ondertitel <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="section-block-subtitle"
          onChange={(event) => setSubtitle(event.target.value)}
          placeholder="Een korte beschrijving van dit onderdeel..."
          type="text"
          value={subtitle}
        />
      </div>
    </ModalShell>
  );
}
