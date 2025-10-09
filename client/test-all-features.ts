import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

const IDL = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../target/idl/dollar_token.json"), "utf8")
);

const addresses = JSON.parse(
  fs.readFileSync(path.join(__dirname, "addresses.json"), "utf8")
);

const PROGRAM_ID = new PublicKey(addresses.programId);
const MINT = new PublicKey(addresses.mint);

function getAssociatedTokenAddressSync(mint: PublicKey, owner: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
}

class TokenTester {
  connection: Connection;
  provider: AnchorProvider;
  program: Program;
  authority: Keypair;
  tokenClient: Token;

  constructor() {
    this.connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    
    const walletPath = path.join(process.env.HOME!, ".config/solana/id.json");
    const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf8"));
    this.authority = Keypair.fromSecretKey(new Uint8Array(secretKey));
    
    const wallet = new Wallet(this.authority);
    this.provider = new AnchorProvider(this.connection, wallet, {
      commitment: "confirmed",
    });
    
    this.program = new Program(IDL, this.provider);
    this.tokenClient = new Token(
      this.connection,
      MINT,
      TOKEN_PROGRAM_ID,
      this.authority
    );
  }

  async getTokenBalance(owner: PublicKey): Promise<number> {
    try {
      const ata = getAssociatedTokenAddressSync(MINT, owner);
      const balance = await this.connection.getTokenAccountBalance(ata);
      return Number(balance.value.amount) / Math.pow(10, 9);
    } catch {
      return 0;
    }
  }

  async transferTokens(recipient: PublicKey, amount: number): Promise<void> {
    console.log(`\nTransferring ${amount} TDL to ${recipient.toString().slice(0, 8)}...`);

    const fromAta = getAssociatedTokenAddressSync(MINT, this.authority.publicKey);
    const toAta = getAssociatedTokenAddressSync(MINT, recipient);

    // Get or create recipient account
    try {
      await this.tokenClient.getOrCreateAssociatedAccountInfo(recipient);
    } catch (error) {
      console.log("Creating recipient account...");
    }

    // Transfer
    await this.tokenClient.transfer(
      fromAta,
      toAta,
      this.authority,
      [],
      amount * Math.pow(10, 9)
    );
    
    console.log(`Transfer successful`);
  }

  async burnTokens(amount: number): Promise<void> {
    console.log(`\nBurning ${amount} TDL...`);

    const [tokenInfoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_info"), MINT.toBuffer()],
      this.program.programId
    );

    const fromAta = getAssociatedTokenAddressSync(MINT, this.authority.publicKey);
    const burnAmount = new BN(amount * Math.pow(10, 9));

    const tx = await this.program.methods
      .burnTokens(burnAmount)
      .accounts({
        authority: this.authority.publicKey,
        mint: MINT,
        tokenInfo: tokenInfoPda,
        from: fromAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log(`Burn successful: ${tx.slice(0, 8)}...`);
  }

  async addToBlacklist(wallet: PublicKey): Promise<void> {
    console.log(`\nAdding ${wallet.toString().slice(0, 8)}... to blacklist`);

    const [tokenInfoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_info"), MINT.toBuffer()],
      this.program.programId
    );

    const [blacklistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), MINT.toBuffer(), wallet.toBuffer()],
      this.program.programId
    );

    const tx = await this.program.methods
      .addToBlacklist(wallet)
      .accounts({
        authority: this.authority.publicKey,
        mint: MINT,
        tokenInfo: tokenInfoPda,
        blacklist: blacklistPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`Blacklisted: ${tx.slice(0, 8)}...`);
  }

  async removeFromBlacklist(wallet: PublicKey): Promise<void> {
    console.log(`\nRemoving ${wallet.toString().slice(0, 8)}... from blacklist`);

    const [tokenInfoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_info"), MINT.toBuffer()],
      this.program.programId
    );

    const [blacklistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), MINT.toBuffer(), wallet.toBuffer()],
      this.program.programId
    );

    const tx = await this.program.methods
      .removeFromBlacklist(wallet)
      .accounts({
        authority: this.authority.publicKey,
        mint: MINT,
        tokenInfo: tokenInfoPda,
        blacklist: blacklistPda,
      })
      .rpc();

