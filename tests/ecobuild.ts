import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";

describe("ecobuild", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  it("initializes a player profile PDA", async () => {
    const program = anchor.workspace.Ecobuild;
    const authority = provider.wallet.publicKey;
    const [playerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), authority.toBuffer()],
      program.programId
    );

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
    expect(tx).to.be.a("string");
  });
});
