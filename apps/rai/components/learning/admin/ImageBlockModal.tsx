"use client";

import { useEffect, useRef, useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";
import { uploadLessonFile } from "@/components/learning/admin/uploadLessonFile";

type ImageWidth = "small" | "medium" | "full";

const WIDTH_OPTIONS: Array<{ value: ImageWidth; label: string; desc: string }> = [
  { value: "small", label: "Klein", desc: "~40%" },
  { value: "medium", label: "Middel", desc: "~70%" },
  { value: "full", label: "Volledig", desc: "100%" },
];

export function ImageBlockModal({
  blockNumber,
  initialAlt = "",
  initialCaption = "",
  initialUrl = "",
  initialWidth = "full",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialUrl?: string;
  initialAlt?: string;
  initialCaption?: string;
  initialWidth?: ImageWidth;
  onClose: () => void;
  onSave: (data: {
    url: string;
    alt: string;
    caption?: string;
    width: ImageWidth;
  }) => void;
}) {
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [url, setUrl] = useState(initialUrl);
  const [alt, setAlt] = useState(initialAlt);
  const [caption, setCaption] = useState(initialCaption);
  const [width, setWidth] = useState<ImageWidth>(initialWidth);
  const [dragging, setDragging] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const uploadZoneRef = useRef<HTMLLabelElement>(null);
  const canSave = Boolean(url.trim()) && Boolean(alt.trim()) && !uploading;

  async function useImageFile(file: File | undefined) {
    if (!file || !isImageFile(file)) return;

    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    setImgError(false);
    setShowValidation(false);
    setUploadError("");
    if (!alt) setAlt(file.name.replace(/\.[^.]+$/, ""));

    setUploading(true);
    try {
      const publicUrl = await uploadLessonFile(file);
      setUrl(publicUrl);
    } catch (error) {
      setUrl("");
      setUploadError(error instanceof Error ? error.message : "Uploaden is niet gelukt.");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setUploading(false);
    }
  }

  function useImageUrl(nextUrl: string) {
    const trimmedUrl = nextUrl.trim();
    if (!trimmedUrl) return;

    setUrl(trimmedUrl);
    setImgError(false);
    setShowValidation(false);
    setUploadError("");
    if (!alt) {
      const name = getFileNameFromUrl(trimmedUrl);
      if (name) setAlt(name.replace(/\.[^.]+$/, ""));
    }
  }

  function handleDrop(dataTransfer: DataTransfer) {
    const droppedFile = getDroppedImageFile(dataTransfer);
    if (droppedFile) {
      useImageFile(droppedFile);
      return;
    }

    const droppedUrl = getDroppedUrl(dataTransfer);
    if (droppedUrl) {
      useImageUrl(droppedUrl);
    }
  }

  useEffect(() => {
    function isInsideUploadZone(event: DragEvent) {
      const rect = uploadZoneRef.current?.getBoundingClientRect();
      if (!rect) return false;

      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    }

    function preventBrowserFileOpen(event: DragEvent) {
      if (!event.dataTransfer || !hasImageDrop(event.dataTransfer)) return;

      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      setDragging(tab === "upload" && isInsideUploadZone(event));
    }

    function handleDocumentDrop(event: DragEvent) {
      if (!event.dataTransfer || !hasImageDrop(event.dataTransfer)) return;

      event.preventDefault();
      event.stopPropagation();
      setDragging(false);

      if (tab !== "upload") return;

      handleDrop(event.dataTransfer);
    }

    document.addEventListener("dragover", preventBrowserFileOpen, true);
    document.addEventListener("drop", handleDocumentDrop, true);

    return () => {
      document.removeEventListener("dragover", preventBrowserFileOpen, true);
      document.removeEventListener("drop", handleDocumentDrop, true);
    };
  }, [tab]);

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      url: url.trim(),
      alt: alt.trim(),
      caption: caption.trim() || undefined,
      width,
    });
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Afbeelding"
      description="Pas de afbeelding van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Image Block"
    >
      <div className="modal-field">
        <span className="m-label">
          Afbeelding <span className="m-label-opt">verplicht</span>
        </span>
        <div className="m-tabs">
          <button
            className={tab === "upload" ? "m-tab active" : "m-tab"}
            onClick={() => setTab("upload")}
            type="button"
          >
            Uploaden
          </button>
          <button
            className={tab === "url" ? "m-tab active" : "m-tab"}
            onClick={() => setTab("url")}
            type="button"
          >
            URL invoeren
          </button>
        </div>

        {tab === "upload" ? (
          <label
            className={[
              "upload-zone",
              dragging ? "dragging" : "",
              showValidation && !url.trim() ? "m-input-error" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            ref={uploadZoneRef}
            onDragEnter={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.dataTransfer.dropEffect = "copy";
              setDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDragging(false);
              handleDrop(event.dataTransfer);
            }}
            role="button"
            tabIndex={0}
          >
            <input
              accept="image/*"
              onChange={(event) => {
                useImageFile(event.target.files?.[0]);
              }}
              style={{ display: "none" }}
              type="file"
            />
            <div className="upload-icon">🖼</div>
            <p>
              {uploading
                ? "Afbeelding uploaden..."
                : dragging
                  ? "Laat los om de afbeelding toe te voegen"
                  : "Klik of sleep een afbeelding hierheen"}
            </p>
            <small>PNG, JPG, WebP, SVG - max 10MB</small>
          </label>
        ) : (
          <input
            className={showValidation && !url.trim() ? "m-input m-input-error" : "m-input"}
            onChange={(event) => {
              setUrl(event.target.value);
              setImgError(false);
              setShowValidation(false);
            }}
            placeholder="https://..."
            type="url"
            value={url}
          />
        )}
      </div>
      {uploadError ? <p className="m-hint m-error">{uploadError}</p> : null}

      {url && !imgError ? (
        <div className="image-preview-wrap">
          <img
            alt={alt || "Preview"}
            className={`image-preview image-preview-${width}`}
            onError={() => setImgError(true)}
            src={url}
          />
          {caption ? <p className="image-preview-caption">{caption}</p> : null}
        </div>
      ) : null}
      {imgError ? (
        <div className="iframe-empty">
          <p>Afbeelding kon niet worden geladen.</p>
          <small>Controleer de URL of upload het bestand.</small>
        </div>
      ) : null}

      <div className="modal-field">
        <label className="m-label" htmlFor="image-alt">
          Alt-tekst <span className="m-label-opt">verplicht</span>
        </label>
        <input
          className={showValidation && !alt.trim() ? "m-input m-input-error" : "m-input"}
          id="image-alt"
          onChange={(event) => {
            setAlt(event.target.value);
            setShowValidation(false);
          }}
          placeholder="Beschrijf wat er op de afbeelding staat"
          type="text"
          value={alt}
        />
        <div className="alt-notice">
          <span>♿</span>
          <p>
            Alt-tekst is verplicht voor toegankelijkheid. Beschrijf de inhoud, niet "afbeelding van...".
          </p>
        </div>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="image-caption">
          Bijschrift <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="image-caption"
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Bijv. Figuur 1: EU AI Act risicoklassen"
          type="text"
          value={caption}
        />
        <p className="m-hint">Wordt cursief onder de afbeelding weergegeven.</p>
      </div>

      <div className="modal-field">
        <div className="m-label">Breedte in de les</div>
        <div className="width-pills">
          {WIDTH_OPTIONS.map((option) => (
            <button
              className={width === option.value ? "width-pill active" : "width-pill"}
              key={option.value}
              onClick={() => setWidth(option.value)}
              type="button"
            >
              <strong>{option.label}</strong>
              <span>{option.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}

function getDroppedImageFile(dataTransfer: DataTransfer) {
  const itemFile = Array.from(dataTransfer.items ?? [])
    .find((item) => item.kind === "file")
    ?.getAsFile();

  if (itemFile && isImageFile(itemFile)) {
    return itemFile;
  }

  return Array.from(dataTransfer.files ?? []).find(isImageFile);
}

function hasImageDrop(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.items ?? []).some(
    (item) => item.kind === "file" || item.type.startsWith("image/"),
  ) || Array.from(dataTransfer.files ?? []).some(isImageFile);
}

function getDroppedUrl(dataTransfer: DataTransfer) {
  const uriList = dataTransfer.getData("text/uri-list");
  if (uriList) {
    return uriList
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#"));
  }

  const plainText = dataTransfer.getData("text/plain");
  if (/^https?:\/\//i.test(plainText.trim())) {
    return plainText.trim();
  }

  return "";
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|svg|gif)$/i.test(file.name);
}

function getFileNameFromUrl(value: string) {
  try {
    const pathname = new URL(value).pathname;
    return pathname.split("/").filter(Boolean).at(-1) ?? "";
  } catch {
    return "";
  }
}