    console.log(`Removed: ${tx.slice(0, 8)}...`);
  }

  async addToWhitelist(wallet: PublicKey, allocation: number): Promise<void> {
    console.log(`\nAdding ${wallet.toString().slice(0, 8)}... to whitelist (${allocation} TDL)`);

    const [tokenInfoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_info"), MINT.toBuffer()],
      this.program.programId
    );

    const [whitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), MINT.toBuffer(), wallet.toBuffer()],
      this.program.programId
    );

    const allocationBN = new BN(allocation * Math.pow(10, 9));

    const tx = await this.program.methods
      .addToWhitelist(wallet, allocationBN)
      .accounts({
        authority: this.authority.publicKey,
        mint: MINT,
        tokenInfo: tokenInfoPda,
        whitelist: whitelistPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`Whitelisted: ${tx.slice(0, 8)}...`);
  }

  async toggleTrading(enabled: boolean): Promise<void> {
    console.log(`\n${enabled ? 'Enabling' : 'Disabling'} trading...`);

    const [tokenInfoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_info"), MINT.toBuffer()],
      this.program.programId
    );

    const tx = await this.program.methods
      .toggleTrading(enabled)
      .accounts({
        authority: this.authority.publicKey,
        mint: MINT,
        tokenInfo: tokenInfoPda,
      })
      .rpc();

    console.log(`Trading ${enabled ? 'enabled' : 'disabled'}: ${tx.slice(0, 8)}...`);
  }

  async toggleWhitelistMode(enabled: boolean): Promise<void> {
    console.log(`\n${enabled ? 'Enabling' : 'Disabling'} whitelist mode...`);

    const [tokenInfoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_info"), MINT.toBuffer()],
      this.program.programId
    );

    const tx = await this.program.methods
      .toggleWhitelistMode(enabled)
      .accounts({
        authority: this.authority.publicKey,
        mint: MINT,
        tokenInfo: tokenInfoPda,
      })
      .rpc();

    console.log(`Whitelist mode ${enabled ? 'enabled' : 'disabled'}: ${tx.slice(0, 8)}...`);
  }
}

async function runTests() {
  console.log("\nDollar Token Feature Testing\n");
  console.log("========================================\n");

  const tester = new TokenTester();

  const testWalletPath = path.join(process.env.HOME!, ".config/solana/test-wallet.json");
  let testWallet: Keypair;
  
  if (fs.existsSync(testWalletPath)) {
    const secretKey = JSON.parse(fs.readFileSync(testWalletPath, "utf8"));
    testWallet = Keypair.fromSecretKey(new Uint8Array(secretKey));
  } else {
    console.log("Creating test wallet...");
    testWallet = Keypair.generate();
    fs.writeFileSync(testWalletPath, JSON.stringify(Array.from(testWallet.secretKey)));
  }

  console.log(`Test wallet: ${testWallet.publicKey.toString()}\n`);

  try {
    console.log("--- Initial State ---");
    const initialBalance = await tester.getTokenBalance(tester.authority.publicKey);
    console.log(`Authority balance: ${initialBalance.toLocaleString()} TDL`);

    console.log("\n--- Test 1: Transfer Tokens ---");
    await tester.transferTokens(testWallet.publicKey, 1000);
    const testBalance1 = await tester.getTokenBalance(testWallet.publicKey);
    console.log(`Test wallet now has: ${testBalance1} TDL`);

    console.log("\n--- Test 2: Burn Tokens ---");
    await tester.burnTokens(500);

    console.log("\n--- Test 3: Blacklist Feature ---");
    await tester.addToBlacklist(testWallet.publicKey);
    await tester.removeFromBlacklist(testWallet.publicKey);

    console.log("\n--- Test 4: Whitelist Feature ---");
    await tester.addToWhitelist(testWallet.publicKey, 5000);

    console.log("\n--- Test 5: Whitelist Mode ---");
    await tester.toggleWhitelistMode(true);
    await tester.toggleWhitelistMode(false);

    console.log("\n--- Test 6: Trading Control ---");
    await tester.toggleTrading(false);
    await tester.toggleTrading(true);

    console.log("\n--- Final State ---");
    const finalBalance = await tester.getTokenBalance(tester.authority.publicKey);
    const testBalance2 = await tester.getTokenBalance(testWallet.publicKey);
    
    console.log(`Authority balance: ${finalBalance.toLocaleString()} TDL`);
    console.log(`Test wallet balance: ${testBalance2} TDL`);

    console.log("\n========================================");
    console.log("All Tests Passed Successfully!");
    console.log("========================================\n");

    console.log("View on Explorer:");
    console.log(`https://explorer.solana.com/address/${MINT.toString()}?cluster=devnet\n`);

  } catch (error: any) {
    console.error("\nTest failed:", error.message);
    if (error.logs) console.error("Logs:", error.logs);
    process.exit(1);
  }
}

runTests();
