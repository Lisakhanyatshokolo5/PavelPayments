"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useCallback } from "react";
import MockVideoPlayer from "../components/MockVideoPlayer";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4001";

export default function StreamingDashboard() {
  const router = useRouter();
  const [inputUid, setInputUid] = useState("");
  const nfcUid = (router.query.uid as string) || "";
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

  if (!nfcUid) {
    return (
      <>
        <header style={{ background: "#1e293b", color: "#fff", padding: "0 1.5rem", height: 56, display: "flex", alignItems: "center", gap: "1rem", position: "sticky", top: 0, zIndex: 100 }}>
          <Link href="/" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>← Home</Link>
          <span style={{ color: "#475569" }}>|</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>🎥 Streaming</span>
        </header>
        <main style={{ maxWidth: 400, margin: "4rem auto", padding: "0 1.5rem" }}>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 0.5rem", fontSize: 18, fontWeight: 800 }}>Enter your NFC UID</h2>
            <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: 14 }}>This identifies your account for streaming billing.</p>
            <form
              onSubmit={(e) => { e.preventDefault(); if (inputUid.trim()) router.replace({ query: { uid: inputUid.trim() } }); }}
              style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}
            >
              <input
                type="text"
                placeholder="e.g. 04A1B2C3"
                value={inputUid}
                onChange={(e) => setInputUid(e.target.value)}
                required
                style={{ padding: "0.625rem 0.875rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}
              />
              <button
                type="submit"
                style={{ padding: "0.65rem", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: "pointer" }}
              >
                Go to Streaming →
              </button>
            </form>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {/* Top bar */}
      <header
        style={{
          background: "#1e293b",
          color: "#fff",
          padding: "0 1.5rem",
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Link href="/" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>
          ← Home
        </Link>
        <span style={{ color: "#475569" }}>|</span>
        <span style={{ fontWeight: 700, fontSize: 16 }}>🎬 Streaming</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>
          UID: {nfcUid}
        </span>
      </header>

      <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1.5rem" }}>
        {/* Stats strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e9d5ff",
              borderRadius: 10,
              padding: "1.25rem 1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed", letterSpacing: "0.05em", marginBottom: 6 }}>
              WATCHED TODAY
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#1e293b" }}>
              {todayMinutes !== null ? `${todayMinutes} min` : "—"}
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e9d5ff",
              borderRadius: 10,
              padding: "1.25rem 1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed", letterSpacing: "0.05em", marginBottom: 6 }}>
              TONIGHT&apos;S CHARGE
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#1e293b" }}>
              {estimatedCharge ? formatCents(estimatedCharge.amount, estimatedCharge.currency) : "—"}
            </div>
          </div>

          <div
            style={{
              background: "#faf5ff",
              border: "1px solid #e9d5ff",
              borderRadius: 10,
              padding: "1.25rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600, marginBottom: 4 }}>HOW IT WORKS</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Charged per minute · settled at midnight · only what you watch
            </div>
          </div>
        </div>

        {/* Video player */}
        <MockVideoPlayer nfcUid={nfcUid} onSessionChange={refreshSession} />
      </main>
    </>
  );
}
