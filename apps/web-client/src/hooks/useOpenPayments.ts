import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4001";

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  description: string;
  createdAt: string;
  status: "completed" | "pending" | "failed";
}

/**
 * useOpenPayments — fetches the user's transaction history from the backend.
 */
export function useOpenPayments(walletAddress: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!walletAddress) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<Transaction[]>(`${BACKEND_URL}/api/transactions`, {
        params: { walletAddress },
      });
      setTransactions(data);
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? err.message : "Failed to fetch transactions");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, isLoading, error, refetch: fetchTransactions };
}
