import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DollarToken } from "../target/types/dollar_token";
import { 
  PublicKey, 
  Keypair, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { assert } from "chai";

describe("dollar-token", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DollarToken as Program<DollarToken>;
  
  // Test accounts
  const authority = provider.wallet as anchor.Wallet;
  const mintKeypair = Keypair.generate();
  
  let tokenInfoPda: PublicKey;
  let tokenInfoBump: number;
  let authorityTokenAccount: PublicKey;

  before(async () => {
    // Derive PDA for token info
    [tokenInfoPda, tokenInfoBump] = await PublicKey.findProgramAddress(
      [Buffer.from("token_info"), mintKeypair.publicKey.toBuffer()],
      program.programId
    );

    // Get associated token account for authority
    authorityTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      authority.publicKey
    );
  });

  it("Initialize Token", async () => {
    const tx = await program.methods
      .initializeToken(
        "Dollar Token",
        "TDL", 
        "https://raw.githubusercontent.com/example/dollar-token-metadata.json",
        9
      )
      .accounts({
        authority: authority.publicKey,
        mint: mintKeypair.publicKey,
        tokenInfo: tokenInfoPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    console.log("Initialize token transaction signature", tx);

    // Verify token info account
    const tokenInfoAccount = await program.account.tokenInfo.fetch(tokenInfoPda);
    assert.equal(tokenInfoAccount.name, "Dollar Token");
    assert.equal(tokenInfoAccount.symbol, "TDL");
    assert.equal(tokenInfoAccount.decimals, 9);
    assert.equal(tokenInfoAccount.totalSupply.toNumber(), 0);
    assert.isTrue(tokenInfoAccount.isInitialized);
  });

  it("Mint Tokens", async () => {
    const mintAmount = new anchor.BN(100_000_000_000); // 100 tokens (with 9 decimals)
    
    // Create associated token account first
    const createAtaIx = createAssociatedTokenAccountInstruction(
      authority.publicKey,
      authorityTokenAccount,
      authority.publicKey,
      mintKeypair.publicKey
    );

    // Send create ATA transaction
    const createAtaTx = new anchor.web3.Transaction().add(createAtaIx);
    await provider.sendAndConfirm(createAtaTx);

    const tx = await program.methods
      .mintTokens(mintAmount)
      .accounts({
        authority: authority.publicKey,
        mint: mintKeypair.publicKey,
        tokenInfo: tokenInfoPda,
        destination: authorityTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Mint tokens transaction signature", tx);

    // Verify token info account updated
    const tokenInfoAccount = await program.account.tokenInfo.fetch(tokenInfoPda);
    assert.equal(tokenInfoAccount.totalSupply.toNumber(), mintAmount.toNumber());
  });

  it("Burn Tokens", async () => {
    const burnAmount = new anchor.BN(10_000_000_000); // 10 tokens
    
    const tx = await program.methods
      .burnTokens(burnAmount)
      .accounts({
        authority: authority.publicKey,
        mint: mintKeypair.publicKey,
        tokenInfo: tokenInfoPda,
        from: authorityTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Burn tokens transaction signature", tx);

    // Verify token info account updated
    const tokenInfoAccount = await program.account.tokenInfo.fetch(tokenInfoPda);
    assert.equal(
      tokenInfoAccount.totalSupply.toNumber(), 
      90_000_000_000 // 100 - 10 tokens
    );
  });

  it("Cannot mint tokens with unauthorized account", async () => {
    const unauthorizedKeypair = Keypair.generate();
    const mintAmount = new anchor.BN(1_000_000_000);

    try {
      await program.methods
        .mintTokens(mintAmount)
        .accounts({
          authority: unauthorizedKeypair.publicKey,
          mint: mintKeypair.publicKey,
          tokenInfo: tokenInfoPda,
          destination: authorityTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([unauthorizedKeypair])
        .rpc();
      
      assert.fail("Expected transaction to fail");
    } catch (error) {
      assert.include(error.toString(), "UnauthorizedAccess");
    }
  });

  it("Transfer Authority", async () => {
    const newAuthorityKeypair = Keypair.generate();
    
    const tx = await program.methods
      .transferAuthority(newAuthorityKeypair.publicKey)
      .accounts({
        authority: authority.publicKey,
        mint: mintKeypair.publicKey,
        tokenInfo: tokenInfoPda,
      })
      .rpc();

    console.log("Transfer authority transaction signature", tx);

    // Verify authority changed
    const tokenInfoAccount = await program.account.tokenInfo.fetch(tokenInfoPda);
    assert.equal(
      tokenInfoAccount.authority.toString(), 
      newAuthorityKeypair.publicKey.toString()
    );
  });
});
