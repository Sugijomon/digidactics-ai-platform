import type { DownloadBlock } from "@digidactics/domain/learning";

export function DownloadBlockPlayer({ block }: { block: DownloadBlock }) {
  const fallbackTemplate = getFallbackTemplate(block);
  const href = getDownloadHref(block) || fallbackTemplate?.href || "";
  const fileName = block.file_name || fallbackTemplate?.fileName || getFileNameFromUrl(href) || block.title || "Bestand";
  const displayTitle = block.title || fileName;
  const label = block.label || block.button_label || "Download";
  const fileType = getFileType(fileName || href, block.mime_type || fallbackTemplate?.mimeType);
  const fileSize = block.file_size_label || fallbackTemplate?.fileSizeLabel || formatFileSize(block.file_size_bytes);
  const secondaryMeta = fileSize || block.description;

  return (
    <div className="block media-card download-player">
      <DocumentTypeIcon />
      <div className="media-info">
        <div className="media-title">{displayTitle}</div>
        <div className="media-meta">
          <span className="file-type">{fileType}</span>
          {secondaryMeta ? <span> &bull; {secondaryMeta}</span> : null}
        </div>
      </div>

      {href ? (
        <a className="download-player-btn" download href={href} rel="noopener noreferrer" target="_blank">
          <DownloadIcon />
          {label}
        </a>
      ) : (
        <button className="download-player-btn disabled" disabled type="button">
          <DownloadIcon />
          {label}
        </button>
      )}
    </div>
  );
}

function getDownloadHref(block: DownloadBlock) {
  const directUrl = block.file_url || block.url;
  if (directUrl) return directUrl;

  const storagePath = block.storage_path;
  if (!storagePath) return "";
  if (/^(https?:|blob:|data:|\/)/i.test(storagePath)) return storagePath;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return "";

  const encodedPath = storagePath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/lesson-files/${encodedPath}`;
}

function getFallbackTemplate(block: DownloadBlock) {
  const key = `${block.title ?? ""} ${block.description ?? ""} ${block.button_label ?? ""}`.toLowerCase();

  if (key.includes("triagecanvas")) {
    return {
      href: "/downloads/learning/mastery-triagecanvas.csv",
      fileName: "mastery-triagecanvas.csv",
      fileSizeLabel: "CSV-template",
      mimeType: "text/csv",
    };
  }

  if (key.includes("raci-template") || key.includes("responsible")) {
    return {
      href: "/downloads/learning/mastery-raci-template.csv",
      fileName: "mastery-raci-template.csv",
      fileSizeLabel: "CSV-template",
      mimeType: "text/csv",
    };
  }

  if (key.includes("incident") && key.includes("register")) {
    return {
      href: "/downloads/learning/mastery-incident-reviewregister.csv",
      fileName: "mastery-incident-reviewregister.csv",
      fileSizeLabel: "CSV-template",
      mimeType: "text/csv",
    };
  }

  return null;
}

function DocumentTypeIcon() {
  return (
    <div aria-hidden="true" className="download-file-icon">
      <svg fill="none" height="37" viewBox="0 0 32 32" width="37">
        <path d="M9 4.5h10.5L24 9v18.5H9z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M19.5 4.5V9H24" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M12.5 16.5h7M12.5 20h7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    </div>
  );
}

function getFileNameFromUrl(value: string) {
  if (!value) return "";

  try {
    const pathname = new URL(value, "https://routeai.local").pathname;
    return decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "");
  } catch {
    return "";
  }
}

function getFileType(value: string, mimeType?: string) {
  const extension = value.split("?")[0]?.split(".").pop()?.trim().toUpperCase();
  if (extension && extension.length <= 6) return extension;
  if (!mimeType?.includes("/")) return "BESTAND";

  const subtype = mimeType.split("/").pop()?.toUpperCase();
  return subtype && subtype.length <= 6 ? subtype : "BESTAND";
}

function formatFileSize(bytes?: number) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return "";
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

function DownloadIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 24 24" width="14">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      <path d="M12 15V3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    </svg>
  );
}
