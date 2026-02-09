import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "bn.js";
import fs from "node:fs";
import path from "node:path";

// ── IDL import ─────────────────────────────────────────────────────────
// We load the IDL dynamically at init time
let idl: any;
let program: anchor.Program;
let provider: anchor.AnchorProvider;
let authorityKeypair: Keypair;

const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID ?? "HcENn31gno9LMse5iERziSpLGjMdtLZAxLQo9Ff4xn5b"
);

// PDA derivations
const [globalConfigPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("global_config")],
  PROGRAM_ID
);

const [blockMintPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("block_mint")],
  PROGRAM_ID
);

// ── Waste type mapping ─────────────────────────────────────────────────
const WASTE_TYPE_MAP: Record<string, number> = {
  plastic: 0,
  glass: 1,
  metal: 2,
  paper: 3,
};

export function wasteTypeToU8(wasteType: string): number {
  const normalized = wasteType.toLowerCase().trim();
  if (normalized in WASTE_TYPE_MAP) {
    return WASTE_TYPE_MAP[normalized];
  }
  // Default to plastic for organic/mixed/unknown
  return 0;
}

// ── Keypair loading ───────────────────────────────────────────────────
// Supports three methods:
//   1. AUTHORITY_KEYPAIR_BASE64 — base64-encoded JSON array (for Railway/cloud secrets)
//   2. PROGRAM_AUTHORITY_KEYPAIR — path to keypair JSON file
//   3. Default: ~/.config/solana/id.json
function loadAuthorityKeypair(): Keypair {
  if (process.env.AUTHORITY_KEYPAIR_BASE64) {
    const decoded = Buffer.from(
      process.env.AUTHORITY_KEYPAIR_BASE64,
      "base64"
    ).toString("utf-8");
    const keypairData = JSON.parse(decoded);
    return Keypair.fromSecretKey(Uint8Array.from(keypairData));
  }

  const keypairPath =
    process.env.PROGRAM_AUTHORITY_KEYPAIR ??
    `${process.env.HOME}/.config/solana/id.json`;

  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(keypairData));
}

// ── Initialization ─────────────────────────────────────────────────────
export async function initSolanaClient() {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? "http://127.0.0.1:8899";
  const connection = new Connection(rpcUrl, "confirmed");

  // Load authority keypair
  authorityKeypair = loadAuthorityKeypair();

  // Build an AnchorProvider with the authority wallet
  const wallet = new anchor.Wallet(authorityKeypair);
  provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });

  // Load IDL — try multiple locations:
  //   1. IDL_PATH env var (explicit override)
  //   2. ./idl/ecobuild.json (Docker: copied into /app/idl/)
  //   3. ../../../target/idl/ecobuild.json (local dev: Anchor build output)
  const idlCandidates = [
    process.env.IDL_PATH,
    path.join(process.cwd(), "idl", "ecobuild.json"),
    path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..", "target", "idl", "ecobuild.json"),
  ].filter(Boolean) as string[];

  const idlPath = idlCandidates.find((p) => fs.existsSync(p));
  if (!idlPath) {
    throw new Error(
      `IDL not found. Searched:\n${idlCandidates.map((p) => `  - ${p}`).join("\n")}`
    );
  }

  idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  program = new anchor.Program(idl, provider);

  console.log(`[solana] Connected to ${rpcUrl}`);
  console.log(`[solana] Authority: ${authorityKeypair.publicKey.toBase58()}`);
  console.log(`[solana] Program:   ${PROGRAM_ID.toBase58()}`);
  console.log(`[solana] Config:    ${globalConfigPda.toBase58()}`);
  console.log(`[solana] Mint:      ${blockMintPda.toBase58()}`);
}

// Player profile is auto-created via init_if_needed in the mint_blocks instruction.
// No separate initialization step needed.

