import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import { DollarToken } from "../target/types/dollar_token";
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import fs from "fs";
import path from "path";

// Configuration
const NETWORK = "devnet"; // Change to "mainnet-beta" for production
const PROGRAM_ID = new PublicKey("11111111111111111111111111111111"); // Update after deployment

class DollarTokenClient {
  private connection: Connection;
  private provider: AnchorProvider;
  private program: Program<DollarToken>;
  private payer: Keypair;

  constructor(payerKeypair?: Keypair) {
    this.connection = new Connection(clusterApiUrl(NETWORK as any), "confirmed");
    this.payer = payerKeypair || this.loadWallet();
    
    const wallet = new anchor.Wallet(this.payer);
    this.provider = new AnchorProvider(this.connection, wallet, {
      commitment: "confirmed",
    });
    
    this.program = new Program(
      JSON.parse(fs.readFileSync(path.join(__dirname, "../target/idl/dollar_token.json"), "utf8")),
      PROGRAM_ID,
      this.provider
    );
  }

  private loadWallet(): Keypair {
    const walletPath = path.join(process.env.HOME!, ".config/solana/id.json");
    if (fs.existsSync(walletPath)) {
      const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf8"));
      return Keypair.fromSecretKey(new Uint8Array(secretKey));
    }
    // Generate new keypair if no wallet exists
    const newKeypair = Keypair.generate();
    console.log("Generated new keypair. Public key:", newKeypair.publicKey.toString());
    return newKeypair;
  }

  async requestAirdrop(publicKey: PublicKey, lamports: number = LAMPORTS_PER_SOL) {
    console.log("Requesting airdrop...");
    const signature = await this.connection.requestAirdrop(publicKey, lamports);
    await this.connection.confirmTransaction(signature);
    console.log("Airdrop successful");
  }

