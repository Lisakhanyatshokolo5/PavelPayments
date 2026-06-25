"use client";

import { useCallback } from "react";
import GymMockTerminal from "../components/GymMockTerminal";
import GymSubscribe from "../components/GymSubscribe";
import { useGymSession } from "../hooks/useGymSession";

interface GymDashboardProps {
  nfcUid: string;
}

export default function GymDashboard({ nfcUid }: GymDashboardProps) {
  const { data, isLoading, refresh } = useGymSession(nfcUid);

  const handleSessionChange = useCallback(() => {
    // Give the backend 500ms to write the DB record before we re-fetch
    setTimeout(refresh, 500);
  }, [refresh]);

  function formatCents(cents: number, currency = "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  }

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Gym Dashboard</h1>
      <p style={{ color: "#6b7280", marginTop: 0 }}>NFC UID: {nfcUid}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Live session panel */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>Today&apos;s Session</h3>
          {isLoading ? (
            <p style={{ color: "#9ca3af" }}>Loading…</p>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#6b7280" }}>Minutes today</span>
                <strong>{data?.todayMinutes ?? 0} min</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#6b7280" }}>Peak minutes</span>
                <strong>{data?.peakMinutes ?? 0} min</strong>
              </div>
              {data?.subscription && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#6b7280" }}>Plan</span>
                  <strong>
                    {data.subscription.tier} / {data.subscription.subscriptionType}
                  </strong>
                </div>
              )}
              {data?.estimatedCharge && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.75rem",
                    background: "#f0fdf4",
                    borderRadius: 6,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 500 }}>
                    Estimated charge tonight
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#15803d" }}>
                    {formatCents(data.estimatedCharge.amount, data.estimatedCharge.currency)}
                  </div>
                  {data.estimatedCharge.breakdown && (
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                      Base {formatCents(data.estimatedCharge.breakdown.base)} −{" "}
                      {formatCents(data.estimatedCharge.breakdown.durationDiscount)} duration discount{" "}
                      {data.estimatedCharge.breakdown.peakAdjustment > 0 ? "+" : ""}
                      {formatCents(Math.abs(data.estimatedCharge.breakdown.peakAdjustment))} peak adj.
                    </div>
                  )}
                </div>
              )}
              {!data?.subscription && (
                <p style={{ fontSize: 13, color: "#f59e0b" }}>
                  No active subscription — sessions are tracked but not charged until you subscribe.
                </p>
              )}
            </>
          )}
        </div>

        {/* NFC / mock terminal */}
        <GymMockTerminal nfcUid={nfcUid} onSessionChange={handleSessionChange} />
      </div>

      {/* Subscription form — show if no active subscription */}
      {!isLoading && !data?.subscription && (
        <GymSubscribe nfcUid={nfcUid} />
      )}
    </main>
  );
}
