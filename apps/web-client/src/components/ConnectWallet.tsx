"use client";

import { useEffect, useState } from "react";
import { useWallet } from "../hooks/useWallet";

export default function ConnectWallet() {
  const [walletAddress, setWalletAddress] = useState("");
  const { connect, isConnecting, isConnected, interactRedirectUrl, error } = useWallet();

  useEffect(() => {
    if (!interactRedirectUrl) return;
    window.location.href = interactRedirectUrl;
  }, [interactRedirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress.trim()) return;
    await connect(walletAddress.trim());
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <label
          htmlFor="walletAddress"
          style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: "0.375rem", color: "#374151" }}
        >
          Wallet Address
        </label>
        <input
          id="walletAddress"
          type="url"
          placeholder="https://ilp.interledger-test.dev/yourname"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          required
          disabled={isConnecting}
          style={{
            width: "100%",
            padding: "0.625rem 0.875rem",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 14,
            outline: "none",
            background: isConnecting ? "#f9fafb" : "#fff",
            transition: "border-color 0.15s",
          }}
        />
      </div>

      {isConnected && !error && (
        <p style={{ margin: 0, color: "#2563eb", fontSize: 14, fontWeight: 500 }}>
          ⏳ Redirecting you to wallet consent…
        </p>
      )}
      {interactRedirectUrl && (
        <a
          href={interactRedirectUrl}
          style={{ fontSize: 13, color: "#2563eb", textDecoration: "underline" }}
        >
          Redirect not opening? Click here →
        </a>
      )}
      {error && (
        <p
          style={{
            margin: 0,
            color: "#dc2626",
            fontSize: 13,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 6,
            padding: "0.5rem 0.75rem",
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isConnecting}
        style={{
          padding: "0.7rem 1.5rem",
          background: isConnecting ? "#93c5fd" : "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 600,
          cursor: isConnecting ? "not-allowed" : "pointer",
          transition: "background 0.15s",
          alignSelf: "flex-start",
        }}
      >
        {isConnecting ? "Connecting…" : "Connect Wallet →"}
      </button>
    </form>
  );
}
