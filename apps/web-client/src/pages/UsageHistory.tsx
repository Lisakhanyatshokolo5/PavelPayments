"use client";

import Link from "next/link";
import { useOpenPayments, type Transaction } from "../hooks/useOpenPayments";

interface UsageHistoryPageProps {
  walletAddress: string | null;
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  completed: { color: "#15803d", bg: "#f0fdf4" },
  failed: { color: "#dc2626", bg: "#fef2f2" },
  pending: { color: "#d97706", bg: "#fffbeb" },
};

export default function UsageHistoryPage({ walletAddress }: UsageHistoryPageProps) {
  const { transactions, isLoading, error } = useOpenPayments(walletAddress);

  const header = (
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
      <Link href="/Dashboard" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>
        ← Dashboard
      </Link>
      <span style={{ color: "#475569" }}>|</span>
      <span style={{ fontWeight: 700, fontSize: 16 }}>📋 Usage History</span>
    </header>
  );

  const wrap = (children: React.ReactNode) => (
    <>
      {header}
      <main style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1.5rem" }}>{children}</main>
    </>
  );

  if (!walletAddress) return wrap(
    <div
      style={{
        padding: "3rem",
        textAlign: "center",
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        color: "#64748b",
      }}
    >
      <div style={{ fontSize: 40, marginBottom: "1rem" }}>💳</div>
      <div style={{ fontWeight: 600 }}>No wallet connected</div>
      <div style={{ fontSize: 14, marginTop: 8 }}>
        <Link href="/Dashboard" style={{ color: "#2563eb" }}>Connect your wallet</Link> to view history.
      </div>
    </div>
  );

  if (isLoading) return wrap(<p style={{ color: "#94a3b8", padding: "2rem 0" }}>Loading transactions…</p>);

  if (error) return wrap(
    <div style={{ padding: "1rem 1.25rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#dc2626" }}>
      Error: {error}
    </div>
  );

  if (transactions.length === 0) return wrap(
    <div
      style={{
        padding: "3rem",
        textAlign: "center",
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        color: "#64748b",
      }}
    >
      <div style={{ fontSize: 40, marginBottom: "1rem" }}>📭</div>
      <div style={{ fontWeight: 600 }}>No transactions yet</div>
      <div style={{ fontSize: 14, marginTop: 8 }}>Charges will appear here after settlement.</div>
    </div>
  );

  return wrap(
    <>
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ margin: "0 0 0.25rem", fontSize: 20, fontWeight: 800 }}>Usage History</h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>{walletAddress}</p>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["Date", "Description", "Amount", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{ textAlign: "left", padding: "0.75rem 1rem", fontWeight: 600, color: "#374151" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx: Transaction, i: number) => {
                const s = STATUS_STYLE[tx.status] ?? { color: "#64748b", bg: "#f8fafc" };
                return (
                  <tr
                    key={tx.id}
                    style={{ borderBottom: i < transactions.length - 1 ? "1px solid #f1f5f9" : "none" }}
                  >
                    <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", color: "#64748b" }}>
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>{tx.description}</td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>
                      {tx.amount} {tx.currency}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                          color: s.color,
                          background: s.bg,
                        }}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
