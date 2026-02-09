"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useBlockBalance } from "@/lib/hooks";
import { Leaf, Camera, Package, Home, Menu, X } from "lucide-react";
import { useState } from "react";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/collect", label: "Collect", icon: Camera },
  { href: "/inventory", label: "Inventory", icon: Package },
];

export default function Nav() {
  const pathname = usePathname();
  const { connected } = useWallet();
  const { balance, loading } = useBlockBalance();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-eco-700">
          <Leaf className="h-6 w-6 text-eco-500" />
          <span>EcoBuild</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-eco-100 text-eco-700"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right side: balance + wallet */}
        <div className="flex items-center gap-3">
          {connected && (
            <div className="hidden items-center gap-1.5 rounded-full bg-eco-50 px-3 py-1.5 text-sm font-semibold text-eco-700 sm:flex">
              <span className="text-eco-500">BLOCK</span>
              <span>{loading ? "..." : balance ?? 0}</span>
            </div>
          )}
          <WalletMultiButton />

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-stone-200 bg-white px-4 pb-4 pt-2 md:hidden">
          {connected && (
            <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-eco-50 px-3 py-2 text-sm font-semibold text-eco-700">
              <span className="text-eco-500">BLOCK</span>
              <span>{loading ? "..." : balance ?? 0}</span>
            </div>
          )}
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-eco-100 text-eco-700"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
