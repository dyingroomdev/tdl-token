import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { 
  createCreateMetadataAccountV3Instruction as createMetadataInstruction,
  PROGRAM_ID as METADATA_PROGRAM_ID
} from '@metaplex-foundation/mpl-token-metadata';
import { readFileSync } from 'fs';

const MINT_ADDRESS = "5YrWnZM5WcAzL5YjrzLpMzcY3Y5USgKTGvTW1ox84Vuu";

async function createMetadata() {
  console.log("🔧 Creating metadata account...\n");

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  const keypairData = JSON.parse(
    readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf-8')
  );
  const payer = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  const mint = new PublicKey(MINT_ADDRESS);

  // Derive metadata PDA
  const [metadata] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );

  console.log("📍 Mint:", mint.toString());
  console.log("📍 Metadata PDA:", metadata.toString());
  console.log("📍 Payer:", payer.publicKey.toString());
  console.log("");

  const instruction = createMetadataInstruction(
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
    console.log("📤 Sending transaction...");
    const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);

    console.log("\n✅ Metadata account created successfully!");
    console.log("   Transaction:", signature);
    console.log("   Metadata Address:", metadata.toString());
    console.log("");
    console.log("🔗 View transaction:");
    console.log(`   https://solscan.io/tx/${signature}?cluster=devnet`);
    console.log("");
    console.log("⏳ Wait 2-3 minutes, then check token:");
    console.log(`   https://solscan.io/token/${MINT_ADDRESS}?cluster=devnet`);

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.logs) {
      console.error("Transaction logs:", error.logs);
    }
    process.exit(1);
  }
}

createMetadata().catch(console.error);
