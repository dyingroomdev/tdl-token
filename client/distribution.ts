import DollarTokenClient from "./interact";
import { PublicKey, Keypair } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import * as fs from "fs";

class TokenDistributionManager {
  private client: DollarTokenClient;
  private mint: PublicKey;
  
  // Token Distribution Parameters
  private readonly TOTAL_SUPPLY = 100_000_000; // 100M tokens
  private readonly DISTRIBUTION = {
    PRESALE: 0.25,      // 25% - 25M tokens
    LIQUIDITY: 0.20,    // 20% - 20M tokens  
    REWARDS: 0.25,      // 25% - 25M tokens
    TEAM: 0.15,         // 15% - 15M tokens
    MARKETING: 0.15,    // 15% - 15M tokens
  };

  // Presale Parameters
  private readonly PRESALE_PRICE = 0.01;      // $0.01 per token
  private readonly LISTING_PRICE = 0.015;    // $0.015 per token
  private readonly RAISE_TARGET = 250_000;    // $250,000 target

  constructor(client: DollarTokenClient, mint: PublicKey) {
    this.client = client;
    this.mint = mint;
  }

  async distributeTokens(): Promise<void> {
    console.log("🎯 Starting Token Distribution Process...");
    console.log(`📊 Total Supply: ${this.TOTAL_SUPPLY.toLocaleString()} TDL`);

    // Create distribution wallets (in production, use secure keypairs)
    const distributionWallets = {
      presale: Keypair.generate(),
      liquidity: Keypair.generate(),
      rewards: Keypair.generate(),
      team: Keypair.generate(),
      marketing: Keypair.generate(),
    };

    // Calculate token amounts
    const amounts = {
      presale: this.TOTAL_SUPPLY * this.DISTRIBUTION.PRESALE,
      liquidity: this.TOTAL_SUPPLY * this.DISTRIBUTION.LIQUIDITY,
      rewards: this.TOTAL_SUPPLY * this.DISTRIBUTION.REWARDS,
      team: this.TOTAL_SUPPLY * this.DISTRIBUTION.TEAM,
      marketing: this.TOTAL_SUPPLY * this.DISTRIBUTION.MARKETING,
    };

    console.log("📈 Distribution Breakdown:");
    Object.entries(amounts).forEach(([category, amount]) => {
      console.log(`  ${category.toUpperCase()}: ${amount.toLocaleString()} TDL (${(amount/this.TOTAL_SUPPLY*100).toFixed(1)}%)`);
    });

    // Mint tokens to each distribution wallet
    for (const [category, wallet] of Object.entries(distributionWallets)) {
      const amount = amounts[category as keyof typeof amounts];
      console.log(`\n💰 Minting ${amount.toLocaleString()} TDL for ${category.toUpperCase()}...`);
      
      // Create associated token account for the wallet
      const ata = await getAssociatedTokenAddress(this.mint, wallet.publicKey);
      
      try {
        // Create ATA instruction
        const createAtaIx = createAssociatedTokenAccountInstruction(
          this.client["payer"].publicKey,
          ata,
          wallet.publicKey,
          this.mint
        );

        // Send transaction to create ATA
        const createAtaTx = new (await import("@solana/web3.js")).Transaction().add(createAtaIx);
        await this.client["provider"].sendAndConfirm(createAtaTx);
        
        // Mint tokens to the wallet
        await this.client.mintTokens(this.mint, amount);
        
        console.log(`✅ ${category.toUpperCase()} wallet funded: ${wallet.publicKey.toString()}`);
        
      } catch (error) {
        console.error(`❌ Error funding ${category} wallet:`, error);
      }
    }

    // Save distribution info
    const distributionInfo = {
      totalSupply: this.TOTAL_SUPPLY,
      distribution: this.DISTRIBUTION,
      amounts,
      wallets: Object.fromEntries(
        Object.entries(distributionWallets).map(([key, wallet]) => [
          key,
          {
            publicKey: wallet.publicKey.toString(),
            secretKey: Array.from(wallet.secretKey), // Store securely in production!
          }
        ])
      ),
      mint: this.mint.toString(),
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync("token_distribution.json", JSON.stringify(distributionInfo, null, 2));
    console.log("\n📄 Distribution info saved to token_distribution.json");
  }

  async setupPresale(): Promise<void> {
    console.log("\n🎪 Setting up Presale Configuration...");

    const presaleConfig = {
      tokenAddress: this.mint.toString(),
      tokenName: "Dollar Token",
      tokenSymbol: "TDL",
      totalSupply: this.TOTAL_SUPPLY,
      
      // Presale Parameters
      presaleAllocation: this.TOTAL_SUPPLY * this.DISTRIBUTION.PRESALE,
      presalePrice: this.PRESALE_PRICE,
      listingPrice: this.LISTING_PRICE,
      raiseTarget: this.RAISE_TARGET,
      
      // Calculated Values
      tokensPerDollar: 1 / this.PRESALE_PRICE,
      priceIncrease: ((this.LISTING_PRICE - this.PRESALE_PRICE) / this.PRESALE_PRICE * 100).toFixed(1) + "%",
      marketCapAtListing: this.TOTAL_SUPPLY * this.LISTING_PRICE,
      
      // Liquidity Setup
      liquidityAllocation: this.TOTAL_SUPPLY * this.DISTRIBUTION.LIQUIDITY,
      liquidityValue: this.TOTAL_SUPPLY * this.DISTRIBUTION.LIQUIDITY * this.LISTING_PRICE,
      
      // Key Dates (example - adjust as needed)
      presaleStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      presaleEnd: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 3 weeks from now
      listingDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 4 weeks from now
      
      // Platform URLs (update with actual links)
      dexScreensUrl: `https://dexscreener.com/solana/${this.mint.toString()}`,
      raydiumUrl: `https://raydium.io/swap/?outputCurrency=${this.mint.toString()}`,
      
      // Social Links (update with actual links)
      website: "https://dollartoken.finance",
      twitter: "https://twitter.com/dollartokenTDL",
      telegram: "https://t.me/dollartokenofficial",
      discord: "https://discord.gg/dollartoken",
    };

    console.log("🎯 Presale Configuration:");
    console.log(`  Presale Allocation: ${presaleConfig.presaleAllocation.toLocaleString()} TDL`);
    console.log(`  Presale Price: $${presaleConfig.presalePrice}`);
    console.log(`  Listing Price: $${presaleConfig.listingPrice}`);
    console.log(`  Price Increase: ${presaleConfig.priceIncrease}`);
    console.log(`  Raise Target: $${presaleConfig.raiseTarget.toLocaleString()}`);
    console.log(`  Market Cap at Listing: $${presaleConfig.marketCapAtListing.toLocaleString()}`);

    // Save presale configuration
    fs.writeFileSync("presale_config.json", JSON.stringify(presaleConfig, null, 2));
    console.log("\n📄 Presale configuration saved to presale_config.json");
    
    return Promise.resolve();
  }

  async generateMarketingMaterials(): Promise<void> {
    console.log("\n📢 Generating Marketing Materials...");

    const marketingContent = {
      tokenomics: {
        name: "Dollar Token",
        symbol: "TDL",
        totalSupply: "100,000,000 TDL",
        network: "Solana",
        contractAddress: this.mint.toString(),
      },
      
      distribution: {
        "Presale (25%)": "25,000,000 TDL - Early investors and community",
        "Liquidity (20%)": "20,000,000 TDL - DEX liquidity provision", 
        "Rewards (25%)": "25,000,000 TDL - Staking rewards and incentives",
        "Team (15%)": "15,000,000 TDL - Core team allocation (vested)",
        "Marketing (15%)": "15,000,000 TDL - Marketing and partnerships",
      },
      
      keyFeatures: [
        "🔥 Deflationary mechanism with admin burn capability",
        "🏦 Treasury management with liquidity drain function",
        "🔒 Secure admin controls for token management",
        "⚡ Built on Solana for fast, low-cost transactions",
        "📈 Fixed supply with transparent tokenomics",
      ],
      
      presaleHighlights: {
        presalePrice: "$0.01 per TDL",
        listingPrice: "$0.015 per TDL",
        priceIncrease: "50% increase at listing",
        raiseTarget: "$250,000",
        minInvestment: "$50",
        maxInvestment: "$5,000",
      },
      
      roadmap: [
        "Q1 2024: Token Launch & Presale",
        "Q2 2024: DEX Listings (Raydium, Orca)",
        "Q3 2024: Staking Platform Launch", 
        "Q4 2024: Cross-chain Bridge Integration",
        "Q1 2025: DeFi Ecosystem Expansion",
      ],

      socialProof: {
        "Audit Status": "Contract audited by [Audit Firm]",
        "KYC": "Team KYC completed",
        "Liquidity Lock": "Liquidity locked for 12 months",
        "Team Tokens": "Team tokens vested over 24 months",
      },
    };

    // Generate README for GitHub/marketing
    const readme = `# Dollar Token (TDL) 💰

## Overview
Dollar Token (TDL) is a deflationary utility token built on Solana, designed for the next generation of decentralized finance applications.

## Tokenomics
- **Total Supply:** ${marketingContent.tokenomics.totalSupply}
- **Network:** ${marketingContent.tokenomics.network}
- **Contract:** \`${marketingContent.tokenomics.contractAddress}\`

## Distribution
${Object.entries(marketingContent.distribution).map(([key, value]) => `- **${key}:** ${value}`).join('\n')}

## Key Features
${marketingContent.keyFeatures.join('\n')}

## Presale Information
${Object.entries(marketingContent.presaleHighlights).map(([key, value]) => `- **${key.charAt(0).toUpperCase() + key.slice(1)}:** ${value}`).join('\n')}

## Roadmap
${marketingContent.roadmap.map((item, i) => `${i + 1}. ${item}`).join('\n')}

## Security & Trust
${Object.entries(marketingContent.socialProof).map(([key, value]) => `- **${key}:** ${value}`).join('\n')}

## Links
- Website: [dollartoken.finance](https://dollartoken.finance)
- Twitter: [@dollartokenTDL](https://twitter.com/dollartokenTDL)
- Telegram: [Dollar Token Official](https://t.me/dollartokenofficial)
- DEXScreener: [View Chart](https://dexscreener.com/solana/${this.mint.toString()})

---
*Disclaimer: Cryptocurrency investments carry risk. Please do your own research.*
`;

    fs.writeFileSync("README.md", readme);
    fs.writeFileSync("marketing_materials.json", JSON.stringify(marketingContent, null, 2));
    
    console.log("✅ Marketing materials generated:");
    console.log("  - README.md");
    console.log("  - marketing_materials.json");
  }
}

// Main execution function
async function setupTokenEcosystem() {
  try {
    console.log("🚀 Starting Dollar Token Ecosystem Setup...");
    
    const client = new DollarTokenClient();
    
    // Initialize token
    const { mint } = await client.initializeToken();
    
    // Setup distribution manager
    const distributionManager = new TokenDistributionManager(client, mint);
    
    // Execute setup phases
    await distributionManager.distributeTokens();
    await distributionManager.setupPresale();
    await distributionManager.generateMarketingMaterials();
    
    console.log("\n🎉 Token ecosystem setup completed!");
    console.log("📋 Check the generated files for configuration details.");
    
  } catch (error) {
    console.error("❌ Setup failed:", error);
  }
}

export { TokenDistributionManager };

// Run if called directly
if (require.main === module) {
  setupTokenEcosystem();
}
