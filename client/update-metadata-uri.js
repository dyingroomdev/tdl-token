const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Metaplex, keypairIdentity } = require('@metaplex-foundation/js');
const fs = require('fs');

const MINT_ADDRESS = "5YrWnZM5WcAzL5YjrzLpMzcY3Y5USgKTGvTW1ox84Vuu";
const METADATA_URI = "https://raw.githubusercontent.com/dyingroomdev/tdl-token/refs/heads/master/metadata.json";

async function updateMetadata() {
  console.log("Updating metadata URI...\n");

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  const keypairData = JSON.parse(
    fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf-8')
  );
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  
  const metaplex = Metaplex.make(connection).use(keypairIdentity(keypair));
  const mint = new PublicKey(MINT_ADDRESS);

  console.log("Mint:", mint.toString());
  console.log("New URI:", METADATA_URI);
  console.log("");

  try {
    const nft = await metaplex.nfts().findByMint({ mintAddress: mint });
    
    console.log("Current metadata:");
    console.log("  Name:", nft.name);
    console.log("  Symbol:", nft.symbol);
    console.log("  URI:", nft.uri || "(empty)");
    console.log("");
    
    console.log("Updating URI...");
    const { response } = await metaplex.nfts().update({
      nftOrSft: nft,
      uri: METADATA_URI,
    });
    
    console.log("\nURI updated successfully!");
    console.log("Transaction:", response.signature);
    console.log("\nWait 2-3 minutes for indexers to update, then check:");
    console.log("https://solscan.io/token/" + MINT_ADDRESS + "?cluster=devnet");
    
  } catch (error) {
    console.error("\nError:", error.message);
    process.exit(1);
  }
}

updateMetadata().catch(console.error);
