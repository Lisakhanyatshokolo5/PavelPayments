"use client";

import { useState, useCallback } from "react";
import MockVideoPlayer from "../components/MockVideoPlayer";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4001";

interface StreamingDashboardProps {
  nfcUid: string;
}

export default function StreamingDashboard({ nfcUid }: StreamingDashboardProps) {
  const [todayMinutes, setTodayMinutes] = useState<number | null>(null);
  const [estimatedCharge, setEstimatedCharge] = useState<{ amount: number; currency: string } | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/stream/session/${encodeURIComponent(nfcUid)}`);
      if (!res.ok) return;
      const data = await res.json();
      setTodayMinutes(data.todayMinutes ?? 0);
      setEstimatedCharge(data.estimatedCharge ?? null);
    } catch {
      // ignore
    }
  }, [nfcUid]);

  function formatCents(cents: number, currency = "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  }

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Streaming Dashboard</h1>
      <p style={{ color: "#6b7280", marginTop: 0 }}>NFC UID: {nfcUid}</p>

      {/* Today's summary bar */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          marginBottom: "2rem",
          padding: "1rem",
          background: "#faf5ff",
          borderRadius: 8,
          border: "1px solid #e9d5ff",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600 }}>WATCHED TODAY</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{todayMinutes ?? "—"} min</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600 }}>TONIGHT&apos;S CHARGE</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {estimatedCharge ? formatCents(estimatedCharge.amount, estimatedCharge.currency) : "—"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", alignSelf: "center", fontSize: 13, color: "#9ca3af" }}>
          Settled at midnight · Only charged for what you watch
        </div>
      </div>

      <MockVideoPlayer nfcUid={nfcUid} onSessionChange={refreshSession} />
    </main>
  );
}
