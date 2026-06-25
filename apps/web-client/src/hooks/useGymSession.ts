"use client";

import { useState, useEffect, useCallback } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4001";

interface EstimatedCharge {
  amount: number;
  currency: string;
  breakdown: {
    base?: number;
    durationDiscount?: number;
    peakAdjustment?: number;
  };
}

interface GymSessionData {
  currentSession: { id: string; tapInAt: string } | null;
  todayMinutes: number;
  peakMinutes: number;
  estimatedCharge: EstimatedCharge | null;
  subscription: { tier: string; subscriptionType: string } | null;
}

export function useGymSession(nfcUid: string | null, pollIntervalMs = 30_000) {
  const [data, setData] = useState<GymSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!nfcUid) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/gym/session/${encodeURIComponent(nfcUid)}`);
      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg);
      }
      setData(await res.json());
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setIsLoading(false);
    }
  }, [nfcUid]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetch_, pollIntervalMs]);

  return { data, isLoading, error, refresh: fetch_ };
}
