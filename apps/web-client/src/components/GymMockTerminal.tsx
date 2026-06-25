"use client";

import { useState, useEffect, useRef } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4001";

interface GymMockTerminalProps {
  nfcUid: string;
  onSessionChange?: () => void;
}

type Status = "idle" | "inside" | "error";

export default function GymMockTerminal({ nfcUid, onSessionChange }: GymMockTerminalProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nfcRef = useRef<unknown>(null);

  // Live timer while inside the gym
  useEffect(() => {
    if (status === "inside" && sessionStart) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - sessionStart.getTime()) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, sessionStart]);

  // Web NFC — only available in Chrome on Android
  useEffect(() => {
    if (!("NDEFReader" in window)) return;

    async function startNfc() {
      try {
        // @ts-expect-error Web NFC is not yet in TypeScript lib types
        const reader = new window.NDEFReader();
        nfcRef.current = reader;
        await reader.scan();
        reader.onreading = async ({ serialNumber }: { serialNumber: string }) => {
          // Use the physical NFC UID when the phone taps a tag
          await handleTap(serialNumber || nfcUid);
        };
      } catch {
        // NFC unavailable or permission denied — fall back to buttons silently
      }
    }

    startNfc();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleTap(uid: string) {
    if (status === "idle") {
      await doTapIn(uid);
    } else if (status === "inside") {
      await doTapOut(uid);
    }
  }

  async function doTapIn(uid: string) {
    setMessage("Checking in…");
    try {
      const res = await fetch(`${BACKEND}/api/gym/tap-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, terminalId: "web-terminal" }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      const { session } = await res.json();
      setCurrentSessionId(session.id);
      setSessionStart(new Date());
      setElapsedSeconds(0);
      setStatus("inside");
      setMessage("You're checked in. Have a great workout!");
      onSessionChange?.();
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Tap-in failed");
    }
  }

  async function doTapOut(uid: string) {
    setMessage("Checking out…");
    try {
      const res = await fetch(`${BACKEND}/api/gym/tap-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, terminalId: "web-terminal" }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      const { session } = await res.json();
      setStatus("idle");
      setSessionStart(null);
      setCurrentSessionId(null);
      setMessage(`Session ended. ${session.minutesAccumulated} minute(s) logged.`);
      onSessionChange?.();
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Tap-out failed");
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  }

  const statusColor: Record<Status, string> = {
    idle: "#6b7280",
    inside: "#16a34a",
    error: "#dc2626",
  };

  return (
    <div
      style={{
        border: "2px solid",
        borderColor: status === "inside" ? "#16a34a" : status === "error" ? "#dc2626" : "#e5e7eb",
        borderRadius: 12,
        padding: "1.5rem",
        maxWidth: 360,
        textAlign: "center",
        transition: "border-color 0.2s",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: "0.5rem" }}>
        {status === "inside" ? "🏋️" : "🚪"}
      </div>

      <h3 style={{ margin: "0 0 0.25rem" }}>Gym Terminal</h3>

      <p style={{ color: statusColor[status], fontWeight: 600, margin: "0 0 1rem" }}>
        {status === "idle" && "Not checked in"}
        {status === "inside" && `Inside — ${formatTime(elapsedSeconds)}`}
        {status === "error" && "Error"}
      </p>

      {message && (
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 1rem" }}>{message}</p>
      )}

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
        <button
          onClick={() => doTapIn(nfcUid)}
          disabled={status === "inside"}
          style={{
            padding: "0.6rem 1.2rem",
            background: status === "inside" ? "#d1fae5" : "#16a34a",
            color: status === "inside" ? "#6b7280" : "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: status === "inside" ? "not-allowed" : "pointer",
            fontSize: 14,
          }}
        >
          Tap In
        </button>

        <button
          onClick={() => doTapOut(nfcUid)}
          disabled={status !== "inside"}
          style={{
            padding: "0.6rem 1.2rem",
            background: status !== "inside" ? "#f3f4f6" : "#dc2626",
            color: status !== "inside" ? "#9ca3af" : "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: status !== "inside" ? "not-allowed" : "pointer",
            fontSize: 14,
          }}
        >
          Tap Out
        </button>
      </div>

      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: "1rem", marginBottom: 0 }}>
        {typeof window !== "undefined" && "NDEFReader" in window
          ? "Phone NFC active — tap your card or phone to the terminal."
          : "Using button simulation. On Android Chrome, phone NFC activates automatically."}
      </p>
    </div>
  );
}
