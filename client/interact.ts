import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
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
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

const IDL = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../target/idl/dollar_token.json"), "utf8")
);

const NETWORK = "devnet";
const PROGRAM_ID = new PublicKey("FtAWkh8vpT1DvULYhhtYZhYNuobPmeizR5kbmD4jMy48");

class DollarTokenClient {
  connection: Connection;
  provider: AnchorProvider;
  program: Program;
  payer: Keypair;

  constructor(payerKeypair?: Keypair) {
    this.connection = new Connection(clusterApiUrl(NETWORK), "confirmed");
    this.payer = payerKeypair || this.loadWallet();
    
    const wallet = new Wallet(this.payer);
    this.provider = new AnchorProvider(this.connection, wallet, {
      commitment: "confirmed",
    });
    
    this.program = new Program(IDL, this.provider);
  }

  private loadWallet(): Keypair {
    const walletPath = path.join(process.env.HOME!, ".config/solana/id.json");
    if (fs.existsSync(walletPath)) {
      const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf8"));
      return Keypair.fromSecretKey(new Uint8Array(secretKey));
    }
    const newKeypair = Keypair.generate();
    console.log("Generated new keypair:", newKeypair.publicKey.toString());
    return newKeypair;
  }

  async requestAirdrop(publicKey: PublicKey, lamports: number = 2 * LAMPORTS_PER_SOL) {
    console.log("Requesting airdrop...");
    const signature = await this.connection.requestAirdrop(publicKey, lamports);
    await this.connection.confirmTransaction(signature);
    console.log("Airdrop successful");
  }

  async initializeToken(
    name: string = "Dollar Token",
    symbol: string = "TDL",
    uri: string = "https://arweave.net/token-metadata",
    decimals: number = 9
  ): Promise<{ mint: PublicKey; tokenInfo: PublicKey }> {
    console.log("Initializing Dollar Token...");

    const mintKeypair = Keypair.generate();
    
    const [tokenInfoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_info"), mintKeypair.publicKey.toBuffer()],
      this.program.programId
    );

    try {
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

      console.log("Token initialized!");
      console.log("   Transaction:", tx);
      console.log("   Mint:", mintKeypair.publicKey.toString());

      return { mint: mintKeypair.publicKey, tokenInfo: tokenInfoPda };
    } catch (error: any) {
      console.error("Error initializing token:", error);
      if (error.logs) console.error("Logs:", error.logs);
      throw error;
    }
  }

  async mintTokens(
    mint: PublicKey,
    amount: number,
    decimals: number = 9
  ): Promise<string> {
    console.log(`Minting ${amount.toLocaleString()} tokens...`);

    const [tokenInfoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_info"), mint.toBuffer()],
      this.program.programId
    );

    const destinationAta = getAssociatedTokenAddressSync(
      mint,
      this.payer.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const accountInfo = await this.connection.getAccountInfo(destinationAta);
    if (!accountInfo) {
      console.log("Creating associated token account...");
      const createAtaIx = createAssociatedTokenAccountInstruction(
        this.payer.publicKey,
        destinationAta,
        this.payer.publicKey,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      const tx = new anchor.web3.Transaction().add(createAtaIx);
      await this.provider.sendAndConfirm(tx);
    }

    // CRITICAL FIX: Use BN string constructor and multiplication
    const amountBN = new BN(amount.toString());
    const decimalsBN = new BN(10).pow(new BN(decimals));
    const mintAmount = amountBN.mul(decimalsBN);

    try {
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

      console.log("Tokens minted!");
      console.log("   Transaction:", tx);
      return tx;
    } catch (error: any) {
      console.error("Error minting tokens:", error);
      if (error.logs) console.error("Logs:", error.logs);
      throw error;
    }
  }
}

async function main() {
  console.log("Dollar Token (TDL) Initialization\n");
  
  const client = new DollarTokenClient();

  try {
    const balance = await client.connection.getBalance(client.payer.publicKey);
    console.log(`Current SOL balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
      console.log("Requesting airdrop...");
      await client.requestAirdrop(client.payer.publicKey);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("\nStep 1: Initializing token...");
    const { mint, tokenInfo } = await client.initializeToken();

    console.log("\nStep 2: Minting initial supply (100M TDL)...");
    await client.mintTokens(mint, 100_000_000);

    const addresses = {
      programId: PROGRAM_ID.toString(),
      mint: mint.toString(),
      tokenInfo: tokenInfo.toString(),
      authority: client.payer.publicKey.toString(),
      network: NETWORK,
      deploymentDate: new Date().toISOString(),
      explorerUrls: {
        program: `https://explorer.solana.com/address/${PROGRAM_ID.toString()}?cluster=devnet`,
        mint: `https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`,
      }
    };

    fs.writeFileSync(
      path.join(__dirname, "addresses.json"),
      JSON.stringify(addresses, null, 2)
    );

    console.log("\nSUCCESS! Dollar Token deployed!");
    console.log("\nImportant Addresses:");
    console.log(`   Mint: ${mint.toString()}`);
    console.log(`   Authority: ${client.payer.publicKey.toString()}`);
    console.log("\nView on Explorer:");
    console.log(`   ${addresses.explorerUrls.mint}`);
    console.log("\nAddresses saved to: client/addresses.json");

  } catch (error) {
    console.error("\nError:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export default DollarTokenClient;
