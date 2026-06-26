import Link from "next/link";
import { useRouter } from "next/router";
import ConnectWallet from "../components/ConnectWallet";

export default function DashboardPage() {
  const router = useRouter();
  const granted = router.query.granted === "true";

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
        <span style={{ fontWeight: 700, fontSize: 16 }}>💳 Wallet</span>
      </header>

      <main style={{ maxWidth: 520, margin: "3rem auto", padding: "0 1.5rem" }}>
        {granted && (
          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1.5rem",
              padding: "1rem 1.25rem",
              border: "1px solid #bbf7d0",
              borderRadius: 10,
              background: "#f0fdf4",
              color: "#166534",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            <span style={{ fontSize: 22 }}>✅</span>
            Wallet connected — your mandate is now active.
          </div>
        )}

        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "2rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <h1 style={{ margin: "0 0 0.375rem", fontSize: 22, fontWeight: 800 }}>Connect Your Wallet</h1>
          <p style={{ margin: "0 0 1.75rem", color: "#64748b", fontSize: 14 }}>
            Enter your Open Payments wallet address to authorize spending. You&apos;ll be redirected
            to your wallet provider to approve the mandate.
          </p>
          <ConnectWallet />
        </div>

        {/* Info strip */}
        <div
          style={{
            marginTop: "1.25rem",
            padding: "1rem 1.25rem",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            fontSize: 13,
            color: "#64748b",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div>🔒 <strong>Safe &amp; reversible</strong> — you approve every mandate in your wallet.</div>
          <div>🌐 <strong>Interledger</strong> — works with any ILP-compatible wallet.</div>
          <div>🔄 <strong>Auto-settlement</strong> — charges are collected at midnight, not upfront.</div>
        </div>
      </main>
    </>
  );
}
