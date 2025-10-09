const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Metaplex, keypairIdentity } = require('@metaplex-foundation/js');
const fs = require('fs');

const MINT_ADDRESS = "5YrWnZM5WcAzL5YjrzLpMzcY3Y5USgKTGvTW1ox84Vuu";

async function createMetadata() {
  console.log("Creating metadata account...\n");

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  const keypairData = JSON.parse(
    fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf-8')
  );
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  
  const metaplex = Metaplex.make(connection).use(keypairIdentity(keypair));
  const mint = new PublicKey(MINT_ADDRESS);

  console.log("Mint:", mint.toString());
  console.log("Authority:", keypair.publicKey.toString());
  console.log("");

  try {
    console.log("Checking for existing metadata...");
    const existing = await metaplex.nfts().findByMint({ mintAddress: mint });
    console.log("Metadata already exists!");
    console.log("Name:", existing.name);
    console.log("Symbol:", existing.symbol);
    console.log("URI:", existing.uri);
  } catch (error) {
    console.log("No metadata found. Creating...\n");
    
    try {
      const { sft } = await metaplex.nfts().createSft({
        uri: "https://raw.githubusercontent.com/dyingroomdev/tdl-token/refs/heads/master/metadata.json",
        name: "Dollar Token",
        symbol: "TDL",
        sellerFeeBasisPoints: 0,
        useExistingMint: mint,
      });
      
      console.log("Metadata created successfully!");
      console.log("Metadata address:", sft.address.toString());
      console.log("\nWait 2-3 minutes, then check:");
      console.log("https://solscan.io/token/" + MINT_ADDRESS + "?cluster=devnet");
      
    } catch (createError) {
      console.error("Error creating metadata:", createError.message);
      process.exit(1);
    }
  }
}

createMetadata().catch(console.error);
