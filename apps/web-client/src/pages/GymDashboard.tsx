"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import GymMockTerminal from "../components/GymMockTerminal";
import GymSubscribe from "../components/GymSubscribe";
import { useGymSession } from "../hooks/useGymSession";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "1.25rem 1.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: "#16a34a", letterSpacing: "0.05em", marginBottom: 6 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#1e293b" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function GymDashboard() {
  const router = useRouter();
  const [inputUid, setInputUid] = useState("");
  const nfcUid = (router.query.uid as string) || "";
  const { data, isLoading, refresh } = useGymSession(nfcUid);

  const handleSessionChange = useCallback(() => {
    setTimeout(refresh, 500);
  }, [refresh]);

  // No UID yet — show a quick entry form
  if (!nfcUid) {
    return (
      <>
        <header style={{ background: "#1e293b", color: "#fff", padding: "0 1.5rem", height: 56, display: "flex", alignItems: "center", gap: "1rem", position: "sticky", top: 0, zIndex: 100 }}>
          <Link href="/" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>← Home</Link>
          <span style={{ color: "#475569" }}>|</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>🏋️ Gym</span>
        </header>
        <main style={{ maxWidth: 400, margin: "4rem auto", padding: "0 1.5rem" }}>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 0.5rem", fontSize: 18, fontWeight: 800 }}>Enter your NFC UID</h2>
            <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: 14 }}>This identifies your gym account (e.g. your NFC card ID or a test value).</p>
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
                style={{ padding: "0.65rem", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: "pointer" }}
              >
                Go to Gym Dashboard →
              </button>
            </form>
          </div>
        </main>
      </>
    );
  }
  function formatCents(cents: number, currency = "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
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
        <span style={{ fontWeight: 700, fontSize: 16 }}>🏋️ Gym</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>
          UID: {nfcUid}
        </span>
      </header>

      <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1.5rem" }}>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          <StatCard
            label="Minutes today"
            value={isLoading ? "…" : `${data?.todayMinutes ?? 0} min`}
          />
          <StatCard
            label="Peak minutes"
            value={isLoading ? "…" : `${data?.peakMinutes ?? 0} min`}
          />
          <StatCard
            label="Plan"
            value={isLoading ? "…" : data?.subscription ? `${data.subscription.tier}` : "None"}
            sub={data?.subscription?.subscriptionType ?? (isLoading ? undefined : "No active plan")}
          />
        </div>

        {/* Estimated charge banner */}
        {!isLoading && data?.estimatedCharge && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 10,
              padding: "1rem 1.5rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>Estimated charge tonight</div>
              {data.estimatedCharge.breakdown && (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  Base {formatCents(data.estimatedCharge.breakdown.base)} −{" "}
                  {formatCents(data.estimatedCharge.breakdown.durationDiscount)} discount{" "}
                  {data.estimatedCharge.breakdown.peakAdjustment > 0 ? "+" : ""}
                  {formatCents(Math.abs(data.estimatedCharge.breakdown.peakAdjustment))} peak
                </div>
              )}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#16a34a" }}>
              {formatCents(data.estimatedCharge.amount, data.estimatedCharge.currency)}
            </div>
          </div>
        )}

        {!isLoading && !data?.subscription && (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 10,
              padding: "0.875rem 1.25rem",
              marginBottom: "1.5rem",
              fontSize: 14,
              color: "#92400e",
            }}
          >
            ⚠️ No active subscription — sessions are tracked but not charged until you subscribe.
          </div>
        )}

        {/* Two-column: session terminal + subscribe */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
          <GymMockTerminal nfcUid={nfcUid} onSessionChange={handleSessionChange} />
          {!isLoading && !data?.subscription && <GymSubscribe nfcUid={nfcUid} />}
        </div>

        {/* History link */}
        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <Link
            href={`/GymHistory?uid=${encodeURIComponent(nfcUid)}`}
            style={{
              fontSize: 14,
              color: "#2563eb",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            View Settlement History →
          </Link>
        </div>
      </main>
    </>
  );
}
