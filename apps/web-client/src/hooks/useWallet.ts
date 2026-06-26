import { useState, useCallback } from "react";
import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4001";

interface WalletState {
  walletAddress: string | null;
  interactRedirectUrl: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

/**
 * useWallet — handles wallet address lookup and GNAP grant initiation.
 */
export function useWallet() {
  const [state, setState] = useState<WalletState>({
    walletAddress: null,
    interactRedirectUrl: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const connect = useCallback(async (walletAddress: string) => {
    setState((s) => ({
      ...s,
      isConnecting: true,
      error: null,
      isConnected: false,
      interactRedirectUrl: null,
    }));
    try {
      const { data } = await axios.post<{ interactRedirectUrl: string }>(
        `${BACKEND_URL}/api/grants/initiate`,
        { walletAddress },
        { withCredentials: true }
      );
      setState((s) => ({
        ...s,
        walletAddress,
        interactRedirectUrl: data.interactRedirectUrl,
        isConnected: true,
        isConnecting: false,
      }));
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? err.response?.data?.message ?? err.message)
        : "Unknown error";
      setState((s) => ({ ...s, isConnecting: false, error: message }));
    }
  }, []);

  return { ...state, connect };
}
