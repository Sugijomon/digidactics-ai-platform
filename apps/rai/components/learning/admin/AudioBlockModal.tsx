"use client";

import { useEffect, useState } from "react";
import { ModalShell } from "./ModalShell";
import { uploadLessonFile } from "./uploadLessonFile";

type AudioSaveData = {
  file_url: string;
  file_name: string;
  title?: string;
  duration_seconds?: number;
};

export function AudioBlockModal({
  blockNumber,
  initialFileName,
  initialFileUrl,
  initialTitle,
  initialDurationSeconds,
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialFileUrl?: string;
  initialFileName?: string;
  initialTitle?: string;
  initialDurationSeconds?: number;
  onClose: () => void;
  onSave: (data: AudioSaveData) => void;
}) {
  const [tab, setTab] = useState<"upload" | "url">(initialFileUrl ? "url" : "upload");
  const [fileUrl, setFileUrl] = useState(initialFileUrl ?? "");
  const [fileName, setFileName] = useState(initialFileName ?? "");
  const [title, setTitle] = useState(initialTitle ?? "");
  const [durationSeconds, setDurationSeconds] = useState(initialDurationSeconds);
  const [dragging, setDragging] = useState(false);
  const [triedSave, setTriedSave] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const canSave = Boolean(fileUrl.trim()) && Boolean(fileName.trim()) && !uploading;

  useEffect(() => {
    if (!initialFileUrl?.trim() || initialDurationSeconds) return;
    readAudioDuration(initialFileUrl.trim()).then(setDurationSeconds).catch(() => setDurationSeconds(undefined));
  }, [initialDurationSeconds, initialFileUrl]);

  const applyFile = async (file: File) => {
    if (!isAudioFile(file)) return;
    setFileName(file.name);
    const objectUrl = URL.createObjectURL(file);
    setFileUrl("");
    setUploadError("");
    setUploading(true);
    readAudioDuration(objectUrl).then(setDurationSeconds).catch(() => setDurationSeconds(undefined));
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, ""));
    }

    try {
      const publicUrl = await uploadLessonFile(file);
      setFileUrl(publicUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Uploaden is niet gelukt.");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setUploading(false);
    }
  };

  const handleSave = () => {
    setTriedSave(true);
    if (!canSave) return;

    onSave({
      file_url: fileUrl.trim(),
      file_name: fileName.trim(),
      title: title.trim() || undefined,
      duration_seconds: durationSeconds,
    });
  };

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Audio"
      description="Voeg een audiobestand of externe audiolink toe."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Audio bewerken"
    >
      <div className="modal-field">
        <div className="m-label">
          Audio <span className="m-label-opt">verplicht</span>
        </div>
        <div className="m-tabs">
          <button className={`m-tab ${tab === "upload" ? "active" : ""}`} onClick={() => setTab("upload")} type="button">
            Uploaden
          </button>
          <button className={`m-tab ${tab === "url" ? "active" : ""}`} onClick={() => setTab("url")} type="button">
            URL invoeren
          </button>
        </div>

        {tab === "upload" ? (
          <label
            className={`upload-zone ${dragging ? "dragging" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDragging(false);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.dataTransfer.dropEffect = "copy";
              setDragging(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDragging(false);
              const file = event.dataTransfer.files[0];
              if (file) applyFile(file);
            }}
          >
            <input
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) applyFile(file);
              }}
              style={{ display: "none" }}
              type="file"
            />
            <div className="upload-icon">♪</div>
            <p>{uploading ? "Audio uploaden..." : "Klik of sleep een audiobestand hierheen"}</p>
            <small>MP3, WAV, M4A, OGG - max 50MB</small>
          </label>
        ) : (
          <div>
            <input
              className="m-input"
              onChange={(event) => {
                setFileUrl(event.target.value);
                setDurationSeconds(undefined);
              }}
              onBlur={() => {
                const nextUrl = fileUrl.trim();
                if (!nextUrl) return;
                readAudioDuration(nextUrl).then(setDurationSeconds).catch(() => setDurationSeconds(undefined));
              }}
              placeholder="https://..."
              type="url"
              value={fileUrl}
            />
            <p className="m-hint">Directe link naar een audiobestand.</p>
          </div>
        )}
        {triedSave && !fileUrl.trim() ? (
          <p className="m-hint" style={{ color: "var(--accent)" }}>
            Voeg een audiobestand of audio-URL toe.
          </p>
        ) : null}
        {uploadError ? <p className="m-hint m-error">{uploadError}</p> : null}
      </div>

      <div className="modal-field">
        <div className="m-label">
          Titel <span className="m-label-opt">optioneel</span>
        </div>
        <input
          className="m-input"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Bijv. Introductie audio"
          type="text"
          value={title}
        />
        <p className="m-hint">Wordt als naam in de audio player getoond.</p>
      </div>

      <div className="modal-field">
        <div className="m-label">
          Bestandsnaam <span className="m-label-opt">verplicht</span>
        </div>
        <input
          className="m-input"
          onChange={(event) => setFileName(event.target.value)}
          placeholder="audio.mp3"
          type="text"
          value={fileName}
        />
        {triedSave && !fileName.trim() ? (
          <p className="m-hint" style={{ color: "var(--accent)" }}>
            Vul een bestandsnaam in.
          </p>
        ) : null}
      </div>

      {(fileName || fileUrl) && (
        <div className="download-preview">
          <div className="download-preview-icon">♪</div>
          <div>
            <strong>{title || fileName || "Audio"}</strong>
            {fileName ? <p>{durationSeconds ? `${fileName} - ${formatTime(durationSeconds)}` : fileName}</p> : null}
          </div>
          <span className="download-preview-btn">Audio</span>
        </div>
      )}
    </ModalShell>
  );
}

function isAudioFile(file: File) {
  if (file.type.startsWith("audio/")) return true;
  return /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name);
}

function readAudioDuration(src: string) {
  return new Promise<number | undefined>((resolve) => {
    const audio = document.createElement("audio");
    const cleanup = () => {
      audio.removeAttribute("src");
      audio.load();
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : undefined;
      cleanup();
      resolve(duration);
    };
    audio.onerror = () => {
      cleanup();
      resolve(undefined);
    };
    audio.src = src;
  });
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