  async initializeToken(
    name: string = "Dollar Token",
    symbol: string = "TDL",
    uri: string = "https://raw.githubusercontent.com/example/metadata.json",
    decimals: number = 9
  ): Promise<{ mint: PublicKey; tokenInfo: PublicKey }> {
    console.log("Initializing Dollar Token...");

    const mintKeypair = Keypair.generate();
    
    // Derive PDA for token info
    const [tokenInfoPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_info"), mintKeypair.publicKey.toBuffer()],
      this.program.programId
    );

    const tx = await this.program.methods
      .initializeToken(name, symbol, uri, decimals)
      .accounts({
        authority: this.payer.publicKey,
        mint: mintKeypair.publicKey,
        tokenInfo: tokenInfoPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    console.log("Initialize token transaction:", tx);
    console.log("Mint address:", mintKeypair.publicKey.toString());
    console.log("Token info PDA:", tokenInfoPda.toString());

    return { mint: mintKeypair.publicKey, tokenInfo: tokenInfoPda };
  }

  async mintTokens(
    mint: PublicKey,
    amount: number,
    decimals: number = 9
  ): Promise<string> {
    console.log(`Minting ${amount} tokens...`);

    const [tokenInfoPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_info"), mint.toBuffer()],
      this.program.programId
    );

    const destinationAta = await getAssociatedTokenAddress(
      mint,
      this.payer.publicKey
    );

    // Create ATA if it doesn't exist
    try {
      await getAccount(this.connection, destinationAta);
    } catch {
      console.log("Creating associated token account...");
      const createAtaIx = createAssociatedTokenAccountInstruction(
        this.payer.publicKey,
        destinationAta,
        this.payer.publicKey,
        mint
      );
      const createAtaTx = new web3.Transaction().add(createAtaIx);
      await this.provider.sendAndConfirm(createAtaTx);
    }

    const mintAmount = new BN(amount * Math.pow(10, decimals));

    const tx = await this.program.methods
      .mintTokens(mintAmount)
      .accounts({
        authority: this.payer.publicKey,
        mint: mint,
        tokenInfo: tokenInfoPda,
        destination: destinationAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Mint tokens transaction:", tx);
    return tx;
  }

  async burnTokens(
    mint: PublicKey,
    amount: number,
    decimals: number = 9
  ): Promise<string> {
    console.log(`Burning ${amount} tokens...`);

    const [tokenInfoPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_info"), mint.toBuffer()],
      this.program.programId
    );

    const fromAta = await getAssociatedTokenAddress(
      mint,
      this.payer.publicKey
    );

    const burnAmount = new BN(amount * Math.pow(10, decimals));

    const tx = await this.program.methods
      .burnTokens(burnAmount)
      .accounts({
        authority: this.payer.publicKey,
        mint: mint,
        tokenInfo: tokenInfoPda,
        from: fromAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Burn tokens transaction:", tx);
    return tx;
  }

  async drainLiquidity(
    mint: PublicKey,
    liquidityPoolAddress: PublicKey,
    amount: number,
    decimals: number = 9
  ): Promise<string> {
    console.log(`Draining ${amount} tokens from liquidity pool...`);

    const [tokenInfoPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_info"), mint.toBuffer()],
      this.program.programId
    );

    const treasuryAta = await getAssociatedTokenAddress(
      mint,
      this.payer.publicKey
    );

    const drainAmount = new BN(amount * Math.pow(10, decimals));

    const tx = await this.program.methods
      .drainLiquidity(drainAmount)
      .accounts({
        authority: this.payer.publicKey,
        mint: mint,
        tokenInfo: tokenInfoPda,
        liquidityPool: liquidityPoolAddress,
        treasury: treasuryAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Drain liquidity transaction:", tx);
    return tx;
  }

  async getTokenInfo(mint: PublicKey) {
    const [tokenInfoPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_info"), mint.toBuffer()],
      this.program.programId
    );

    const tokenInfo = await this.program.account.tokenInfo.fetch(tokenInfoPda);
    return {
      authority: tokenInfo.authority,
      mint: tokenInfo.mint,
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      uri: tokenInfo.uri,
      decimals: tokenInfo.decimals,
      totalSupply: tokenInfo.totalSupply,
      isInitialized: tokenInfo.isInitialized,
    };
  }

  async getBalance(mint: PublicKey, owner?: PublicKey): Promise<number> {
    const ownerKey = owner || this.payer.publicKey;
    const ata = await getAssociatedTokenAddress(mint, ownerKey);
    
    try {
      const tokenAccount = await getAccount(this.connection, ata);
      return Number(tokenAccount.amount) / Math.pow(10, 9);
    } catch {
      return 0;
    }
  }
}

// Example usage
async function main() {
  const client = new DollarTokenClient();

  try {
    // Check balance and request airdrop if needed
    const balance = await client.connection.getBalance(client["payer"].publicKey);
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
      await client.requestAirdrop(client["payer"].publicKey);
    }

    // 1. Initialize Token
    console.log("🚀 Initializing Dollar Token...");
    const { mint, tokenInfo } = await client.initializeToken();

    // 2. Mint initial supply (100M tokens for presale/liquidity/rewards/team/marketing)
    console.log("💰 Minting initial supply...");
    await client.mintTokens(mint, 100_000_000); // 100M tokens

    // 3. Get token info
    console.log("📊 Fetching token info...");
    const info = await client.getTokenInfo(mint);
    console.log("Token Info:", {
      name: info.name,
      symbol: info.symbol,
      totalSupply: info.totalSupply.toNumber() / Math.pow(10, 9),
      authority: info.authority.toString(),
    });

    // 4. Check balance
    const balance_tokens = await client.getBalance(mint);
    console.log(`💼 Your token balance: ${balance_tokens} TDL`);

    // 5. Burn some tokens (example)
    console.log("🔥 Burning 1M tokens...");
    await client.burnTokens(mint, 1_000_000);

    // 6. Check balance after burn
    const newBalance = await client.getBalance(mint);
    console.log(`💼 Your token balance after burn: ${newBalance} TDL`);

    // Save important addresses for deployment
    const addresses = {
      mint: mint.toString(),
      tokenInfo: tokenInfo.toString(),
      authority: client["payer"].publicKey.toString(),
      programId: client.program.programId.toString(),
    };

    fs.writeFileSync(
      path.join(__dirname, "addresses.json"),
      JSON.stringify(addresses, null, 2)
    );

    console.log("✅ All operations completed successfully!");
    console.log("📋 Important addresses saved to client/addresses.json");

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default DollarTokenClient;
