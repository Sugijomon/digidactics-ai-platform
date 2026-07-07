"use client";

import { useState } from "react";
import type { LearningEvidenceKind } from "@digidactics/domain/learning";
import { ModalShell } from "@/components/learning/admin/ModalShell";

const DEFAULT_HEIGHTS: Record<string, number> = {
  Typeform: 600,
  Miro: 500,
  "Google Maps": 400,
  H5P: 400,
  Figma: 600,
  Loom: 400,
  Airtable: 500,
  Notion: 500,
};

const PROVIDERS = [
  { name: "Typeform", icon: "📋" },
  { name: "Miro", icon: "🗂" },
  { name: "Google Maps", icon: "🗺" },
  { name: "H5P", icon: "🎮" },
  { name: "Figma", icon: "🎨" },
  { name: "Loom", icon: "🎬" },
] as const;

function detectProvider(url: string): string {
  if (url.includes("typeform.com")) return "Typeform";
  if (url.includes("miro.com")) return "Miro";
  if (url.includes("maps.google") || url.includes("google.com/maps")) return "Google Maps";
  if (url.includes("h5p.org") || url.includes("h5p.com")) return "H5P";
  if (url.includes("figma.com")) return "Figma";
  if (url.includes("loom.com")) return "Loom";
  if (url.includes("airtable.com")) return "Airtable";
  if (url.includes("notion.so")) return "Notion";
  return "";
}

export function IframeBlockModal({
  blockNumber,
  initialAllowFullscreen = true,
  initialHeight = 500,
  initialProvider = "",
  initialEvidenceKind = "none",
  initialTitle = "",
  initialUrl = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialUrl?: string;
  initialTitle?: string;
  initialHeight?: number;
  initialAllowFullscreen?: boolean;
  initialProvider?: string;
  initialEvidenceKind?: LearningEvidenceKind;
  onClose: () => void;
  onSave: (data: {
    url: string;
    title: string;
    height: number;
    provider: string;
    allow_fullscreen: boolean;
    evidence_kind: LearningEvidenceKind;
  }) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState(initialTitle);
  const [height, setHeight] = useState(initialHeight);
  const [allowFullscreen, setAllowFullscreen] = useState(initialAllowFullscreen);
  const [requireInteraction, setRequireInteraction] = useState(initialEvidenceKind !== "none");
  const [detectedProvider, setDetectedProvider] = useState(initialProvider || detectProvider(initialUrl));
  const [previewError, setPreviewError] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const canSave = Boolean(url.trim()) && Boolean(title.trim());

  function updateUrl(value: string) {
    setUrl(value);
    setPreviewError(false);
    const provider = detectProvider(value);
    setDetectedProvider(provider);
    if (provider && DEFAULT_HEIGHTS[provider]) {
      setHeight(DEFAULT_HEIGHTS[provider]);
    }
  }

  function chooseProvider(provider: string) {
    setDetectedProvider(provider);
    if (DEFAULT_HEIGHTS[provider]) {
      setHeight(DEFAULT_HEIGHTS[provider]);
    }
  }

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      url: url.trim(),
      title: title.trim(),
      height: Math.min(1200, Math.max(200, Number(height) || 500)),
      provider: detectedProvider || detectProvider(url),
      allow_fullscreen: allowFullscreen,
      evidence_kind: requireInteraction ? "self_check" : "none",
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Iframe"
      description="Pas de externe embed van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Iframe Block"
    >
      <div className="modal-field">
        <label className="m-label" htmlFor="iframe-url">
          Embed URL <span className="m-label-opt">verplicht</span>
        </label>
        <input
          className={showValidation && !url.trim() ? "m-input m-input-error" : "m-input"}
          id="iframe-url"
          onChange={(event) => {
            updateUrl(event.target.value);
            setShowValidation(false);
          }}
          placeholder="https://..."
          type="url"
          value={url}
        />
        {detectedProvider ? (
          <div className="provider-detected">
            <span className="provider-dot" />
            {detectedProvider} herkend - standaardhoogte ingesteld
          </div>
        ) : null}
      </div>

      <div className="modal-field">
        <div className="m-label">Bekende providers</div>
        <div className="provider-pills">
          {PROVIDERS.map((provider) => (
            <button
              className={detectedProvider === provider.name ? "provider-pill active" : "provider-pill"}
              key={provider.name}
              onClick={() => chooseProvider(provider.name)}
              type="button"
            >
              {provider.icon} {provider.name}
            </button>
          ))}
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="iframe-title">
          Titel <span className="m-label-opt">verplicht</span>
        </label>
        <input
          className={showValidation && !title.trim() ? "m-input m-input-error" : "m-input"}
          id="iframe-title"
          onChange={(event) => {
            setTitle(event.target.value);
            setShowValidation(false);
          }}
          placeholder="Bijv. Typeform enquete, Miro-bord"
          type="text"
          value={title}
        />
        <p className="m-hint">Wordt als toegankelijkheidslabel gebruikt (niet zichtbaar).</p>
      </div>

      <div className="quiz-settings">
        <div className="quiz-setting">
          <div className="quiz-setting-label">Hoogte (px)</div>
          <input
            className="m-input"
            max="1200"
            min="200"
            onChange={(event) => setHeight(Number(event.target.value))}
            type="number"
            value={height}
          />
          <p className="m-hint">Min. 200px, max. 1200px.</p>
        </div>
        <div className="quiz-setting">
          <div className="quiz-setting-label">Volledig scherm</div>
          <label className="toggle-row" style={{ marginTop: 8 }}>
            <div className="toggle-switch">
              <input
                checked={allowFullscreen}
                onChange={(event) => setAllowFullscreen(event.target.checked)}
                type="checkbox"
              />
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
            </div>
            <span className="toggle-label">Toestaan</span>
          </label>
        </div>
        <div className="quiz-setting">
          <div className="quiz-setting-label">Interactie vereist</div>
          <label className="toggle-row" style={{ marginTop: 8 }}>
            <div className="toggle-switch">
              <input
                checked={requireInteraction}
                onChange={(event) => setRequireInteraction(event.target.checked)}
                type="checkbox"
              />
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
            </div>
            <span className="toggle-label">Meetellen voor voortgang</span>
          </label>
          <p className="m-hint">De embed moet een Digidactics completion-event versturen.</p>
        </div>
      </div>

      <div className="modal-field">
        <div className="m-label">Voorvertoning</div>
        {!url.trim() ? (
          <div className="iframe-empty">
            <div className="iframe-empty-icon">⬚</div>
            <p>Voer een URL in om de embed te voorvertonen.</p>
            <small>Niet alle externe tools staan embedding toe. Test na het opslaan in de les.</small>
          </div>
        ) : (
          <div className="iframe-preview" style={{ height: `${Math.min(height, 300)}px` }}>
            <iframe
              allowFullScreen={allowFullscreen}
              height="100%"
              onError={() => setPreviewError(true)}
              src={url}
              style={{ border: "none" }}
              title={title || "Embed preview"}
              width="100%"
            />
            {previewError ? (
              <div className="iframe-preview-error">
                <p>Deze URL blokkeert embedding in de editor.</p>
                <small>De embed werkt mogelijk wel in de gepubliceerde les.</small>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="review-notice">
        <span>⚠</span>
        <div>
          <strong>Externe content</strong>
          <p>
            De embed laadt content van een externe server. Controleer of de tool embedding toestaat en of de URL publiek
            toegankelijk is voor leerlingen.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
