import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DollarToken } from "../target/types/dollar_token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { assert } from "chai";

describe("Access Control Features", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DollarToken as Program<DollarToken>;
  const authority = provider.wallet as anchor.Wallet;
  const mintKeypair = Keypair.generate();
  
  let tokenInfoPda: PublicKey;
  let authorityTokenAccount: PublicKey;

  before(async () => {
    [tokenInfoPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_info"), mintKeypair.publicKey.toBuffer()],
      program.programId
    );

    authorityTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      authority.publicKey
    );

    // Initialize token
    await program.methods
      .initializeToken("Dollar Token", "TDL", "https://example.com/metadata.json", 9)
      .accounts({
        authority: authority.publicKey,
        mint: mintKeypair.publicKey,
        tokenInfo: tokenInfoPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    // Create token account
    const createAtaIx = createAssociatedTokenAccountInstruction(
      authority.publicKey,
      authorityTokenAccount,
      authority.publicKey,
      mintKeypair.publicKey
    );
    const tx = new anchor.web3.Transaction().add(createAtaIx);
    await provider.sendAndConfirm(tx);

    // Mint some tokens
    await program.methods
      .mintTokens(new anchor.BN(1_000_000_000_000))
      .accounts({
        authority: authority.publicKey,
        mint: mintKeypair.publicKey,
        tokenInfo: tokenInfoPda,
        destination: authorityTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  });

  describe("Blacklist Functionality", () => {
    const maliciousWallet = Keypair.generate().publicKey;
    let blacklistPda: PublicKey;

    before(async () => {
      [blacklistPda] = await PublicKey.findProgramAddress(
        [Buffer.from("blacklist"), mintKeypair.publicKey.toBuffer(), maliciousWallet.toBuffer()],
        program.programId
      );
    });

    it("Should add wallet to blacklist", async () => {
      const tx = await program.methods
        .addToBlacklist(maliciousWallet)
        .accounts({
          authority: authority.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
          blacklist: blacklistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Blacklist transaction:", tx);

      const blacklistAccount = await program.account.blacklistEntry.fetch(blacklistPda);
      assert.equal(blacklistAccount.wallet.toString(), maliciousWallet.toString());
      assert.isTrue(blacklistAccount.isBlacklisted);
    });

    it("Should remove wallet from blacklist", async () => {
      const tx = await program.methods
        .removeFromBlacklist(maliciousWallet)
        .accounts({
          authority: authority.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
          blacklist: blacklistPda,
        })
        .rpc();

      console.log("Remove blacklist transaction:", tx);

      const blacklistAccount = await program.account.blacklistEntry.fetch(blacklistPda);
      assert.isFalse(blacklistAccount.isBlacklisted);
    });

    it("Should toggle blacklist system", async () => {
      // Disable blacklist
      await program.methods
        .toggleBlacklistSystem(false)
        .accounts({
          authority: authority.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
        })
        .rpc();

      let tokenInfo = await program.account.tokenInfo.fetch(tokenInfoPda);
      assert.isFalse(tokenInfo.blacklistEnabled);

      // Re-enable blacklist
      await program.methods
        .toggleBlacklistSystem(true)
        .accounts({
          authority: authority.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
        })
        .rpc();

      tokenInfo = await program.account.tokenInfo.fetch(tokenInfoPda);
      assert.isTrue(tokenInfo.blacklistEnabled);
    });

    it("Should not allow unauthorized user to blacklist", async () => {
      const unauthorized = Keypair.generate();
      
      try {
        await program.methods
          .addToBlacklist(maliciousWallet)
          .accounts({
            authority: unauthorized.publicKey,
            mint: mintKeypair.publicKey,
            tokenInfo: tokenInfoPda,
            blacklist: blacklistPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorized])
          .rpc();
        
        assert.fail("Expected transaction to fail");
      } catch (error) {
        assert.include(error.toString(), "UnauthorizedAccess");
      }
    });
  });

  describe("Whitelist Functionality", () => {
    const investor = Keypair.generate().publicKey;
    let whitelistPda: PublicKey;
    const allocation = new anchor.BN(10_000_000_000); // 10 tokens

    before(async () => {
      [whitelistPda] = await PublicKey.findProgramAddress(
        [Buffer.from("whitelist"), mintKeypair.publicKey.toBuffer(), investor.toBuffer()],
        program.programId
      );
    });

    it("Should add wallet to whitelist", async () => {
      const tx = await program.methods
        .addToWhitelist(investor, allocation)
        .accounts({
          authority: authority.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
          whitelist: whitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Whitelist transaction:", tx);

      const whitelistAccount = await program.account.whitelistEntry.fetch(whitelistPda);
      assert.equal(whitelistAccount.wallet.toString(), investor.toString());
      assert.isTrue(whitelistAccount.isWhitelisted);
      assert.equal(whitelistAccount.allocation.toNumber(), allocation.toNumber());
    });

    it("Should remove wallet from whitelist", async () => {
      const tx = await program.methods
        .removeFromWhitelist(investor)
        .accounts({
          authority: authority.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
          whitelist: whitelistPda,
        })
        .rpc();

      console.log("Remove whitelist transaction:", tx);

      const whitelistAccount = await program.account.whitelistEntry.fetch(whitelistPda);
      assert.isFalse(whitelistAccount.isWhitelisted);
    });

    it("Should toggle whitelist mode", async () => {
      // Enable whitelist mode
      await program.methods
        .toggleWhitelistMode(true)
        .accounts({
          authority: authority.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
        })
        .rpc();

      let tokenInfo = await program.account.tokenInfo.fetch(tokenInfoPda);
      assert.isTrue(tokenInfo.whitelistEnabled);

      // Disable whitelist mode
      await program.methods
        .toggleWhitelistMode(false)
        .accounts({
          authority: authority.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
        })
        .rpc();

      tokenInfo = await program.account.tokenInfo.fetch(tokenInfoPda);
      assert.isFalse(tokenInfo.whitelistEnabled);
    });
  });

  describe("Trading Control", () => {
    it("Should toggle trading on/off", async () => {
      // Disable trading
      await program.methods
        .toggleTrading(false)
        .accounts({
          authority: authority.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
        })
        .rpc();

      let tokenInfo = await program.account.tokenInfo.fetch(tokenInfoPda);
      assert.isFalse(tokenInfo.tradingEnabled);

      // Enable trading
      await program.methods
        .toggleTrading(true)
        .accounts({
          authority: authority.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
        })
        .rpc();

      tokenInfo = await program.account.tokenInfo.fetch(tokenInfoPda);
      assert.isTrue(tokenInfo.tradingEnabled);
    });

    it("Should not allow unauthorized user to toggle trading", async () => {
      const unauthorized = Keypair.generate();
      
      try {
        await program.methods
          .toggleTrading(false)
          .accounts({
            authority: unauthorized.publicKey,
            mint: mintKeypair.publicKey,
            tokenInfo: tokenInfoPda,
          })
          .signers([unauthorized])
          .rpc();
        
        assert.fail("Expected transaction to fail");
      } catch (error) {
        assert.include(error.toString(), "UnauthorizedAccess");
      }
    });
  });

  describe("Access Control Status", () => {
    it("Should correctly report all access control states", async () => {
      const tokenInfo = await program.account.tokenInfo.fetch(tokenInfoPda);
      
      console.log("Access Control Status:");
      console.log("  Trading Enabled:", tokenInfo.tradingEnabled);
      console.log("  Whitelist Enabled:", tokenInfo.whitelistEnabled);
      console.log("  Blacklist Enabled:", tokenInfo.blacklistEnabled);

      assert.isDefined(tokenInfo.tradingEnabled);
      assert.isDefined(tokenInfo.whitelistEnabled);
      assert.isDefined(tokenInfo.blacklistEnabled);
    });
  });

  describe("Integration Tests", () => {
    it("Should setup anti-bot protection for launch", async () => {
      // Enable blacklist
      await program.methods
        .toggleBlacklistSystem(true)
        .accounts({
          authority: authority.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
        })
        .rpc();

      // Disable trading
      await program.methods
        .toggleTrading(false)
        .accounts({
          authority: authority.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
        })
        .rpc();

      // Enable whitelist mode
      await program.methods
        .toggleWhitelistMode(true)
        .accounts({
          authority: authority.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
        })
        .rpc();

      const tokenInfo = await program.account.tokenInfo.fetch(tokenInfoPda);
      assert.isTrue(tokenInfo.blacklistEnabled);
      assert.isFalse(tokenInfo.tradingEnabled);
      assert.isTrue(tokenInfo.whitelistEnabled);

      console.log("✅ Anti-bot protection configured successfully");
    });

    it("Should transition to public trading", async () => {
      // Disable whitelist mode
      await program.methods
        .toggleWhitelistMode(false)
        .accounts({
          authority: authority.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
        })
        .rpc();

      // Enable trading
      await program.methods
        .toggleTrading(true)
        .accounts({
          authority: authority.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
        })
        .rpc();

      const tokenInfo = await program.account.tokenInfo.fetch(tokenInfoPda);
      assert.isFalse(tokenInfo.whitelistEnabled);
      assert.isTrue(tokenInfo.tradingEnabled);
      assert.isTrue(tokenInfo.blacklistEnabled); // Still enabled for protection

      console.log("✅ Public trading enabled successfully");
    });
  });
});