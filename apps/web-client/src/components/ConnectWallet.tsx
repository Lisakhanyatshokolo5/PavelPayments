"use client";

import { useState } from "react";
import { useWallet } from "../hooks/useWallet";

/**
 * ConnectWallet — prompts the user to enter their wallet address
 * and initiates the Open Payments grant flow.
 */
export default function ConnectWallet() {
  const [walletAddress, setWalletAddress] = useState("");
  const { connect, isConnecting, error } = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress.trim()) return;
    await connect(walletAddress.trim());
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <label htmlFor="walletAddress" style={{ fontWeight: 600 }}>
        Your Wallet Address
      </label>
      <input
        id="walletAddress"
        type="url"
        placeholder="https://wallet.example/accounts/you"
        value={walletAddress}
        onChange={(e) => setWalletAddress(e.target.value)}
        required
        style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
      />
      {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}
      <button type="submit" disabled={isConnecting}>
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </button>
    </form>
  );
}
