import { VERIFIER_URL } from "./constants";

export type VerifyResult = {
  ok: boolean;
  verified?: boolean;
  classification?: {
    waste_detected: boolean;
    waste_type: string;
    estimated_weight_lbs: number;
    confidence: number;
    description: string;
  };
  blocksMinted?: number;
  transaction?: string | null;
  playerWallet?: string;
  reason?: string;
  error?: string;
  detail?: string;
  errors?: string[];
};

export type ConvertResult = {
  ok: boolean;
  transaction?: string;
  blocksConverted?: number;
  bricksReceived?: number;
  error?: string;
  detail?: string;
};

export type PlayerStats = {
  ok: boolean;
  wallet?: string;
  totalCredits?: number;
  blocksMinted?: number;
  brickCount?: number;
  collectionsCount?: number;
  currentBlockBalance?: number;
  error?: string;
};

export async function verifyWaste(
  image: File,
  playerWallet: string
): Promise<VerifyResult> {
  const form = new FormData();
  form.append("image", image);
  form.append("player_wallet", playerWallet);

  const res = await fetch(`${VERIFIER_URL}/verify`, {
    method: "POST",
    body: form,
  });

  return res.json();
}

export async function convertToBrick(): Promise<ConvertResult> {
  const res = await fetch(`${VERIFIER_URL}/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}

export async function fetchPlayerStats(wallet: string): Promise<PlayerStats> {
  const res = await fetch(`${VERIFIER_URL}/stats/${wallet}`);
  const data = await res.json();
  // 404 means player profile not initialized yet — treat as empty, not error
  if (!res.ok && res.status === 404) {
    return {
      ok: true,
      totalCredits: 0,
      blocksMinted: 0,
      brickCount: 0,
      collectionsCount: 0,
      currentBlockBalance: 0,
    };
  }
  return data;
}
