"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { useState, useEffect, useCallback } from "react";
import { BLOCK_MINT } from "./constants";
import { fetchPlayerStats, type PlayerStats } from "./api";

export function useBlockBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    setLoading(true);
    try {
      const ata = await getAssociatedTokenAddress(BLOCK_MINT, publicKey);
      const account = await getAccount(connection, ata);
      setBalance(Number(account.amount));
    } catch {
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { balance, loading, refresh };
}

export function usePlayerStats() {
  const { publicKey } = useWallet();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setStats(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlayerStats(publicKey.toBase58());
      if (data.ok) {
        setStats(data);
      } else {
        setError(data.error || "Failed to fetch stats");
        setStats(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, error, refresh };
}
