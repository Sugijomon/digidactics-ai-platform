"use client";

import { useEffect, useRef, useState } from "react";

export function AudioBlockPlayer({
  block,
}: {
  block: { file_url: string; file_name: string; title?: string; duration_seconds?: number };
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(block.duration_seconds ?? 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setPlaying(false);
    setCurrentTime(0);
    setProgress(0);
    setDuration(block.duration_seconds ?? 0);
    audio.load();

    const syncDuration = () => {
      setDuration((previous) => getAudioDuration(audio, block.duration_seconds ?? previous));
    };

    syncDuration();
    audio.addEventListener("canplay", syncDuration);
    audio.addEventListener("loadeddata", syncDuration);
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);

    return () => {
      audio.removeEventListener("canplay", syncDuration);
      audio.removeEventListener("loadeddata", syncDuration);
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
    };
  }, [block.duration_seconds, block.file_url]);

  function togglePlay() {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    audioRef.current
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;

    const nextTime = audio.currentTime;
    const nextDuration = getAudioDuration(audio, duration);
    setCurrentTime(nextTime);
    setDuration(nextDuration);
    setProgress(nextDuration ? (nextTime / nextDuration) * 100 : 0);
  }

  function handleLoadedMetadata(event: React.SyntheticEvent<HTMLAudioElement>) {
    setDuration((previous) => getAudioDuration(event.currentTarget, block.duration_seconds ?? previous));
  }

  function seek(event: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || !duration) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
  }

  return (
    <div className="block media-card audio-player">
      <audio
        onEnded={() => setPlaying(false)}
        onDurationChange={handleLoadedMetadata}
        onCanPlay={handleLoadedMetadata}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        preload="metadata"
        ref={audioRef}
        src={block.file_url}
      />

      <div className="audio-wrapper">
        <button aria-label={playing ? "Pauzeren" : "Afspelen"} className="audio-play-btn" onClick={togglePlay} type="button">
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <div className="media-info">
          <div className="media-title">{block.title || block.file_name}</div>
          <div className="audio-timeline-container">
            <span className="audio-time">{formatTime(currentTime)}</span>
            <div aria-label="Audio positie" className="audio-progress-bar" onClick={seek} role="slider" tabIndex={0}>
              <div className="audio-progress-current" style={{ width: `${progress}%` }} />
            </div>
            <span className="audio-time">{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function getAudioDuration(audio: HTMLAudioElement | null, fallback: number) {
  if (!audio) {
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
  }

  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    return audio.duration;
  }

  if (audio.seekable.length > 0) {
    const seekableEnd = audio.seekable.end(audio.seekable.length - 1);
    if (Number.isFinite(seekableEnd) && seekableEnd > 0) {
      return seekableEnd;
    }
  }

  if (Number.isFinite(fallback) && fallback > 0) {
    return fallback;
  }

  return 0;
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="16" viewBox="0 0 24 24" width="16">
      <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
