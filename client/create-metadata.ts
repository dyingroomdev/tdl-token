import { PublicKey, Keypair, Transaction, SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

async function createMetadata() {
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  
  const walletPath = path.join(process.env.HOME!, ".config/solana/id.json");
  const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf8"));
  const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));
  
  const wallet = new Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

  const addresses = JSON.parse(fs.readFileSync("client/addresses.json", "utf8"));
  const mint = new PublicKey(addresses.mint);

  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  );

  console.log("Creating metadata for mint:", mint.toString());
  console.log("Metadata PDA:", metadataPDA.toString());

  // Build the instruction manually
  const metadataData = {
    name: "Dollar Token",
    symbol: "TDL",
    uri: "https://arweave.net/metadata",
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  };

  const keys = [
    { pubkey: metadataPDA, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    { pubkey: payer.publicKey, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  // Serialize the data (simplified version)
  const nameLen = Buffer.alloc(4);
  nameLen.writeUInt32LE(metadataData.name.length);
  const nameBuffer = Buffer.from(metadataData.name);
  
  const symbolLen = Buffer.alloc(4);
  symbolLen.writeUInt32LE(metadataData.symbol.length);
  const symbolBuffer = Buffer.from(metadataData.symbol);
  
  const uriLen = Buffer.alloc(4);
  uriLen.writeUInt32LE(metadataData.uri.length);
  const uriBuffer = Buffer.from(metadataData.uri);

  const data = Buffer.concat([
    Buffer.from([33]), // CreateMetadataAccountV3 discriminator
    nameLen,
    nameBuffer,
    symbolLen,
    symbolBuffer,
    uriLen,
    uriBuffer,
    Buffer.from([0, 0]), // seller fee basis points (u16)
    Buffer.from([0]), // creators option (None)
    Buffer.from([0]), // collection option (None)
    Buffer.from([0]), // uses option (None)
    Buffer.from([1]), // is_mutable: true
    Buffer.from([0]), // collection_details option (None)
  ]);

  const ix = new anchor.web3.TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  });

  try {
    const tx = new Transaction().add(ix);
    const signature = await provider.sendAndConfirm(tx);

    console.log("\nMetadata created successfully!");
    console.log("Transaction:", signature);
    console.log("\nWait 30 seconds and refresh Solscan - it should now show:");
    console.log("  Name: Dollar Token");
    console.log("  Symbol: TDL");
  } catch (error: any) {
    if (error.message?.includes("already in use")) {
      console.log("\nMetadata already exists! Your token already has metadata.");
    } else {
      console.error("Error:", error.message);
    }
  }
}

createMetadata().catch(console.error);
