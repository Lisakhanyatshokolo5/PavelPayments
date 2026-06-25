"use client";

import { useState, useEffect } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4001";

interface Settlement {
  id: string;
  settlementDate: string;
  serviceType: "gym" | "streaming";
  totalMinutes: number;
  chargeAmountCents: number;
  currency: string;
  status: "charged" | "skipped" | "failed" | "pending";
  breakdown: { base?: number; durationDiscount?: number; peakAdjustment?: number; ratePerMinute?: number } | null;
  createdAt: string;
}

interface GymHistoryProps {
  nfcUid: string;
}

export default function GymHistory({ nfcUid }: GymHistoryProps) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!nfcUid) return;

    fetch(`${BACKEND}/api/gym/history/${encodeURIComponent(nfcUid)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load history");
        return r.json();
      })
      .then(({ settlements: data }) => setSettlements(data ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [nfcUid]);

  function formatCents(cents: number, currency = "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  }

  function statusBadge(status: Settlement["status"]) {
    const colors: Record<string, string> = {
      charged: "#16a34a",
      skipped: "#9ca3af",
      failed: "#dc2626",
      pending: "#f59e0b",
    };
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 600,
          color: "#fff",
          background: colors[status] ?? "#6b7280",
        }}
      >
        {status}
      </span>
    );
  }

  if (isLoading) return <p style={{ color: "#9ca3af" }}>Loading history…</p>;
  if (error) return <p style={{ color: "#dc2626" }}>Error: {error}</p>;
  if (settlements.length === 0) {
    return <p style={{ color: "#6b7280" }}>No settlement history yet. Charges appear here after midnight each day you visit.</p>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Settlement History</h2>
      <p style={{ color: "#6b7280", fontSize: 14 }}>
        Charges are calculated and collected at midnight each day.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              {["Date", "Service", "Minutes", "Charge", "Status", "Breakdown"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 600, color: "#374151" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {settlements.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "0.6rem 0.75rem" }}>{s.settlementDate}</td>
                <td style={{ padding: "0.6rem 0.75rem", textTransform: "capitalize" }}>{s.serviceType}</td>
                <td style={{ padding: "0.6rem 0.75rem" }}>{s.totalMinutes} min</td>
                <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>
                  {s.status === "skipped" ? "—" : formatCents(s.chargeAmountCents, s.currency)}
                </td>
                <td style={{ padding: "0.6rem 0.75rem" }}>{statusBadge(s.status)}</td>
                <td style={{ padding: "0.6rem 0.75rem", fontSize: 12, color: "#6b7280" }}>
                  {s.breakdown && s.status === "charged" && (
                    <>
                      Base {formatCents(s.breakdown.base ?? 0)}
                      {s.breakdown.durationDiscount != null && ` − ${formatCents(s.breakdown.durationDiscount)} discount`}
                      {s.breakdown.peakAdjustment != null && ` ${s.breakdown.peakAdjustment > 0 ? "+" : ""}${formatCents(Math.abs(s.breakdown.peakAdjustment))} peak`}
                      {s.breakdown.ratePerMinute != null && ` @ $${(s.breakdown.ratePerMinute / 100).toFixed(2)}/min`}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
