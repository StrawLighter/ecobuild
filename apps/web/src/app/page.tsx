"use client";

import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useBlockBalance, usePlayerStats } from "@/lib/hooks";
import { BLOCKS_PER_BRICK } from "@/lib/constants";
import { Camera, Package, Leaf, ArrowRight, Recycle, Zap } from "lucide-react";
import Link from "next/link";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm text-stone-500">{label}</p>
          <p className="text-2xl font-bold text-stone-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:border-eco-300 hover:shadow-md"
    >
      <div className="rounded-lg bg-eco-100 p-3 transition-colors group-hover:bg-eco-200">
        <Icon className="h-6 w-6 text-eco-600" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-stone-900">{title}</h3>
        <p className="text-sm text-stone-500">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-eco-500" />
    </Link>
  );
}

export default function HomePage() {
  const { connected } = useWallet();
  const { balance, loading: balLoading } = useBlockBalance();
  const { stats, loading: statsLoading } = usePlayerStats();

  /* ---------- Disconnected hero ---------- */
  if (!connected) {
    return (
      <div className="flex flex-col items-center gap-8 py-16 text-center">
        <div className="rounded-full bg-eco-100 p-6">
          <Leaf className="h-16 w-16 text-eco-500" />
        </div>
        <div className="max-w-lg space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-stone-900">
            Turn Waste Into On-Chain Bricks
          </h1>
          <p className="text-lg text-stone-500">
            Collect real-world waste, earn BLOCK tokens verified by AI, and
            craft sustainable building materials on Solana.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <WalletMultiButton />
        </div>

        {/* How it works */}
        <div className="mt-8 grid w-full max-w-3xl gap-6 sm:grid-cols-3">
          {[
            {
              icon: Camera,
              title: "1. Collect",
              text: "Snap a photo of collected waste",
            },
            {
              icon: Zap,
              title: "2. Verify",
              text: "AI classifies & mints BLOCK tokens",
            },
            {
              icon: Recycle,
              title: "3. Build",
              text: "Convert BLOCKs into Bricks & craft items",
            },
          ].map((step) => (
            <div
              key={step.title}
              className="flex flex-col items-center gap-2 rounded-xl bg-white p-6 shadow-sm border border-stone-200"
            >
              <div className="rounded-full bg-eco-100 p-3">
                <step.icon className="h-6 w-6 text-eco-600" />
              </div>
              <h3 className="font-semibold text-stone-800">{step.title}</h3>
              <p className="text-sm text-stone-500 text-center">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- Connected dashboard ---------- */
  const bricks = stats?.brickCount ?? 0;
  const collections = stats?.collectionsCount ?? 0;
  const blocksMinted = stats?.blocksMinted ?? 0;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
        <p className="text-stone-500">Welcome back, eco-builder!</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="BLOCK Balance"
          value={balLoading ? "..." : balance ?? 0}
          icon={Zap}
          color="bg-eco-500"
        />
        <StatCard
          label="Bricks Crafted"
          value={statsLoading ? "..." : bricks}
          icon={Package}
          color="bg-brick-500"
        />
        <StatCard
          label="Collections"
          value={statsLoading ? "..." : collections}
          icon={Camera}
          color="bg-blue-500"
        />
        <StatCard
          label="Total Minted"
          value={statsLoading ? "..." : blocksMinted}
          icon={Leaf}
          color="bg-emerald-600"
        />
      </div>

      {/* Progress bar toward next brick */}
      {(balance ?? 0) > 0 && (balance ?? 0) < BLOCKS_PER_BRICK && (
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="mb-2 text-sm font-medium text-stone-600">
            Progress to next Brick
          </p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-eco-500 transition-all"
              style={{
                width: `${Math.min(
                  ((balance ?? 0) / BLOCKS_PER_BRICK) * 100,
                  100
                )}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-stone-400">
            {balance ?? 0} / {BLOCKS_PER_BRICK} BLOCKs
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-800">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <QuickAction
            href="/collect"
            icon={Camera}
            title="Collect Waste"
            description="Upload a photo to verify and earn BLOCKs"
          />
          <QuickAction
            href="/inventory"
            icon={Package}
            title="View Inventory"
            description="Manage your Bricks and craft items"
          />
        </div>
      </div>
    </div>
  );
}
