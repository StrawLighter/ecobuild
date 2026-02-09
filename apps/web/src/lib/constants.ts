import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "HcENn31gno9LMse5iERziSpLGjMdtLZAxLQo9Ff4xn5b"
);

export const BLOCK_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_BLOCK_MINT || "6DTBLHzn49kFcuq7Fhzze1rpqEj6r3T6m5gyEqpkgoY7"
);

export const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export const VERIFIER_URL =
  process.env.NEXT_PUBLIC_VERIFIER_URL || "http://localhost:3000";

export const BLOCKS_PER_BRICK = 10;

export const EXPLORER_URL = "https://explorer.solana.com";
export const EXPLORER_CLUSTER = "devnet";

export function explorerTxUrl(sig: string) {
  return `${EXPLORER_URL}/tx/${sig}?cluster=${EXPLORER_CLUSTER}`;
}

export function explorerAddrUrl(addr: string) {
  return `${EXPLORER_URL}/address/${addr}?cluster=${EXPLORER_CLUSTER}`;
}

export const CRAFTING_TIERS = [
  { name: "Planter", bricks: 2, emoji: "🌱", description: "A small planter box for community gardens" },
  { name: "Organizer", bricks: 5, emoji: "📦", description: "Storage organizer for community spaces" },
  { name: "Chair", bricks: 15, emoji: "🪑", description: "A sturdy recycled-material chair" },
  { name: "Table", bricks: 50, emoji: "🪵", description: "Community gathering table" },
  { name: "Tiny Home", bricks: 8000, emoji: "🏠", description: "A full tiny home from recycled materials" },
];
