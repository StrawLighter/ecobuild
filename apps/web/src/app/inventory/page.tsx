"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useBlockBalance, usePlayerStats } from "@/lib/hooks";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);
import { convertToBrick } from "@/lib/api";
import {
  BLOCKS_PER_BRICK,
  CRAFTING_TIERS,
  explorerTxUrl,
} from "@/lib/constants";
import {
  Package,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ArrowRight,
} from "lucide-react";

export default function InventoryPage() {
  const { connected } = useWallet();
  const {
    balance,
    loading: balLoading,
    refresh: refreshBal,
  } = useBlockBalance();
  const {
    stats,
    loading: statsLoading,
    refresh: refreshStats,
  } = usePlayerStats();

  const [converting, setConverting] = useState(false);
  const [convertResult, setConvertResult] = useState<{
    ok: boolean;
    tx?: string;
    error?: string;
  } | null>(null);

  const bricks = stats?.brickCount ?? 0;
  const canConvert = (balance ?? 0) >= BLOCKS_PER_BRICK;

  const handleConvert = async () => {
    setConverting(true);
    setConvertResult(null);
    try {
      const res = await convertToBrick();
      if (res.ok) {
        setConvertResult({ ok: true, tx: res.transaction });
        refreshBal();
        refreshStats();
      } else {
        setConvertResult({
          ok: false,
          error: res.error || res.detail || "Conversion failed",
        });
      }
    } catch (err: unknown) {
      setConvertResult({ ok: false, error: err instanceof Error ? err.message : "Network error" });
    } finally {
      setConverting(false);
    }
  };

  /* ---------- Not connected ---------- */
  if (!connected) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <Package className="h-16 w-16 text-stone-300" />
        <h1 className="text-2xl font-bold text-stone-900">
          Connect Your Wallet to View Inventory
        </h1>
        <p className="max-w-md text-stone-500">
          See your Bricks, convert BLOCK tokens, and explore crafting tiers.
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  /* ---------- Connected ---------- */
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Inventory</h1>
        <p className="text-stone-500">
          Convert BLOCK tokens into Bricks and explore what you can build.
        </p>
      </div>

      {/* Balance + Convert card */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* BLOCK balance */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-stone-500">BLOCK Balance</p>
          <p className="mt-1 text-3xl font-bold text-eco-600">
            {balLoading ? "..." : balance ?? 0}
          </p>
          <p className="mt-2 text-xs text-stone-400">
            {BLOCKS_PER_BRICK} BLOCKs = 1 Brick
          </p>
        </div>

        {/* Brick count */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-stone-500">Bricks Owned</p>
          <p className="mt-1 text-3xl font-bold text-brick-500">
            {statsLoading ? "..." : bricks}
          </p>
          <p className="mt-2 text-xs text-stone-400">
            Used to craft sustainable items
          </p>
        </div>
      </div>

      {/* Convert section */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-800">
          Convert BLOCKs to Brick
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Burn {BLOCKS_PER_BRICK} BLOCK tokens to receive 1 Brick on-chain.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-eco-50 px-4 py-3 text-sm font-semibold text-eco-700">
            {BLOCKS_PER_BRICK} BLOCK
          </div>
          <ArrowRight className="h-5 w-5 text-stone-400" />
          <div className="flex items-center gap-2 rounded-lg bg-brick-500/10 px-4 py-3 text-sm font-semibold text-brick-600">
            1 Brick
          </div>
        </div>

        <button
          disabled={!canConvert || converting}
          onClick={handleConvert}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brick-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brick-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {converting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Converting...
            </>
          ) : (
            "Convert to Brick"
          )}
        </button>

        {!canConvert && !balLoading && (
          <p className="mt-2 text-center text-xs text-stone-400">
            You need at least {BLOCKS_PER_BRICK} BLOCKs to convert. Collect
            more waste!
          </p>
        )}

        {/* Convert result */}
        {convertResult?.ok && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-eco-200 bg-eco-50 p-3 text-sm text-eco-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>Brick created!</span>
            {convertResult.tx && (
              <a
                href={explorerTxUrl(convertResult.tx)}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 font-medium text-eco-600 hover:underline"
              >
                View tx <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
        {convertResult && !convertResult.ok && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <XCircle className="h-4 w-4" />
            <span>{convertResult.error}</span>
          </div>
        )}
      </div>

      {/* Crafting tiers */}
      <div>
        <h2 className="text-lg font-semibold text-stone-800">Crafting Tiers</h2>
        <p className="mt-1 text-sm text-stone-500">
          Collect enough Bricks to craft sustainable items.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CRAFTING_TIERS.map((tier) => {
            const unlocked = bricks >= tier.bricks;
            return (
              <div
                key={tier.name}
                className={`relative rounded-xl border p-5 transition-colors ${
                  unlocked
                    ? "border-eco-300 bg-eco-50"
                    : "border-stone-200 bg-white"
                }`}
              >
                {unlocked && (
                  <span className="absolute right-3 top-3 rounded-full bg-eco-500 px-2 py-0.5 text-xs font-semibold text-white">
                    Unlocked
                  </span>
                )}
                <div className="text-3xl">{tier.emoji}</div>
                <h3 className="mt-2 font-semibold text-stone-900">
                  {tier.name}
                </h3>
                <p className="mt-0.5 text-sm text-stone-500">
                  {tier.description}
                </p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span>
                      {Math.min(bricks, tier.bricks)} / {tier.bricks} Bricks
                    </span>
                    <span>
                      {Math.min(
                        Math.round((bricks / tier.bricks) * 100),
                        100
                      )}
                      %
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        unlocked ? "bg-eco-500" : "bg-stone-300"
                      }`}
                      style={{
                        width: `${Math.min(
                          (bricks / tier.bricks) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
