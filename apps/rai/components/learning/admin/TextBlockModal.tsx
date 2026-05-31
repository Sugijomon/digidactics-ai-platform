"use client";

import { useRef, useState } from "react";
import { ModalShell } from "@/components/learning/admin/ModalShell";

type ToolbarAction =
  | "bold"
  | "italic"
  | "underline"
  | "h2"
  | "h3"
  | "list"
  | "numbered"
  | "link"
  | "image"
  | "code";

type TextSize = "14" | "16" | "18" | "20" | "22";

export function TextBlockModal({
  blockNumber,
  initialContent,
  initialImageUrl = "",
  onClose,
  onSave,
}: {
  blockNumber: number;
  initialContent: string;
  initialImageUrl?: string;
  onClose: () => void;
  onSave: (content: string, imageUrl?: string) => void;
}) {
  const [content, setContent] = useState(initialContent);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [imageError, setImageError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function applyToolbarAction(action: ToolbarAction) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const next = transformContent(action, content, start, end, selected);

    setContent(next.value);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }

  function applyTextSize(size: TextSize | "") {
    if (!size) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const next = wrapSelection(
      content,
      start,
      end,
      selected,
      `[[size:${size}]]`,
      "[[/size]]",
    );

    setContent(next.value);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }

  function handleImageFile(file: File | undefined) {
    if (!file) return;
    setImageError("");

    if (!file.type.startsWith("image/")) {
      setImageError("Kies een afbeeldingbestand.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setImageError("Deze afbeelding is te groot. Gebruik maximaal 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <ModalShell
      blockNumber={blockNumber}
      blockType="Tekst"
      description="Pas de inhoud van dit blok aan."
      onClose={onClose}
        onSave={() => onSave(content, imageUrl.trim() || undefined)}
      title="Edit Paragraaf Block"
    >
      <div className="modal-field">
        <label className="m-label" htmlFor="text-block-content">
          Inhoud <span className="m-label-opt">verplicht</span>
        </label>
        <div className="editor-toolbar">
          <ToolbarButton label="B" onClick={() => applyToolbarAction("bold")} />
          <ToolbarButton label="I" onClick={() => applyToolbarAction("italic")} />
          <ToolbarButton label="U" onClick={() => applyToolbarAction("underline")} />
          <span className="tb-sep" />
          <select
            aria-label="Tekstgrootte"
            className="tb-select"
            defaultValue=""
            onChange={(event) => {
              applyTextSize(event.target.value as TextSize | "");
              event.currentTarget.value = "";
            }}
            title="Tekstgrootte"
          >
            <option value="">Grootte</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="20">20</option>
            <option value="22">22</option>
          </select>
          <span className="tb-sep" />
          <ToolbarButton label="H2" onClick={() => applyToolbarAction("h2")} />
          <ToolbarButton label="H3" onClick={() => applyToolbarAction("h3")} />
          <span className="tb-sep" />
          <ToolbarButton label="•" title="Lijst" onClick={() => applyToolbarAction("list")} />
          <ToolbarButton label="1." title="Genummerde lijst" onClick={() => applyToolbarAction("numbered")} />
          <span className="tb-sep" />
          <ToolbarButton label="🔗" title="Link" onClick={() => applyToolbarAction("link")} />
          <ToolbarButton label="🖼" title="Afbeelding" onClick={() => applyToolbarAction("image")} />
          <span className="tb-sep" />
          <ToolbarButton label="&lt;/&gt;" title="Code" onClick={() => applyToolbarAction("code")} />
        </div>
        <textarea
          className="m-textarea editor-area"
          id="text-block-content"
          onChange={(event) => setContent(event.target.value)}
          placeholder="Schrijf hier de inhoud van dit blok..."
          ref={textareaRef}
          value={content}
        />
        <p className="m-hint">
          Tip: gebruik ** voor vet, _ voor cursief, ## voor kopteksten.
        </p>
      </div>

      <div className="modal-field">
        <span className="m-label">
          Afbeelding <span className="m-label-opt">optioneel</span>
        </span>
        <div className="image-tabs">
          <button
            className={imageMode === "url" ? "img-tab active" : "img-tab"}
            onClick={() => setImageMode("url")}
            type="button"
          >
            URL
          </button>
          <button
            className={imageMode === "upload" ? "img-tab active" : "img-tab"}
            onClick={() => setImageMode("upload")}
            type="button"
          >
            Upload
          </button>
        </div>
        {imageMode === "url" ? (
          <input
            className="m-input"
            onChange={(event) => {
              setImageError("");
              setImageUrl(event.target.value);
            }}
            placeholder="https://..."
            type="url"
            value={imageUrl}
          />
        ) : (
          <label
            className={isDragging ? "upload-dropzone dragging" : "upload-dropzone"}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              handleImageFile(event.dataTransfer.files[0]);
            }}
          >
            <input
              accept="image/*"
              onChange={(event) => handleImageFile(event.target.files?.[0])}
              ref={fileInputRef}
              style={{ display: "none" }}
              type="file"
            />
            <strong>Klik om een afbeelding te uploaden</strong>
            <span>PNG, JPG of WebP - max 4MB</span>
          </label>
        )}
        {imageError ? (
          <p className="m-hint" style={{ color: "var(--accent)" }}>
            {imageError}
          </p>
        ) : null}
        {imageUrl ? (
          <div className="text-image-preview">
            <img alt="Preview" src={imageUrl} />
            <button onClick={() => setImageUrl("")} type="button">
              Verwijderen
            </button>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

function ToolbarButton({
  label,
  onClick,
  title,
}: {
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button className="tb-btn" onClick={onClick} title={title ?? label} type="button">
      {label}
    </button>
  );
}

function transformContent(
  action: ToolbarAction,
  value: string,
  start: number,
  end: number,
  selected: string,
) {
  switch (action) {
    case "bold":
      return wrapSelection(value, start, end, selected, "**", "**");
    case "italic":
      return wrapSelection(value, start, end, selected, "_", "_");
    case "underline":
      return wrapSelection(value, start, end, selected, "<u>", "</u>");
    case "h2":
      return prefixSelectedLines(value, start, end, "## ");
    case "h3":
      return prefixSelectedLines(value, start, end, "### ");
    case "list":
      return prefixSelectedLines(value, start, end, "- ");
    case "numbered":
      return prefixSelectedLines(value, start, end, "1. ");
    case "link":
      return wrapSelection(value, start, end, selected || "linktekst", "[", "](url)");
    case "image":
      return insertText(value, start, end, `![${selected || "alt tekst"}](https://...)`);
    case "code":
      return wrapSelection(value, start, end, selected, "`", "`");
    default:
      return { value, selectionStart: start, selectionEnd: end };
  }
}

function wrapSelection(
  value: string,
  start: number,
  end: number,
  selected: string,
  before: string,
  after: string,
) {
  const inner = selected || "tekst";
  const insert = `${before}${inner}${after}`;
  return insertText(value, start, end, insert, before.length, before.length + inner.length);
}

function insertText(
  value: string,
  start: number,
  end: number,
  insert: string,
  selectionOffsetStart = insert.length,
  selectionOffsetEnd = insert.length,
) {
  return {
    value: `${value.slice(0, start)}${insert}${value.slice(end)}`,
    selectionStart: start + selectionOffsetStart,
    selectionEnd: start + selectionOffsetEnd,
  };
}

function prefixSelectedLines(value: string, start: number, end: number, prefix: string) {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIndex = value.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const segment = value.slice(lineStart, lineEnd);
  const prefixed = segment
    .split("\n")
    .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
    .join("\n");

  return {
    value: `${value.slice(0, lineStart)}${prefixed}${value.slice(lineEnd)}`,
    selectionStart: lineStart,
    selectionEnd: lineStart + prefixed.length,
  };
}
