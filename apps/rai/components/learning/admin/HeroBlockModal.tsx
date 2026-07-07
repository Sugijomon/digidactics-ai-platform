"use client";

import { useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

const COLOR_KEYS = ["primary", "dark", "bright", "soft", "muted"] as const;
type ColorKey = (typeof COLOR_KEYS)[number];

const GRADIENTS: Record<ColorKey, string> = {
  primary: "linear-gradient(135deg, #00658b 0%, #00a1da 100%)",
  dark: "linear-gradient(135deg, #001e2b 0%, #00658b 100%)",
  bright: "linear-gradient(135deg, #00a1da 0%, #7dd0ff 100%)",
  soft: "linear-gradient(135deg, #bae6ff 0%, #c4e7ff 100%)",
  muted: "linear-gradient(135deg, #396379 0%, #6993aa 100%)",
};

const COLOR_LABELS: Record<string, string> = {
  primary: "Primary hero",
  dark: "Donkere hero",
  bright: "Helder blauw",
  soft: "Licht blauw",
  muted: "Blue-grey",
};

export function HeroBlockModal({
  blockNumber,
  initialColor = "primary",
  initialSubtitle,
  initialTitle,
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialTitle?: string;
  initialSubtitle?: string;
  initialColor?: string;
  onClose: () => void;
  onSave: (data: {
    title: string;
    subtitle?: string;
    background_color: string;
  }) => void;
}) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [subtitle, setSubtitle] = useState(initialSubtitle ?? "");
  const [color, setColor] = useState(initialColor ?? "green");
  const [showValidation, setShowValidation] = useState(false);
  const safeColor: ColorKey = normalizeHeroColor(color);
  const canSave = Boolean(title.trim());

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      background_color: color,
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Hero"
      description="Pas de inhoud van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      title="Edit Hero Block"
    >
      <div className="modal-field">
        <span className="preview-label">Voorvertoning</span>
        <div className="hero-preview" style={{ background: GRADIENTS[safeColor] }}>
          <div className={title ? "hero-preview-title" : "hero-preview-title empty"}>
            {title || "Titel..."}
          </div>
          {(subtitle || !title) && (
            <div className={subtitle ? "hero-preview-sub" : "hero-preview-sub empty"}>
              {subtitle || "Ondertitel..."}
            </div>
          )}
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="hero-block-title">
          Titel <span className="m-label-opt">verplicht</span>
        </label>
        <input
          className={showValidation && !canSave ? "m-input m-input-error" : "m-input"}
          id="hero-block-title"
          onChange={(event) => {
            setTitle(event.target.value);
            setShowValidation(false);
          }}
          placeholder="Welkom bij deze les"
          type="text"
          value={title}
        />
        {showValidation && !canSave ? (
          <span className="field-error">Vul een titel in</span>
        ) : null}
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="hero-block-subtitle">
          Ondertitel <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="hero-block-subtitle"
          onChange={(event) => setSubtitle(event.target.value)}
          placeholder="Een korte introductiezin…"
          type="text"
          value={subtitle}
        />
      </div>

      <div className="modal-field">
        <span className="m-label">
          Achtergrondkleur <span className="m-label-opt">optioneel</span>
        </span>
        <div className="color-row">
          {COLOR_KEYS.map((key) => (
            <button
              className={color === key ? `color-swatch color-swatch-${key} selected` : `color-swatch color-swatch-${key}`}
              key={key}
              onClick={() => setColor(key)}
              title={COLOR_LABELS[key]}
              type="button"
            />
          ))}
          <span className="color-label">Klik om te kiezen</span>
        </div>
      </div>
    </ModalShell>
  );
}

function normalizeHeroColor(value: string): ColorKey {
  if (COLOR_KEYS.includes(value as ColorKey)) return value as ColorKey;
  if (value === "green" || value === "blue") return "primary";
  if (value === "purple" || value === "amber") return "bright";
  return "dark";
}
