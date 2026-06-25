"use client";

import { useOpenPayments, type Transaction } from "../hooks/useOpenPayments";

interface UsageHistoryPageProps {
  walletAddress: string | null;
}

export default function UsageHistoryPage({ walletAddress }: UsageHistoryPageProps) {
  const { transactions, isLoading, error } = useOpenPayments(walletAddress);

  if (!walletAddress) return <p>Connect your wallet to view history.</p>;
  if (isLoading) return <p>Loading transactions…</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (transactions.length === 0) return <p>No transactions yet.</p>;

  return (
    <div>
      <h2>Usage History</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Date", "Description", "Amount", "Status"].map((h) => (
              <th key={h} style={{ textAlign: "left", borderBottom: "2px solid #eee", padding: "0.5rem" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx: Transaction) => (
            <tr key={tx.id}>
              <td style={{ padding: "0.5rem" }}>{new Date(tx.createdAt).toLocaleString()}</td>
              <td style={{ padding: "0.5rem" }}>{tx.description}</td>
              <td style={{ padding: "0.5rem" }}>
                {tx.amount} {tx.currency}
              </td>
              <td style={{ padding: "0.5rem", color: tx.status === "completed" ? "green" : tx.status === "failed" ? "red" : "orange" }}>
                {tx.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
