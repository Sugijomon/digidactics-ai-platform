"use client";

import { useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

const H5P_TYPES = [
  { value: "dragdrop", label: "Drag & Drop", icon: "D", desc: "Versleep items naar de juiste plek" },
  { value: "hotspot", label: "Image Hotspot", icon: "H", desc: "Klik op onderdelen van een afbeelding" },
  { value: "fill_blank", label: "Fill in the Blanks", icon: "F", desc: "Vul ontbrekende woorden in" },
  { value: "quiz", label: "Quiz (H5P)", icon: "Q", desc: "Interactieve quizvorm" },
  { value: "interactive_video", label: "Interactive Video", icon: "V", desc: "Video met ingebedde vragen" },
  { value: "flashcards", label: "Flashcards", icon: "C", desc: "Kaartjes omdraaien voor definities" },
  { value: "branching", label: "Branching Scenario", icon: "B", desc: "Keuze-gebaseerd leerpad" },
  { value: "other", label: "Overig", icon: "O", desc: "Andere H5P activiteit" },
] as const;

type H5PSaveData = {
  url: string;
  title: string;
  height: number;
  activity_type: string;
};

export function EmbedH5PBlockModal({
  blockNumber,
  initialActivityType = "",
  initialHeight = 400,
  initialTitle = "",
  initialUrl = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialUrl?: string;
  initialTitle?: string;
  initialHeight?: number;
  initialActivityType?: string;
  onClose: () => void;
  onSave: (data: H5PSaveData) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState(initialTitle);
  const [height, setHeight] = useState(initialHeight);
  const [activityType, setActivityType] = useState(initialActivityType);
  const [previewError, setPreviewError] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const canSave = Boolean(url.trim()) && Boolean(title.trim());

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      url: url.trim(),
      title: title.trim(),
      height: Math.min(900, Math.max(200, Number(height) || 400)),
      activity_type: activityType,
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="H5P"
      description="Pas de H5P activiteit van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit H5P Embed Block"
    >
      <div className="modal-field">
        <div className="m-label">
          Type H5P activiteit <span className="m-label-opt">optioneel</span>
        </div>
        <div className="h5p-type-grid">
          {H5P_TYPES.map((type) => (
            <button
              className={activityType === type.value ? "h5p-type-btn active" : "h5p-type-btn"}
              key={type.value}
              onClick={() => setActivityType(type.value)}
              type="button"
            >
              <span className="h5p-type-icon">{type.icon}</span>
              <strong>{type.label}</strong>
              <span>{type.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="h5p-url">
          H5P embed URL <span className="m-label-opt">verplicht</span>
        </label>
        <input
          className={showValidation && !url.trim() ? "m-input m-input-error" : "m-input"}
          id="h5p-url"
          onChange={(event) => {
            setUrl(event.target.value);
            setPreviewError(false);
            setShowValidation(false);
          }}
          placeholder="https://h5p.org/h5p/embed/... of eigen server"
          type="url"
          value={url}
        />
        <p className="m-hint">
          Kopieer de embed-URL uit H5P.org of je eigen H5P-server. Gebruik de embed-link, niet de gewone pagina-URL.
        </p>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="h5p-title">
          Titel <span className="m-label-opt">verplicht</span>
        </label>
        <input
          className={showValidation && !title.trim() ? "m-input m-input-error" : "m-input"}
          id="h5p-title"
          onChange={(event) => {
            setTitle(event.target.value);
            setShowValidation(false);
          }}
          placeholder="Bijv. Oefening: AI-risico's classificeren"
          type="text"
          value={title}
        />
        <p className="m-hint">Wordt als toegankelijkheidslabel voor de iframe gebruikt.</p>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="h5p-height">
          Hoogte (px)
        </label>
        <input
          className="m-input"
          id="h5p-height"
          max="900"
          min="200"
          onChange={(event) => setHeight(Number(event.target.value))}
          type="number"
          value={height}
        />
        <p className="m-hint">H5P activiteiten hebben vaak een vaste hoogte. Pas aan totdat de activiteit goed past.</p>
      </div>

      <div className="modal-field">
        <div className="m-label">Voorvertoning</div>
        {!url.trim() ? (
          <div className="iframe-empty">
            <div className="iframe-empty-icon">H5P</div>
            <p>Voer een H5P embed-URL in om de activiteit te voorvertonen.</p>
          </div>
        ) : (
          <div className="iframe-preview" style={{ height: `${Math.min(height, 280)}px` }}>
            <iframe
              height="100%"
              onError={() => setPreviewError(true)}
              src={url}
              style={{ border: "none" }}
              title={title || "H5P preview"}
              width="100%"
            />
            {previewError ? (
              <div className="iframe-preview-error">
                <p>Deze H5P URL blokkeert embedding in de editor.</p>
                <small>Test na het opslaan in de gepubliceerde les.</small>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="review-notice">
        <span>i</span>
        <div>
          <strong>H5P vereist externe hosting</strong>
          <p>
            De activiteit wordt geladen van een externe H5P-server. Zorg dat de server embedding toestaat en publiek
            toegankelijk is voor leerlingen. Test na opslaan in de gepubliceerde les.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
