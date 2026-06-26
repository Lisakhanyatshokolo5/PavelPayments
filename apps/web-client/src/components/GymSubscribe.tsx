"use client";

import { useState, useEffect } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4001";

interface PricingData {
  dynamic: Record<string, number>;
  static: Record<string, number>;
  currency: string;
  peakHours: string[];
  maxDurationDiscountPercent: number;
}

interface GymSubscribeProps {
  nfcUid: string;
}

export default function GymSubscribe({ nfcUid }: GymSubscribeProps) {
  const [walletAddress, setWalletAddress] = useState("");
  const [subscriptionType, setSubscriptionType] = useState<"dynamic" | "static">("dynamic");
  const [tier, setTier] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BACKEND}/api/gym/pricing`)
      .then((r) => r.json())
      .then(setPricing)
      .catch(() => {});
  }, []);

  const previewCents =
    pricing
      ? subscriptionType === "dynamic"
        ? pricing.dynamic[tier]
        : pricing.static[tier]
      : null;

  const previewLabel = previewCents != null ? `$${(previewCents / 100).toFixed(2)}` : "—";

  const tierLabel: Record<string, string> = {
    daily: "per visit",
    weekly: "per week",
    monthly: "per month",
    yearly: "per year",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!walletAddress.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${BACKEND}/api/gym/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ walletAddress: walletAddress.trim(), nfcUid, subscriptionType, tier }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? "Subscription failed");
      }

      const { interactRedirectUrl } = await res.json();
      // Redirect user to their wallet for GNAP consent
      window.location.href = interactRedirectUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "1.5rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Join the Gym</h2>

      <div style={{ marginBottom: "1rem" }}>
        <p style={{ margin: "0 0 0.5rem", fontSize: 14, color: "#6b7280" }}>
          <strong>Dynamic</strong> — pay only on days you visit; rate reduces the longer you stay.
          <br />
          <strong>Static</strong> — flat fee per period regardless of visits (traditional membership).
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 500, fontSize: 14 }}>Wallet Address</span>
          <input
            type="url"
            placeholder="https://ilp.interledger-test.dev/yourname"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            required
            style={{ padding: "0.5rem 0.75rem", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 }}
          />
        </label>

        <fieldset style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "0.75rem" }}>
          <legend style={{ fontWeight: 500, fontSize: 14, padding: "0 4px" }}>Billing Type</legend>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {(["dynamic", "static"] as const).map((type) => (
              <label key={type} style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="subscriptionType"
                  value={type}
                  checked={subscriptionType === type}
                  onChange={() => setSubscriptionType(type)}
                />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "0.75rem" }}>
          <legend style={{ fontWeight: 500, fontSize: 14, padding: "0 4px" }}>Billing Interval</legend>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {(["daily", "weekly", "monthly", "yearly"] as const).map((t) => (
              <label
                key={t}
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  cursor: "pointer",
                  padding: "0.4rem 0.6rem",
                  borderRadius: 6,
                  background: tier === t ? "#eff6ff" : "transparent",
                  border: tier === t ? "1px solid #3b82f6" : "1px solid transparent",
                }}
              >
                <input type="radio" name="tier" value={t} checked={tier === t} onChange={() => setTier(t)} />
                <span>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {pricing && (
                    <span style={{ color: "#6b7280", fontSize: 12, marginLeft: 4 }}>
                      ${((subscriptionType === "dynamic" ? pricing.dynamic[t] : pricing.static[t]) / 100).toFixed(2)}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Live pricing preview */}
        <div style={{ background: "#f9fafb", borderRadius: 6, padding: "0.75rem", fontSize: 14 }}>
          <strong>Estimated charge:</strong> {previewLabel} {tierLabel[tier]}
          {subscriptionType === "dynamic" && tier === "daily" && pricing && (
            <p style={{ margin: "0.25rem 0 0", fontSize: 12, color: "#6b7280" }}>
              Can drop to ${((pricing.dynamic[tier] * 0.5) / 100).toFixed(2)} with {pricing.maxDurationDiscountPercent}% discount after 120 min.
              {" "}Peak hours: {pricing.peakHours.join(", ")}.
            </p>
          )}
        </div>

        {error && <p style={{ color: "#dc2626", margin: 0, fontSize: 14 }}>{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "0.6rem 1.2rem",
            background: isLoading ? "#93c5fd" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 15,
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "Connecting wallet…" : "Subscribe & Connect Wallet"}
        </button>
      </form>
    </div>
  );
}
