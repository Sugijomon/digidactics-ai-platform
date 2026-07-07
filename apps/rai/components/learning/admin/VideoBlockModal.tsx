"use client";

import { useMemo, useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

export function VideoBlockModal({
  blockNumber,
  initialCaption = "",
  initialDurationSeconds,
  initialRequired = false,
  initialTranscript = "",
  initialUrl = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialUrl?: string;
  initialCaption?: string;
  initialDurationSeconds?: number;
  initialTranscript?: string;
  initialRequired?: boolean;
  onClose: () => void;
  onSave: (data: {
    url: string;
    caption?: string;
    duration_seconds?: number;
    transcript?: string;
    require_full_watch: boolean;
  }) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [caption, setCaption] = useState(initialCaption);
  const [durationSeconds, setDurationSeconds] = useState(
    initialDurationSeconds ? String(initialDurationSeconds) : "",
  );
  const [transcript, setTranscript] = useState(initialTranscript);
  const [requireFullWatch, setRequireFullWatch] = useState(initialRequired);
  const [showValidation, setShowValidation] = useState(false);
  const embedUrl = useMemo(() => getEmbedUrl(url), [url]);
  const canSave = Boolean(url.trim() && embedUrl);

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    const parsedDuration = Number(durationSeconds);
    onSave({
      url: url.trim(),
      caption: caption.trim() || undefined,
      duration_seconds: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined,
      transcript: transcript.trim() || undefined,
      require_full_watch: requireFullWatch,
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Video"
      description="Pas de inhoud van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      title="Edit Video Block"
    >
      <div className="modal-field">
        <label className="m-label" htmlFor="video-block-url">
          Video URL <span className="m-label-opt">verplicht</span>
        </label>
        <input
          className={showValidation && !canSave ? "m-input m-input-error" : "m-input"}
          id="video-block-url"
          onChange={(event) => {
            setUrl(event.target.value);
            setShowValidation(false);
          }}
          placeholder="https://www.youtube.com/watch?v=… of https://vimeo.com/…"
          type="url"
          value={url}
        />
        <div className="provider-row">
          <span className="provider-badge">
            <span className="dot dot-yt" />
            YouTube
          </span>
          <span className="provider-badge">
            <span className="dot dot-vm" />
            Vimeo
          </span>
          <span className="provider-badge">Directe video URL</span>
        </div>
        {showValidation && !canSave ? (
          <span className="field-error">Voer een geldige YouTube of Vimeo URL in</span>
        ) : null}
      </div>

      <div className="video-preview">
        {embedUrl ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            src={embedUrl}
            title={caption || "Video preview"}
          />
        ) : (
          <div className="video-preview-empty">
            <span>▶</span>
            <p>Voer een URL in om de video te voorvertonen</p>
          </div>
        )}
      </div>

      <div className="modal-two-column">
        <div className="modal-field">
          <label className="m-label" htmlFor="video-block-caption">
            Bijschrift <span className="m-label-opt">optioneel</span>
          </label>
          <input
            className="m-input"
            id="video-block-caption"
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Bijv. Introductie AI Act"
            type="text"
            value={caption}
          />
        </div>
        <div className="modal-field">
          <label className="m-label" htmlFor="video-block-duration">
            Duur <span className="m-label-opt">optioneel</span>
          </label>
          <input
            className="m-input"
            id="video-block-duration"
            onChange={(event) => setDurationSeconds(event.target.value)}
            placeholder="bijv. 180"
            type="number"
            value={durationSeconds}
          />
          <span className="m-hint">In seconden — voor de voortgangsbalk.</span>
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="video-block-transcript">
          Transcript <span className="m-label-opt">optioneel</span>
        </label>
        <textarea
          className="m-textarea"
          id="video-block-transcript"
          onChange={(event) => setTranscript(event.target.value)}
          placeholder="Plak hier het videotranscript…"
          value={transcript}
        />
        <span className="m-hint">Wordt weergegeven als uitklapbare sectie onder de video.</span>
      </div>

      <label className="check-row">
        <input
          checked={requireFullWatch}
          onChange={(event) => setRequireFullWatch(event.target.checked)}
          type="checkbox"
        />
        <div>
          <strong>Verplicht kijken</strong>
          <small>Gebruiker moet de volledige video kijken voordat hij verder kan.</small>
        </div>
      </label>
    </ModalShell>
  );
}

export function getEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }

  return null;
}
