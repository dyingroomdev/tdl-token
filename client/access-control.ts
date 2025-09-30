import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { DollarToken } from "../target/types/dollar_token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import DollarTokenClient from "./interact";

class AccessControlManager {
  private client: DollarTokenClient;
  private program: Program<DollarToken>;
  private mint: PublicKey;

  constructor(client: DollarTokenClient, mint: PublicKey) {
    this.client = client;
    this.program = client["program"];
    this.mint = mint;
  }

  // ============= BLACKLIST FUNCTIONS =============

  async addToBlacklist(walletAddress: PublicKey, reason?: string): Promise<string> {
    console.log(`🚫 Adding ${walletAddress.toString()} to blacklist...`);

    const [tokenInfoPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_info"), this.mint.toBuffer()],
      this.program.programId
    );

    const [blacklistPda] = await PublicKey.findProgramAddress(
      [Buffer.from("blacklist"), this.mint.toBuffer(), walletAddress.toBuffer()],
      this.program.programId
    );

    const tx = await this.program.methods
      .addToBlacklist(walletAddress)
      .accounts({
        authority: this.client["payer"].publicKey,
        mint: this.mint,
        tokenInfo: tokenInfoPda,
        blacklist: blacklistPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`✅ Wallet blacklisted. Transaction: ${tx}`);
    return tx;
  }

  async removeFromBlacklist(walletAddress: PublicKey): Promise<string> {
    console.log(`✅ Removing ${walletAddress.toString()} from blacklist...`);

    const [tokenInfoPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_info"), this.mint.toBuffer()],
      this.program.programId
    );

    const [blacklistPda] = await PublicKey.findProgramAddress(
      [Buffer.from("blacklist"), this.mint.toBuffer(), walletAddress.toBuffer()],
      this.program.programId
    );

    const tx = await this.program.methods
      .removeFromBlacklist(walletAddress)
      .accounts({
        authority: this.client["payer"].publicKey,
        mint: this.mint,
        tokenInfo: tokenInfoPda,
        blacklist: blacklistPda,
      })
      .rpc();

    console.log(`✅ Wallet removed from blacklist. Transaction: ${tx}`);
    return tx;
  }

  async isBlacklisted(walletAddress: PublicKey): Promise<boolean> {
    try {
      const [blacklistPda] = await PublicKey.findProgramAddress(
        [Buffer.from("blacklist"), this.mint.toBuffer(), walletAddress.toBuffer()],
        this.program.programId
      );

      const blacklistAccount = await this.program.account.blacklistEntry.fetch(blacklistPda);
      return blacklistAccount.isBlacklisted;
    } catch {
      return false; // Not blacklisted if account doesn't exist
    }
  }

  async toggleBlacklistSystem(enabled: boolean): Promise<string> {
    console.log(`⚙️ ${enabled ? 'Enabling' : 'Disabling'} blacklist system...`);

    const [tokenInfoPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_info"), this.mint.toBuffer()],
      this.program.programId
    );

    const tx = await this.program.methods
      .toggleBlacklistSystem(enabled)
      .accounts({
        authority: this.client["payer"].publicKey,
        mint: this.mint,
        tokenInfo: tokenInfoPda,
      })
      .rpc();

    console.log(`✅ Blacklist system ${enabled ? 'enabled' : 'disabled'}. Transaction: ${tx}`);
    return tx;
  }

  async batchBlacklist(wallets: PublicKey[]): Promise<string[]> {
    console.log(`🚫 Batch blacklisting ${wallets.length} wallets...`);
    const transactions: string[] = [];

    for (const wallet of wallets) {
      try {
        const tx = await this.addToBlacklist(wallet);
        transactions.push(tx);
        console.log(`  ✅ Blacklisted: ${wallet.toString()}`);
      } catch (error) {
        console.error(`  ❌ Failed to blacklist ${wallet.toString()}:`, error);
      }
    }

    console.log(`✅ Batch blacklist completed: ${transactions.length}/${wallets.length} successful`);
    return transactions;
  }

  // ============= WHITELIST FUNCTIONS =============

  async addToWhitelist(
    walletAddress: PublicKey,
    allocation: number,
    decimals: number = 9
  ): Promise<string> {
    console.log(`✅ Adding ${walletAddress.toString()} to whitelist with allocation ${allocation}...`);

    const [tokenInfoPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_info"), this.mint.toBuffer()],
      this.program.programId
    );

    const [whitelistPda] = await PublicKey.findProgramAddress(
      [Buffer.from("whitelist"), this.mint.toBuffer(), walletAddress.toBuffer()],
      this.program.programId
    );

    const allocationBN = new BN(allocation * Math.pow(10, decimals));

    const tx = await this.program.methods
      .addToWhitelist(walletAddress, allocationBN)
      .accounts({
        authority: this.client["payer"].publicKey,
        mint: this.mint,
        tokenInfo: tokenInfoPda,
        whitelist: whitelistPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`✅ Wallet whitelisted. Transaction: ${tx}`);
    return tx;
  }

  async removeFromWhitelist(walletAddress: PublicKey): Promise<string> {
    console.log(`❌ Removing ${walletAddress.toString()} from whitelist...`);

    const [tokenInfoPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_info"), this.mint.toBuffer()],
      this.program.programId
    );

    const [whitelistPda] = await PublicKey.findProgramAddress(
      [Buffer.from("whitelist"), this.mint.toBuffer(), walletAddress.toBuffer()],
      this.program.programId
    );

    const tx = await this.program.methods
      .removeFromWhitelist(walletAddress)
      .accounts({
        authority: this.client["payer"].publicKey,
        mint: this.mint,
        tokenInfo: tokenInfoPda,
        whitelist: whitelistPda,
      })
      .rpc();

    console.log(`✅ Wallet removed from whitelist. Transaction: ${tx}`);
    return tx;
  }

  async isWhitelisted(walletAddress: PublicKey): Promise<{
    isWhitelisted: boolean;
    allocation?: number;
    purchased?: number;
  }> {
    try {
      const [whitelistPda] = await PublicKey.findProgramAddress(
        [Buffer.from("whitelist"), this.mint.toBuffer(), walletAddress.toBuffer()],
        this.program.programId
      );

      const whitelistAccount = await this.program.account.whitelistEntry.fetch(whitelistPda);
      return {
        isWhitelisted: whitelistAccount.isWhitelisted,
        allocation: whitelistAccount.allocation.toNumber(),
        purchased: whitelistAccount.purchased.toNumber(),
      };
    } catch {
      return { isWhitelisted: false };
    }
  }

  async toggleWhitelistMode(enabled: boolean): Promise<string> {
    console.log(`⚙️ ${enabled ? 'Enabling' : 'Disabling'} whitelist mode...`);

    const [tokenInfoPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_info"), this.mint.toBuffer()],
      this.program.programId
    );

    const tx = await this.program.methods
      .toggleWhitelistMode(enabled)
      .accounts({
        authority: this.client["payer"].publicKey,
        mint: this.mint,
        tokenInfo: tokenInfoPda,
      })
      .rpc();

    console.log(`✅ Whitelist mode ${enabled ? 'enabled' : 'disabled'}. Transaction: ${tx}`);
    return tx;
  }

  async batchWhitelist(
    wallets: Array<{ address: PublicKey; allocation: number }>
  ): Promise<string[]> {
    console.log(`✅ Batch whitelisting ${wallets.length} wallets...`);
    const transactions: string[] = [];

    for (const wallet of wallets) {
      try {
        const tx = await this.addToWhitelist(wallet.address, wallet.allocation);
        transactions.push(tx);
        console.log(`  ✅ Whitelisted: ${wallet.address.toString()} - ${wallet.allocation} tokens`);
      } catch (error) {
        console.error(`  ❌ Failed to whitelist ${wallet.address.toString()}:`, error);
      }
    }

    console.log(`✅ Batch whitelist completed: ${transactions.length}/${wallets.length} successful`);
    return transactions;
  }

  // ============= TRADING CONTROL =============

  async toggleTrading(enabled: boolean): Promise<string> {
    console.log(`⚙️ ${enabled ? 'Enabling' : 'Disabling'} trading...`);

    const [tokenInfoPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_info"), this.mint.toBuffer()],
      this.program.programId
    );

    const tx = await this.program.methods
      .toggleTrading(enabled)
      .accounts({
        authority: this.client["payer"].publicKey,
        mint: this.mint,
        tokenInfo: tokenInfoPda,
      })
      .rpc();

    console.log(`✅ Trading ${enabled ? 'enabled' : 'disabled'}. Transaction: ${tx}`);
    return tx;
  }

  // ============= UTILITY FUNCTIONS =============

  async getAccessControlStatus(): Promise<{
    tradingEnabled: boolean;
    whitelistEnabled: boolean;
    blacklistEnabled: boolean;
  }> {
    const [tokenInfoPda] = await PublicKey.findProgramAddress(
      [Buffer.from("token_info"), this.mint.toBuffer()],
      this.program.programId
    );

    const tokenInfo = await this.program.account.tokenInfo.fetch(tokenInfoPda);

    return {
      tradingEnabled: tokenInfo.tradingEnabled,
      whitelistEnabled: tokenInfo.whitelistEnabled,
      blacklistEnabled: tokenInfo.blacklistEnabled,
    };
  }

  async displayAccessControlStatus(): Promise<void> {
    const status = await this.getAccessControlStatus();

    console.log("\n📊 Access Control Status:");
    console.log("=========================");
    console.log(`Trading: ${status.tradingEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`Whitelist Mode: ${status.whitelistEnabled ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    console.log(`Blacklist System: ${status.blacklistEnabled ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    console.log("=========================\n");
  }

  // ============= ANTI-BOT PROTECTION =============

  async setupAntiBotProtection(): Promise<void> {
    console.log("🛡️ Setting up Anti-Bot Protection...");

    // Enable blacklist system
    await this.toggleBlacklistSystem(true);

    // Disable trading initially (enable after launch)
    await this.toggleTrading(false);

    // Enable whitelist mode for presale
    await this.toggleWhitelistMode(true);

    console.log("✅ Anti-bot protection configured!");
    console.log("   - Blacklist: ENABLED");
    console.log("   - Trading: DISABLED (enable after presale)");
    console.log("   - Whitelist Mode: ENABLED");
  }

  async enablePublicTrading(): Promise<void> {
    console.log("🚀 Enabling Public Trading...");

    // Disable whitelist mode
    await this.toggleWhitelistMode(false);

    // Enable trading
    await this.toggleTrading(true);

    // Keep blacklist enabled for protection
    await this.toggleBlacklistSystem(true);

    console.log("✅ Public trading enabled!");
    console.log("   - Whitelist Mode: DISABLED");
    console.log("   - Trading: ENABLED");
    console.log("   - Blacklist: ENABLED (for protection)");
  }
}

// Example usage and testing
async function demonstrateAccessControl() {
  try {
    console.log("🚀 Starting Access Control Demonstration...\n");

    // Initialize client
    const client = new DollarTokenClient();
    const addresses = JSON.parse(require("fs").readFileSync("client/addresses.json", "utf8"));
    const mint = new PublicKey(addresses.mint);

    const accessControl = new AccessControlManager(client, mint);

    // Display current status
    await accessControl.displayAccessControlStatus();

    // Example 1: Setup Anti-Bot Protection for Launch
    console.log("\n📍 Example 1: Setup Anti-Bot Protection");
    await accessControl.setupAntiBotProtection();

    // Example 2: Whitelist presale participants
    console.log("\n📍 Example 2: Whitelist Presale Participants");
    const presaleWallets = [
      { address: Keypair.generate().publicKey, allocation: 10000 },
      { address: Keypair.generate().publicKey, allocation: 5000 },
      { address: Keypair.generate().publicKey, allocation: 15000 },
    ];
    await accessControl.batchWhitelist(presaleWallets);

    // Example 3: Check whitelist status
    console.log("\n📍 Example 3: Check Whitelist Status");
    for (const wallet of presaleWallets) {
      const status = await accessControl.isWhitelisted(wallet.address);
      console.log(`  ${wallet.address.toString().slice(0, 8)}... - Whitelisted: ${status.isWhitelisted}`);
    }

    // Example 4: Blacklist suspicious wallets
    console.log("\n📍 Example 4: Blacklist Suspicious Wallets");
    const suspiciousWallets = [
      Keypair.generate().publicKey,
      Keypair.generate().publicKey,
    ];
    await accessControl.batchBlacklist(suspiciousWallets);

    // Example 5: Check blacklist status
    console.log("\n📍 Example 5: Check Blacklist Status");
    for (const wallet of suspiciousWallets) {
      const isBlacklisted = await accessControl.isBlacklisted(wallet);
      console.log(`  ${wallet.toString().slice(0, 8)}... - Blacklisted: ${isBlacklisted}`);
    }

    // Example 6: Enable Public Trading After Presale
    console.log("\n📍 Example 6: Enable Public Trading");
    await accessControl.enablePublicTrading();

    // Final status
    await accessControl.displayAccessControlStatus();

    console.log("\n✅ Access Control demonstration completed!");

  } catch (error) {
    console.error("❌ Error in demonstration:", error);
  }
}

export { AccessControlManager, demonstrateAccessControl };

// Run demonstration if called directly
if (require.main === module) {
  demonstrateAccessControl();
}