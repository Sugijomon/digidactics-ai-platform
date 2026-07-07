"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VideoBlock } from "@digidactics/domain/learning";

export function VideoBlockPlayer({
  block,
  initialWatched = false,
  onAnswer,
}: {
  block: VideoBlock;
  initialWatched?: boolean;
  onAnswer?: (value: string) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [watched, setWatched] = useState(initialWatched);
  const embed = useMemo(() => getVideoEmbed(block.url), [block.url]);
  const requiresWatch = Boolean(block.require_full_watch);
  const canAutoDetect = requiresWatch && embed.provider === "vimeo";

  const markWatched = useCallback((value = "watched") => {
    setWatched(true);
    onAnswer?.(value);
  }, [onAnswer]);

  useEffect(() => {
    if (!canAutoDetect || watched) return;

    function handleMessage(event: MessageEvent) {
      if (!event.origin.includes("vimeo.com")) return;

      const data = parseVimeoMessage(event.data);
      if (data?.event === "finish") {
        markWatched("watched:vimeo_finish");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [canAutoDetect, markWatched, watched]);

  function subscribeToVimeoFinish() {
    if (!canAutoDetect || !iframeRef.current || !embed.origin) return;

    iframeRef.current.contentWindow?.postMessage(
      JSON.stringify({ method: "addEventListener", value: "finish" }),
      embed.origin,
    );
  }

  return (
    <section className="block lesson-video-block">
      {embed.url ? (
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="lesson-video-frame"
          loading="lazy"
          onLoad={subscribeToVimeoFinish}
          ref={iframeRef}
          src={embed.url}
          title={block.title ?? block.caption ?? "Video"}
        />
      ) : (
        <div className="media-frame">
          <span>Video</span>
          <small>{block.url}</small>
        </div>
      )}

      {requiresWatch ? (
        <div className={`video-watch-status ${watched ? "complete" : ""}`}>
          <span>{watched ? "Video bekeken" : "Bekijk de video om verder te gaan"}</span>
          {!canAutoDetect && !watched ? (
            <button className="video-watch-confirm" onClick={() => markWatched("watched:confirmed")} type="button">
              Markeer als bekeken
            </button>
          ) : null}
        </div>
      ) : null}

      {block.caption ? <p className="video-caption">{block.caption}</p> : null}
      {block.transcript_markdown || block.transcript ? (
        <div className="lesson-markdown">{block.transcript_markdown ?? block.transcript}</div>
      ) : null}
    </section>
  );
}

function getVideoEmbed(url: string): { origin?: string; provider: "vimeo" | "youtube" | "direct" | ""; url: string } {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return { provider: "youtube", url: id ? `https://www.youtube.com/embed/${id}` : "" };
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      if (id) return { provider: "youtube", url: `https://www.youtube.com/embed/${id}` };
      if (parsed.pathname.startsWith("/embed/")) return { provider: "youtube", url };
    }

    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return {
        origin: "https://player.vimeo.com",
        provider: "vimeo",
        url: id ? `https://player.vimeo.com/video/${id}?api=1` : "",
      };
    }

    if (host === "player.vimeo.com") {
      parsed.searchParams.set("api", "1");
      return { origin: parsed.origin, provider: "vimeo", url: parsed.toString() };
    }

    if (parsed.pathname.endsWith(".mp4")) {
      return { provider: "direct", url };
    }
  } catch {
    return { provider: "", url: "" };
  }

  return { provider: "", url: "" };
}

function parseVimeoMessage(value: unknown): { event?: string } | null {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as { event?: string };
    } catch {
      return null;
    }
  }

  if (value && typeof value === "object") {
    return value as { event?: string };
  }

  return null;
}
