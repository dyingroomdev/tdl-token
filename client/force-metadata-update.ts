import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';
import * as fs from 'fs';

const MINT_ADDRESS = "5YrWnZM5WcAzL5YjrzLpMzcY3Y5USgKTGvTW1ox84Vuu";
const METADATA_URI = "https://raw.githubusercontent.com/dyingroomdev/tdl-token/refs/heads/master/metadata.json";

async function forceUpdate() {
  console.log("🔄 Force updating metadata...\n");
  
  const keypairData = JSON.parse(
    fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf-8')
  );
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const metaplex = Metaplex.make(connection).use(keypairIdentity(keypair));
  const mintAddress = new PublicKey(MINT_ADDRESS);

  console.log("📍 Token:", mintAddress.toString());
  console.log("📍 Metadata URI:", METADATA_URI);
  console.log("");
  
  try {
    const nft = await metaplex.nfts().findByMint({ mintAddress });
    
    console.log("Current metadata:");
    console.log("  Name:", nft.name);
    console.log("  Symbol:", nft.symbol);
    console.log("  URI:", nft.uri);
    console.log("");
    
    // Update with isMutable to force change
    const result = await metaplex.nfts().update({
      nftOrSft: nft,
      name: "Dollar Token", 
      symbol: "TDL",
      uri: METADATA_URI,
      isMutable: true,
    });
    
    console.log("✅ Metadata updated successfully!");
    console.log("   Transaction:", result.response.signature);
    console.log("");
    console.log("🔗 View transaction:");
    console.log(`   https://solscan.io/tx/${result.response.signature}?cluster=devnet`);
    console.log("");
    console.log("⏳ Wait 2-3 minutes, then check token:");
    console.log(`   https://solscan.io/token/${mintAddress.toString()}?cluster=devnet`);
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

forceUpdate().catch(console.error);
