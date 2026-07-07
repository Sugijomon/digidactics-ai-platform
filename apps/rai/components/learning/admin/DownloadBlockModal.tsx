"use client";

import { useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";
import { uploadLessonFile } from "@/components/learning/admin/uploadLessonFile";

export function DownloadBlockModal({
  blockNumber,
  initialDescription = "",
  initialFileName = "",
  initialFileSizeLabel = "",
  initialFileUrl = "",
  initialLabel = "Download",
  initialMimeType = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialFileUrl?: string;
  initialFileName?: string;
  initialFileSizeLabel?: string;
  initialDescription?: string;
  initialLabel?: string;
  initialMimeType?: string;
  onClose: () => void;
  onSave: (data: {
    file_url: string;
    file_name: string;
    file_size_label?: string;
    mime_type?: string;
    description?: string;
    label: string;
  }) => void;
}) {
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [fileUrl, setFileUrl] = useState(initialFileUrl);
  const [fileName, setFileName] = useState(initialFileName);
  const [fileSizeLabel, setFileSizeLabel] = useState(initialFileSizeLabel);
  const [mimeType, setMimeType] = useState(initialMimeType);
  const [description, setDescription] = useState(initialDescription);
  const [label, setLabel] = useState(initialLabel || "Download");
  const [dragging, setDragging] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const missingUrl = tab === "url" && !fileUrl.trim();
  const missingUploadUrl = tab === "upload" && !fileUrl.trim();
  const canSave = Boolean(fileName.trim()) && !missingUrl && !missingUploadUrl && !uploading;

  function handleSave() {
    if (!canSave) {
      setShowValidation(true);
      return;
    }

    onSave({
      file_url: fileUrl.trim(),
      file_name: fileName.trim(),
      file_size_label: fileSizeLabel.trim() || undefined,
      mime_type: mimeType.trim() || undefined,
      description: description.trim() || undefined,
      label: label.trim() || "Download",
    });
  }

  async function applyFile(file: File) {
    setFileName(file.name);
    setFileSizeLabel(formatFileSize(file.size));
    setMimeType(file.type);
    setShowValidation(false);
    setUploadError("");
    setUploading(true);

    try {
      const publicUrl = await uploadLessonFile(file);
      setFileUrl(publicUrl);
    } catch (error) {
      setFileUrl("");
      setUploadError(error instanceof Error ? error.message : "Uploaden is niet gelukt.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Download"
      description="Pas de inhoud van dit blok aan."
      onClose={onClose}
      onSave={handleSave}
      saveDisabled={!canSave}
      title="Edit Download Block"
    >
      <div className="modal-field">
        <span className="m-label">Bestand</span>
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
            className={dragging ? "upload-zone dragging" : "upload-zone"}
            onDragLeave={() => setDragging(false)}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files[0];
              if (file) applyFile(file);
            }}
          >
            <input
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) applyFile(file);
              }}
              style={{ display: "none" }}
              type="file"
            />
            <div className="upload-icon">↑</div>
            <p>{uploading ? "Bestand uploaden..." : "Klik om een bestand te uploaden"}</p>
            <small>PDF, Word, Excel, afbeeldingen - max 20MB</small>
          </label>
        ) : (
          <div>
            <input
              className={showValidation && missingUrl ? "m-input m-input-error" : "m-input"}
              onChange={(event) => {
                setFileUrl(event.target.value);
                setShowValidation(false);
                setUploadError("");
              }}
              placeholder="https://..."
              type="url"
              value={fileUrl}
            />
            <p className={showValidation && missingUrl ? "m-hint m-error" : "m-hint"}>
              Directe link naar het bestand (Supabase Storage of extern).
            </p>
          </div>
        )}
        {showValidation && missingUploadUrl ? (
          <p className="m-hint m-error">Upload eerst een bestand of kies URL invoeren.</p>
        ) : null}
        {uploadError ? <p className="m-hint m-error">{uploadError}</p> : null}
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="download-file-name">
          Bestandsnaam (weergave)
        </label>
        <input
          className={showValidation && !fileName.trim() ? "m-input m-input-error" : "m-input"}
          id="download-file-name"
          onChange={(event) => {
            setFileName(event.target.value);
            setShowValidation(false);
          }}
          placeholder="document.pdf"
          value={fileName}
        />
        <p className={showValidation && !fileName.trim() ? "m-hint m-error" : "m-hint"}>
          Wordt getoond als linktekst in de les.
        </p>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="download-description">
          Omschrijving <span className="m-label-opt">optioneel</span>
        </label>
        <textarea
          className="m-textarea compact"
          id="download-description"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Korte omschrijving van het bestand..."
          value={description}
        />
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="download-file-size">
          Metadata <span className="m-label-opt">optioneel</span>
        </label>
        <input
          className="m-input"
          id="download-file-size"
          onChange={(event) => setFileSizeLabel(event.target.value)}
          placeholder="Bijv. 2.4 MB"
          value={fileSizeLabel}
        />
        <p className="m-hint">Wordt naast het bestandstype getoond, zoals PDF - 2.4 MB.</p>
      </div>

      <div className="modal-field">
        <label className="m-label" htmlFor="download-label">
          Knoptekst
        </label>
        <input
          className="m-input"
          id="download-label"
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Download"
          value={label}
        />
        <p className="m-hint">Tekst op de downloadknop, standaard 'Download'.</p>
      </div>

      {fileName || fileUrl ? (
        <div className="download-preview">
          <div className="download-preview-icon">↓</div>
          <div>
            <strong>{fileName || "Bestand"}</strong>
            <p>
              {getFileTypeLabel(fileName, mimeType)}
              {fileSizeLabel ? ` - ${fileSizeLabel}` : ""}
            </p>
          </div>
          <span className="download-preview-btn">{label || "Download"}</span>
        </div>
      ) : null}
    </ModalShell>
  );
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function getFileTypeLabel(fileName: string, mimeType: string) {
  const extension = fileName.split("?")[0]?.split(".").pop()?.trim().toUpperCase();
  if (extension && extension.length <= 6 && extension !== fileName.toUpperCase()) return extension;
  if (mimeType.includes("/")) return mimeType.split("/").pop()?.toUpperCase() || "BESTAND";
  return "BESTAND";
}
