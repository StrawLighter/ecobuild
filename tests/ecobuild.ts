import * as anchor from "@coral-xyz/anchor";
import { BN } from "bn.js";
import { expect } from "chai";
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("ecobuild", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Ecobuild;
  const authority = provider.wallet.publicKey;

  // PDAs
  const [playerPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("player"), authority.toBuffer()],
    program.programId
  );
  const [globalConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("global_config")],
    program.programId
  );
  const [blockMintPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("block_mint")],
    program.programId
  );

  let playerAta: anchor.web3.PublicKey;

  before(async () => {
    playerAta = await getAssociatedTokenAddress(blockMintPda, authority);
  });

  it("initializes a player profile PDA", async () => {
    const tx = await program.methods
      .initializePlayer()
      .accounts({
        authority,
        playerProfile: playerPda,
      })
      .rpc();

    const account = await program.account.playerProfile.fetch(playerPda);
    expect(account.authority.toBase58()).to.equal(authority.toBase58());
    expect(account.bump).to.be.a("number");
    expect(account.totalCredits.toNumber()).to.equal(0);
    expect(account.blocksMinted.toNumber()).to.equal(0);
    expect(account.brickCount.toNumber()).to.equal(0);
    expect(account.collectionsCount.toNumber()).to.equal(0);
    expect(tx).to.be.a("string");
  });

  it("initializes global config and creates BLOCK mint", async () => {
    const tx = await program.methods
      .initializeConfig()
      .accounts({
        authority,
        globalConfig: globalConfigPda,
        blockMint: blockMintPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const config = await program.account.globalConfig.fetch(globalConfigPda);
    expect(config.authority.toBase58()).to.equal(authority.toBase58());
    expect(config.blockMint.toBase58()).to.equal(blockMintPda.toBase58());
    expect(config.totalBlocksMinted.toNumber()).to.equal(0);
    expect(config.totalBricksCreated.toNumber()).to.equal(0);
    expect(tx).to.be.a("string");
  });

  it("mints BLOCK tokens to player", async () => {
    const mintAmount = 25;
    const wasteType = 0; // Plastic

    const tx = await program.methods
      .mintBlocks(new BN(mintAmount), wasteType)
      .accounts({
        authority,
        globalConfig: globalConfigPda,
        blockMint: blockMintPda,
        playerProfile: playerPda,
        playerTokenAccount: playerAta,
        playerAuthority: authority,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Check token balance
    const tokenAccount = await getAccount(provider.connection, playerAta);
    expect(Number(tokenAccount.amount)).to.equal(mintAmount);

    // Check player stats
    const player = await program.account.playerProfile.fetch(playerPda);
    expect(player.blocksMinted.toNumber()).to.equal(mintAmount);
    expect(player.collectionsCount.toNumber()).to.equal(1);

    // Check global stats
    const config = await program.account.globalConfig.fetch(globalConfigPda);
    expect(config.totalBlocksMinted.toNumber()).to.equal(mintAmount);
    expect(tx).to.be.a("string");
  });

  it("mints additional BLOCK tokens (cumulative stats)", async () => {
    const mintAmount = 15;
    const wasteType = 1; // Glass

    await program.methods
      .mintBlocks(new BN(mintAmount), wasteType)
      .accounts({
        authority,
        globalConfig: globalConfigPda,
        blockMint: blockMintPda,
        playerProfile: playerPda,
        playerTokenAccount: playerAta,
        playerAuthority: authority,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // 25 + 15 = 40
    const tokenAccount = await getAccount(provider.connection, playerAta);
    expect(Number(tokenAccount.amount)).to.equal(40);

    const player = await program.account.playerProfile.fetch(playerPda);
    expect(player.blocksMinted.toNumber()).to.equal(40);
    expect(player.collectionsCount.toNumber()).to.equal(2);

    const config = await program.account.globalConfig.fetch(globalConfigPda);
    expect(config.totalBlocksMinted.toNumber()).to.equal(40);
  });

  it("converts 10 BLOCK tokens to 1 Brick", async () => {
    const tx = await program.methods
      .convertToBrick()
      .accounts({
        authority,
        globalConfig: globalConfigPda,
        blockMint: blockMintPda,
        playerProfile: playerPda,
        playerTokenAccount: playerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // 40 - 10 = 30
    const tokenAccount = await getAccount(provider.connection, playerAta);
    expect(Number(tokenAccount.amount)).to.equal(30);

    const player = await program.account.playerProfile.fetch(playerPda);
    expect(player.brickCount.toNumber()).to.equal(1);

    const config = await program.account.globalConfig.fetch(globalConfigPda);
    expect(config.totalBricksCreated.toNumber()).to.equal(1);
    expect(tx).to.be.a("string");
  });

  it("converts another 10 BLOCK to Brick (cumulative)", async () => {
    await program.methods
      .convertToBrick()
      .accounts({
        authority,
        globalConfig: globalConfigPda,
        blockMint: blockMintPda,
        playerProfile: playerPda,
        playerTokenAccount: playerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // 30 - 10 = 20
    const tokenAccount = await getAccount(provider.connection, playerAta);
    expect(Number(tokenAccount.amount)).to.equal(20);

    const player = await program.account.playerProfile.fetch(playerPda);
    expect(player.brickCount.toNumber()).to.equal(2);

    const config = await program.account.globalConfig.fetch(globalConfigPda);
    expect(config.totalBricksCreated.toNumber()).to.equal(2);
  });

  it("fails to convert when insufficient BLOCK tokens", async () => {
    // Burn down to 5 tokens: convert twice more (20 -> 10 -> 0), then we'd need more
    // Actually player has 20 tokens. Convert twice to get to 0, then try again.
    await program.methods
      .convertToBrick()
      .accounts({
        authority,
        globalConfig: globalConfigPda,
        blockMint: blockMintPda,
        playerProfile: playerPda,
        playerTokenAccount: playerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc(); // 20 -> 10

    await program.methods
      .convertToBrick()
      .accounts({
        authority,
        globalConfig: globalConfigPda,
        blockMint: blockMintPda,
        playerProfile: playerPda,
        playerTokenAccount: playerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc(); // 10 -> 0

    // Verify balance is 0
    const tokenAccount = await getAccount(provider.connection, playerAta);
    expect(Number(tokenAccount.amount)).to.equal(0);

    // Now try to convert with 0 balance — should fail
    try {
      await program.methods
        .convertToBrick()
        .accounts({
          authority,
          globalConfig: globalConfigPda,
          blockMint: blockMintPda,
          playerProfile: playerPda,
          playerTokenAccount: playerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      expect.fail("should have thrown InsufficientBlocks error");
    } catch (err: any) {
      expect(err.toString()).to.include("InsufficientBlocks");
    }
  });
});