// ── Mint BLOCK tokens ──────────────────────────────────────────────────
export async function mintBlocks(
  playerWallet: PublicKey,
  amount: number,
  wasteType: number
): Promise<string> {
  const [playerProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("player"), playerWallet.toBuffer()],
    PROGRAM_ID
  );

  const playerAta = await getAssociatedTokenAddress(
    blockMintPda,
    playerWallet
  );

  const tx = await (program.methods as any)
    .mintBlocks(new BN(amount), wasteType)
    .accounts({
      authority: authorityKeypair.publicKey,
      globalConfig: globalConfigPda,
      blockMint: blockMintPda,
      playerProfile: playerProfilePda,
      playerTokenAccount: playerAta,
      playerAuthority: playerWallet,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log(
    `[solana] Minted ${amount} BLOCK to ${playerWallet.toBase58()} — tx: ${tx}`
  );
  return tx;
}

// ── Convert BLOCK → Brick ──────────────────────────────────────────────
export async function convertToBrick(
  playerKeypair: Keypair
): Promise<string> {
  const playerWallet = playerKeypair.publicKey;

  const [playerProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("player"), playerWallet.toBuffer()],
    PROGRAM_ID
  );

  const playerAta = await getAssociatedTokenAddress(
    blockMintPda,
    playerWallet
  );

  // For convert, the PLAYER is the signer (they burn their own tokens).
  // We need a provider with the player's wallet.
  const playerWalletAdapter = new anchor.Wallet(playerKeypair);
  const playerProvider = new anchor.AnchorProvider(
    provider.connection,
    playerWalletAdapter,
    { commitment: "confirmed" }
  );
  const playerProgram = new anchor.Program(idl, playerProvider);

  const tx = await (playerProgram.methods as any)
    .convertToBrick()
    .accounts({
      authority: playerWallet,
      globalConfig: globalConfigPda,
      blockMint: blockMintPda,
      playerProfile: playerProfilePda,
      playerTokenAccount: playerAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log(`[solana] Converted 10 BLOCK → 1 Brick for ${playerWallet.toBase58()} — tx: ${tx}`);
  return tx;
}

// ── Convert using authority (for API endpoint where player isn't signing) ──
export async function convertToBrickAsAuthority(): Promise<string> {
  // When called via API, we use the authority keypair as the player too
  return convertToBrick(authorityKeypair);
}

// ── Get player stats ───────────────────────────────────────────────────
export async function getPlayerStats(playerWallet: PublicKey) {
  const [playerProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("player"), playerWallet.toBuffer()],
    PROGRAM_ID
  );

  try {
    const profile = await (program.account as any).playerProfile.fetch(
      playerProfilePda
    );

    // Get token balance
    let blockBalance = 0;
    try {
      const playerAta = await getAssociatedTokenAddress(
        blockMintPda,
        playerWallet
      );
      const tokenAccount = await getAccount(provider.connection, playerAta);
      blockBalance = Number(tokenAccount.amount);
    } catch {
      // ATA doesn't exist yet
    }

    return {
      wallet: playerWallet.toBase58(),
      totalCredits: profile.totalCredits.toNumber(),
      blocksMinted: profile.blocksMinted.toNumber(),
      brickCount: profile.brickCount.toNumber(),
      collectionsCount: profile.collectionsCount.toNumber(),
      currentBlockBalance: blockBalance,
    };
  } catch {
    return null;
  }
}

// ── Get global stats ───────────────────────────────────────────────────
export async function getGlobalStats() {
  try {
    const config = await (program.account as any).globalConfig.fetch(
      globalConfigPda
    );
    return {
      authority: config.authority.toBase58(),
      blockMint: config.blockMint.toBase58(),
      totalBlocksMinted: config.totalBlocksMinted.toNumber(),
      totalBricksCreated: config.totalBricksCreated.toNumber(),
    };
  } catch {
    return null;
  }
}

// ── Initialize config (one-time setup) ─────────────────────────────────
export async function initializeConfig(): Promise<string> {
  const tx = await (program.methods as any)
    .initializeConfig()
    .accounts({
      authority: authorityKeypair.publicKey,
      globalConfig: globalConfigPda,
      blockMint: blockMintPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  console.log(`[solana] GlobalConfig initialized — tx: ${tx}`);
  return tx;
}

export { authorityKeypair, globalConfigPda, blockMintPda, PROGRAM_ID };
