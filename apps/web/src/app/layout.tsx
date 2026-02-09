import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import WalletProvider from "@/components/WalletProvider";
import Nav from "@/components/Nav";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "EcoBuild | Turn Waste Into On-Chain Bricks",
  description:
    "Collect real-world waste, earn BLOCK tokens verified by AI, and craft sustainable building materials on Solana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <WalletProvider>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
