import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

async function main() {
  const provider = anchor.AnchorProvider.local("http://127.0.0.1:8899");
  anchor.setProvider(provider);
  const program = anchor.workspace.Ecobuild;
  const authority = provider.wallet.publicKey;

  const [globalConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_config")],
    program.programId
  );
  const [blockMintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("block_mint")],
    program.programId
  );
  const [playerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("player"), authority.toBuffer()],
    program.programId
  );

  // Initialize config
  try {
    await (program.methods as any)
      .initializeConfig()
      .accounts({
        authority,
        globalConfig: globalConfigPda,
        blockMint: blockMintPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    console.log("GlobalConfig initialized");
  } catch (e: any) {
    console.log("Config init skipped:", e.message?.slice(0, 80));
  }

  // Initialize player
  try {
    await (program.methods as any)
      .initializePlayer()
      .accounts({
        authority,
        playerProfile: playerPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Player profile initialized");
  } catch (e: any) {
    console.log("Player init skipped:", e.message?.slice(0, 80));
  }

  console.log("Authority:", authority.toBase58());
  console.log("Done!");
}

main().catch(console.error);
