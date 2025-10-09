import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';
import * as fs from 'fs';

const METADATA_URI = "https://raw.githubusercontent.com/dyingroomdev/tdl-token/refs/heads/master/metadata.json";

async function fixMetadata() {
  console.log("🔧 Starting metadata update...\n");
  
  // Load keypair
  const keypairFile = fs.readFileSync(
    `${process.env.HOME}/.config/solana/id.json`,
    'utf-8'
  );
  const keypairData = JSON.parse(keypairFile);
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log("✅ Keypair loaded");
  console.log("Wallet:", keypair.publicKey.toString());

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  console.log("✅ Connected to Solana devnet\n");
  
  // Initialize Metaplex
  const metaplex = Metaplex.make(connection).use(keypairIdentity(keypair));

  // Load addresses
  const addresses = JSON.parse(
    fs.readFileSync('addresses.json', 'utf-8')
  );
  const mintAddress = new PublicKey(addresses.mint);

  console.log("📍 Token Details:");
  console.log("   Mint:", mintAddress.toString());
  console.log("   Metadata URI:", METADATA_URI);
  console.log("");

  try {
    // Find existing metadata
    console.log("🔍 Looking for existing metadata...");
    const nft = await metaplex.nfts().findByMint({ mintAddress });
    
    console.log("✅ Found existing metadata");
    console.log("   Current name:", nft.name);
    console.log("   Current symbol:", nft.symbol);
    console.log("   Current URI:", nft.uri);
    console.log("");
    
    // Update metadata
    console.log("🔄 Updating metadata...");
    const result = await metaplex.nfts().update({
      nftOrSft: nft,
      name: "Dollar Token",
      symbol: "TDL",
      uri: METADATA_URI,
    });
    
    console.log("\n✅ Metadata updated successfully!");
    console.log("   Transaction:", result.response.signature);
    
  } catch (error: any) {
    console.error("\n❌ Error updating metadata:", error.message);
    
    // If no metadata exists, create it
    if (error.message?.includes("AccountNotFoundError") || error.message?.includes("No metadata")) {
      console.log("\n🆕 No metadata found. Creating new metadata...");
      try {
        const result = await metaplex.nfts().createSft({
          uri: METADATA_URI,
          name: "Dollar Token",
          symbol: "TDL",
          sellerFeeBasisPoints: 0,
          useExistingMint: mintAddress,
        });
        console.log("\n✅ Metadata created successfully!");
        console.log("   Transaction:", result.response.signature);
      } catch (createError: any) {
        console.error("\n❌ Failed to create metadata:", createError.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }

  console.log("\n📱 Next Steps:");
  console.log("   1. Wait 30-60 seconds for indexers to update");
  console.log("   2. Check Solscan:");
  console.log(`      https://solscan.io/token/${mintAddress.toString()}?cluster=devnet`);
  console.log("   3. Verify logo and metadata are showing");
}

fixMetadata().catch(error => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
