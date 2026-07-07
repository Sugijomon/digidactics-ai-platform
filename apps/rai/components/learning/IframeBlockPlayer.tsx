"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IframeBlock } from "@digidactics/domain/learning";

const MIN_EMBED_HEIGHT = 160;
const MAX_EMBED_HEIGHT = 900;

export function IframeBlockPlayer({ block }: { block: IframeBlock }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(block.height ?? 420);

  const fitIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    try {
      const doc = iframe.contentDocument;
      injectEmbedFitStyles(doc);

      const nextHeight = Math.min(
        MAX_EMBED_HEIGHT,
        Math.max(
          MIN_EMBED_HEIGHT,
          measureContentHeight(doc),
          block.height ?? 0,
        ),
      );
      setHeight(nextHeight);
    } catch {
      setHeight(Math.max(MIN_EMBED_HEIGHT, block.height ?? 420));
    }
  }, [block.height]);

  useEffect(() => {
    function handleResizeMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== "object") return;

      const data = event.data as { blockId?: unknown; height?: unknown; type?: unknown };
      if (data.type !== "digidactics_resize") return;
      if (typeof data.blockId === "string" && data.blockId !== block.id) return;
      if (typeof data.height !== "number") return;

      setHeight(Math.min(MAX_EMBED_HEIGHT, Math.max(MIN_EMBED_HEIGHT, Math.ceil(data.height))));
    }

    window.addEventListener("message", handleResizeMessage);
    return () => window.removeEventListener("message", handleResizeMessage);
  }, [block.id]);

  return (
    <section className="block lesson-iframe-block">
      <h2>{block.title}</h2>
      <iframe
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
        allowFullScreen={block.allow_fullscreen ?? true}
        className="embed-frame"
        height={height}
        loading="lazy"
        onLoad={fitIframe}
        ref={iframeRef}
        sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
        scrolling="no"
        src={block.url}
        title={block.title}
      />
      {block.caption ? <p className="embed-caption">{block.caption}</p> : null}
    </section>
  );
}

function injectEmbedFitStyles(doc: Document) {
  if (doc.getElementById("digidactics-embed-fit")) return;

  const style = doc.createElement("style");
  style.id = "digidactics-embed-fit";
  style.textContent = `
    html, body {
      max-width: none !important;
      width: 100% !important;
      overflow-x: hidden !important;
    }
    body {
      margin-left: auto !important;
      margin-right: auto !important;
    }
    img, svg, video, canvas, table {
      max-width: 100% !important;
    }
    .embed-container,
    .main,
    .main-container,
    .wrap,
    .panel,
    .compare {
      max-width: none !important;
      width: 100% !important;
    }
  `;
  doc.head.appendChild(style);
}

function measureContentHeight(doc: Document) {
  const body = doc.body;
  if (!body) return doc.documentElement.scrollHeight;

  const bodyRect = body.getBoundingClientRect();
  const bodyStyle = doc.defaultView?.getComputedStyle(body);
  const paddingTop = bodyStyle ? parseFloat(bodyStyle.paddingTop) || 0 : 0;
  const paddingBottom = bodyStyle ? parseFloat(bodyStyle.paddingBottom) || 0 : 0;
  const childBottoms = Array.from(body.children).map((child) => child.getBoundingClientRect().bottom - bodyRect.top);
  const contentHeight = childBottoms.length ? Math.max(...childBottoms) + paddingBottom : bodyRect.height;

  return Math.ceil(Math.max(contentHeight, paddingTop + paddingBottom));
}
