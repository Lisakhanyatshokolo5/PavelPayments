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
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ marginTop: 0 }}>Mock Streaming Service</h2>

      {/* Now playing */}
      {selected && isPlaying && (
        <div
          style={{
            border: "2px solid #7c3aed",
            borderRadius: 12,
            padding: "1.5rem",
            marginBottom: "1.5rem",
            background: "#faf5ff",
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
          }}
        >
          <div style={{ fontSize: 56 }}>{selected.poster}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{selected.title}</div>
            <div style={{ color: "#7c3aed", fontWeight: 600, fontSize: 20, margin: "0.25rem 0" }}>
              {formatTime(elapsedSeconds)}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Billing clock running…</div>
          </div>
          <button
            onClick={handleStop}
            style={{
              padding: "0.6rem 1.2rem",
              background: "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Stop
          </button>
        </div>
      )}

      {message && !isPlaying && (
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: "1rem" }}>{message}</p>
      )}

      {/* Content catalog */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {MOCK_CATALOG.map((content) => {
          const isActive = isPlaying && selected?.id === content.id;
          return (
            <div
              key={content.id}
              style={{
                border: isActive ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                background: isActive ? "#faf5ff" : "#fff",
              }}
            >
              <div style={{ fontSize: 32 }}>{content.poster}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {content.title}
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  {content.type} · {content.duration}
                </div>
              </div>
              <button
                onClick={() => (isActive ? handleStop() : handlePlay(content))}
                disabled={isPlaying && !isActive}
                style={{
                  padding: "0.35rem 0.75rem",
                  background: isActive ? "#7c3aed" : isPlaying ? "#f3f4f6" : "#7c3aed",
                  color: isActive || (!isPlaying) ? "#fff" : "#9ca3af",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: isPlaying && !isActive ? "not-allowed" : "pointer",
                  fontSize: 13,
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
