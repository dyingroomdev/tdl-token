const { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { createCreateMetadataAccountV3Instruction } = require('@metaplex-foundation/mpl-token-metadata');
const fs = require('fs');

const MINT_ADDRESS = "5YrWnZM5WcAzL5YjrzLpMzcY3Y5USgKTGvTW1ox84Vuu";
// Metaplex Token Metadata Program ID (constant)
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

async function createMetadata() {
  console.log("Creating metadata account...\n");

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  const keypairData = JSON.parse(
    fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf-8')
  );
  const payer = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  const mint = new PublicKey(MINT_ADDRESS);

  // Derive metadata PDA
  const [metadata] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  console.log("Mint:", mint.toString());
  console.log("Metadata PDA:", metadata.toString());
  console.log("Payer:", payer.publicKey.toString());
  console.log("");

  const instruction = createCreateMetadataAccountV3Instruction(
    {
      metadata,
      mint,
      mintAuthority: payer.publicKey,
      payer: payer.publicKey,
      updateAuthority: payer.publicKey,
    },
    {
      createMetadataAccountArgsV3: {
        data: {
          name: "Dollar Token",
          symbol: "TDL",
          uri: "https://raw.githubusercontent.com/dyingroomdev/tdl-token/refs/heads/master/metadata.json",
          sellerFeeBasisPoints: 0,
          creators: null,
          collection: null,
          uses: null,
        },
        isMutable: true,
        collectionDetails: null,
      },
    }
  );

  const transaction = new Transaction().add(instruction);

  try {
    console.log("Sending transaction...");
    const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);

    console.log("\nMetadata created successfully!");
    console.log("Transaction:", signature);
    console.log("Metadata Address:", metadata.toString());
    console.log("\nWait 2-3 minutes, then check:");
    console.log("https://solscan.io/token/" + MINT_ADDRESS + "?cluster=devnet");

  } catch (error) {
    console.error("\nError:", error.message);
    if (error.logs) {
      console.error("\nTransaction logs:");
      error.logs.forEach(log => console.error(log));
    }
    process.exit(1);
  }
}

createMetadata().catch(console.error);
