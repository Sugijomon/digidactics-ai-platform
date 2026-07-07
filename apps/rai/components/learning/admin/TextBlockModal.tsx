"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initialHtml = useMemo(() => markdownToHtml(initialContent), [initialContent]);

  function syncContentFromEditor() {
    const editor = editorRef.current;
    if (!editor) return;
    setContent(htmlToMarkdown(editor));
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  function applyToolbarAction(action: ToolbarAction) {
    focusEditor();

    if (action === "bold") document.execCommand("bold");
    if (action === "italic") document.execCommand("italic");
    if (action === "underline") document.execCommand("underline");
    if (action === "h2") document.execCommand("formatBlock", false, "h2");
    if (action === "h3") document.execCommand("formatBlock", false, "h3");
    if (action === "list") document.execCommand("insertUnorderedList");
    if (action === "numbered") document.execCommand("insertOrderedList");
    if (action === "code") document.execCommand("formatBlock", false, "pre");

    if (action === "link") {
      const url = window.prompt("Link URL");
      if (url) document.execCommand("createLink", false, url);
    }

    if (action === "image") {
      const url = window.prompt("Afbeelding URL");
      if (url) document.execCommand("insertImage", false, url);
    }

    syncContentFromEditor();
  }

  function applyTextSize(size: TextSize | "") {
    if (!size) return;
    focusEditor();
    wrapSelectionInSpan(`text-size-${size}`);
    syncContentFromEditor();
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
      <div className="modal-field text-modal-field">
        <label className="m-label" htmlFor="text-block-content">
          Inhoud <span className="m-label-opt">verplicht</span>
        </label>
        <div className="text-editor-shell wysiwyg">
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
            <ToolbarButton label={<span aria-hidden="true">&bull;</span>} title="Bulletlijst" onClick={() => applyToolbarAction("list")} />
            <ToolbarButton label="1." title="Genummerde lijst" onClick={() => applyToolbarAction("numbered")} />
            <span className="tb-sep" />
            <ToolbarButton label="Link" title="Link" onClick={() => applyToolbarAction("link")} />
            <ToolbarButton label="Img" title="Afbeelding in tekst" onClick={() => applyToolbarAction("image")} />
            <span className="tb-sep" />
            <ToolbarButton label="Code" title="Code" onClick={() => applyToolbarAction("code")} />
          </div>
          <div
            aria-label="Tekstinhoud"
            className="wysiwyg-editor"
            contentEditable
            dangerouslySetInnerHTML={{ __html: initialHtml }}
            id="text-block-content"
            onBlur={syncContentFromEditor}
            onInput={syncContentFromEditor}
            ref={editorRef}
            role="textbox"
            suppressContentEditableWarning
          />
        </div>
        <p className="m-hint">
          Je bewerkt direct de uiteindelijke opmaak. Gebruik Enter voor nieuwe alinea's en de lijstknoppen voor echte lijsten.
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
  label: ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button className="tb-btn" onClick={onClick} title={title ?? String(label)} type="button">
      {label}
    </button>
  );
}

function wrapSelectionInSpan(className: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  const span = document.createElement("span");
  span.className = className;
  span.append(range.extractContents());
  range.insertNode(span);
  selection.removeAllRanges();
  selection.addRange(range);
}

function markdownToHtml(value: string) {
  const blocks = value
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) {
    return "<p><br></p>";
  }

  return blocks.map(markdownBlockToHtml).join("");
}

function markdownBlockToHtml(block: string) {
  if (block.startsWith("### ")) {
    return `<h3>${inlineMarkdownToHtml(block.slice(4))}</h3>`;
  }

  if (block.startsWith("## ")) {
    return `<h2>${inlineMarkdownToHtml(block.slice(3))}</h2>`;
  }

  if (isMarkdownList(block, "unordered")) {
    const items = block
      .split("\n")
      .map((line) => line.replace(/^\s*[-*•]\s+/, "").trim())
      .filter(Boolean)
      .map((item) => `<li>${inlineMarkdownToHtml(item)}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  }

  if (isMarkdownList(block, "ordered")) {
    const items = block
      .split("\n")
      .map((line) => line.replace(/^\s*\d+[.)]\s+/, "").trim())
      .filter(Boolean)
      .map((item) => `<li>${inlineMarkdownToHtml(item)}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  }

  return `<p>${inlineMarkdownToHtml(block)}</p>`;
}

function inlineMarkdownToHtml(value: string) {
  return escapeHtml(value)
    .replace(/\[\[size:(8|10|12|14|16|18|20|22)\]\]([\s\S]*?)\[\[\/size\]\]/g, '<span class="text-size-$1">$2</span>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function htmlToMarkdown(root: HTMLElement) {
  return Array.from(root.childNodes)
    .map((node) => nodeToMarkdown(node))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return normalizeWhitespace(node.textContent ?? "");
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const tag = node.tagName.toLowerCase();

  if (tag === "h2") return `## ${inlineHtmlToMarkdown(node)}`;
  if (tag === "h3") return `### ${inlineHtmlToMarkdown(node)}`;
  if (tag === "pre") return `\`${inlineHtmlToMarkdown(node)}\``;
  if (tag === "ul") {
    return Array.from(node.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .map((child) => `- ${inlineHtmlToMarkdown(child as HTMLElement)}`)
      .join("\n");
  }
  if (tag === "ol") {
    return Array.from(node.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .map((child, index) => `${index + 1}. ${inlineHtmlToMarkdown(child as HTMLElement)}`)
      .join("\n");
  }
  if (tag === "div" || tag === "p") {
    const text = inlineHtmlToMarkdown(node);
    return text || "";
  }
  if (tag === "br") return "";

  return inlineHtmlToMarkdown(node);
}

function inlineHtmlToMarkdown(node: HTMLElement): string {
  return Array.from(node.childNodes)
    .map((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        return normalizeWhitespace(child.textContent ?? "");
      }

      if (!(child instanceof HTMLElement)) {
        return "";
      }

      const tag = child.tagName.toLowerCase();
      const inner = inlineHtmlToMarkdown(child);

      if (tag === "strong" || tag === "b") return `**${inner}**`;
      if (tag === "em" || tag === "i") return `_${inner}_`;
      if (tag === "u") return `<u>${inner}</u>`;
      if (tag === "code") return `\`${inner}\``;
      if (tag === "a") return `[${inner}](${child.getAttribute("href") ?? "url"})`;
      if (tag === "img") return `![${child.getAttribute("alt") ?? "alt tekst"}](${child.getAttribute("src") ?? "https://..."})`;
      if (tag === "span") {
        const sizeClass = Array.from(child.classList).find((item) => /^text-size-\d+$/.test(item));
        if (sizeClass) {
          return `[[size:${sizeClass.replace("text-size-", "")}]]${inner}[[/size]]`;
        }
      }
      if (tag === "br") return "\n";

      return inner;
    })
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function isMarkdownList(block: string, type: "ordered" | "unordered") {
  const lines = block.split("\n").filter((line) => line.trim());
  if (!lines.length) return false;
  const pattern = type === "ordered" ? /^\s*\d+[.)]\s+/ : /^\s*[-*•]\s+/;
  return lines.every((line) => pattern.test(line));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ");
}
