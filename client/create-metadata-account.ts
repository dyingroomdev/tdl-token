import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Metaplex, keypairIdentity, toMetaplexFile } from '@metaplex-foundation/js';
import * as fs from 'fs';

const MINT_ADDRESS = "5YrWnZM5WcAzL5YjrzLpMzcY3Y5USgKTGvTW1ox84Vuu";
const METADATA_URI = "https://raw.githubusercontent.com/dyingroomdev/tdl-token/refs/heads/master/metadata.json";

async function createMetadata() {
  console.log("🔧 Creating metadata account for token...\n");
  
  const keypairData = JSON.parse(
    fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf-8')
  );
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const metaplex = Metaplex.make(connection).use(keypairIdentity(keypair));
  const mintAddress = new PublicKey(MINT_ADDRESS);

  console.log("📍 Mint:", mintAddress.toString());
  console.log("📍 Update Authority:", keypair.publicKey.toString());
  console.log("");

  try {
    // Try to find existing metadata
    console.log("🔍 Checking for existing metadata...");
    const nft = await metaplex.nfts().findByMint({ mintAddress });
    console.log("✅ Metadata already exists!");
    console.log("   Name:", nft.name);
    console.log("   Symbol:", nft.symbol);
    console.log("   URI:", nft.uri);
  } catch (error: any) {
    if (error.message?.includes("AccountNotFoundError") || error.message?.includes("No Metadata")) {
      console.log("❌ No metadata found. Creating new metadata account...\n");
      
      try {
        // Create metadata for existing token
        const { nft } = await metaplex.nfts().create({
          uri: METADATA_URI,
          name: "Dollar Token",
          symbol: "TDL",
          sellerFeeBasisPoints: 0,
          useExistingMint: mintAddress,
          updateAuthority: keypair,
        });
        
        console.log("\n✅ Metadata account created successfully!");
        console.log("   Metadata Address:", nft.address.toString());
        console.log("   Name:", nft.name);
        console.log("   Symbol:", nft.symbol);
        console.log("");
        console.log("⏳ Wait 2-3 minutes for indexers to update");
        console.log("🔍 Then check: https://solscan.io/token/" + MINT_ADDRESS + "?cluster=devnet");
        
      } catch (createError: any) {
        console.error("\n❌ Failed to create metadata:", createError.message);
        
        // If the error is about existing mint, try using createSft
        if (createError.message?.includes("mint")) {
          console.log("\n🔄 Trying alternative method with createSft...");
          try {
            const { sft } = await metaplex.nfts().createSft({
              uri: METADATA_URI,
              name: "Dollar Token",
              symbol: "TDL",
              sellerFeeBasisPoints: 0,
              useExistingMint: mintAddress,
            });
            
            console.log("\n✅ Metadata created with createSft!");
            console.log("   Metadata Address:", sft.address.toString());
          } catch (sftError: any) {
            console.error("❌ createSft also failed:", sftError.message);
            process.exit(1);
          }
        } else {
          process.exit(1);
        }
      }
    } else {
      console.error("❌ Unexpected error:", error.message);
      process.exit(1);
    }
  }
}

createMetadata().catch(console.error);
