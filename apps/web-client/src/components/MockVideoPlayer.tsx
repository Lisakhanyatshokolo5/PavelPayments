"use client";

import { useState, useEffect, useRef } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4001";

interface MockContent {
  id: string;
  title: string;
  type: "movie" | "show" | "live";
  duration: string;
  poster: string;
}

const MOCK_CATALOG: MockContent[] = [
  { id: "movie-001", title: "The Interledger Heist", type: "movie", duration: "1h 52m", poster: "🎬" },
  { id: "movie-002", title: "Open Payments Rising", type: "movie", duration: "2h 10m", poster: "🚀" },
  { id: "show-001", title: "Breaking GNAP (S1E1)", type: "show", duration: "45m", poster: "📺" },
  { id: "show-002", title: "Breaking GNAP (S1E2)", type: "show", duration: "48m", poster: "📺" },
  { id: "live-001", title: "Live: Hackathon Final Pitch", type: "live", duration: "Live", poster: "🔴" },
];

interface MockVideoPlayerProps {
  nfcUid: string;
  onSessionChange?: () => void;
}

export default function MockVideoPlayer({ nfcUid, onSessionChange }: MockVideoPlayerProps) {
  const [selected, setSelected] = useState<MockContent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [message, setMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying && sessionStart) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - sessionStart.getTime()) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, sessionStart]);

  async function handlePlay(content: MockContent) {
    setSelected(content);
    setMessage("Starting stream…");
    try {
      const res = await fetch(`${BACKEND}/api/stream/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: nfcUid,
          contentId: content.id,
          contentTitle: content.title,
          contentType: content.type,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      const { session } = await res.json();
      setSessionId(session.id);
      setSessionStart(new Date());
      setElapsedSeconds(0);
      setIsPlaying(true);
      setMessage(`Now streaming: ${content.title}`);
      onSessionChange?.();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed to start stream");
    }
  }

  async function handleStop() {
    if (!sessionId) return;
    setMessage("Stopping…");
    try {
      const res = await fetch(`${BACKEND}/api/stream/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      const { session } = await res.json();
      setIsPlaying(false);
      setSessionId(null);
      setSessionStart(null);
      setMessage(`Stopped. ${session.minutesWatched} minute(s) logged for billing.`);
      onSessionChange?.();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed to stop stream");
    }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "1.5rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <h2 style={{ margin: "0 0 1.25rem", fontSize: 18, fontWeight: 800 }}>Mock Streaming Service</h2>

      {/* Now playing */}
      {selected && isPlaying && (
        <div
          style={{
            border: "2px solid #a78bfa",
            borderRadius: 12,
            padding: "1.25rem 1.5rem",
            marginBottom: "1.5rem",
            background: "#faf5ff",
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
          }}
        >
          <div style={{ fontSize: 52 }}>{selected.poster}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{selected.title}</div>
            <div style={{ color: "#7c3aed", fontWeight: 800, fontSize: 22, margin: "0.2rem 0" }}>
              {formatTime(elapsedSeconds)}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Billing clock running · per-minute rate</div>
          </div>
          <button
            onClick={handleStop}
            style={{
              padding: "0.6rem 1.25rem",
              background: "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ⏹ Stop
          </button>
        </div>
      )}

      {message && !isPlaying && (
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: "1.25rem", marginTop: 0 }}>{message}</p>
      )}

      {/* Content catalog */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {MOCK_CATALOG.map((content) => {
          const isActive = isPlaying && selected?.id === content.id;
          return (
            <div
              key={content.id}
              style={{
                border: isActive ? "2px solid #7c3aed" : "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "0.875rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.875rem",
                background: isActive ? "#faf5ff" : "#f8fafc",
                transition: "border-color 0.15s",
              }}
            >
              <div style={{ fontSize: 30 }}>{content.poster}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {content.title}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  {content.type} · {content.duration}
                </div>
              </div>
              <button
                onClick={() => (isActive ? handleStop() : handlePlay(content))}
                disabled={isPlaying && !isActive}
                style={{
                  padding: "0.35rem 0.8rem",
                  background: isActive ? "#7c3aed" : isPlaying ? "#e2e8f0" : "#7c3aed",
                  color: isActive || !isPlaying ? "#fff" : "#94a3b8",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 700,
                  cursor: isPlaying && !isActive ? "not-allowed" : "pointer",
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {isActive ? "Stop" : "▶ Play"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
