import { PublicKey, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";

// CHANGE THIS to your actual metadata JSON URL after upload
const METADATA_URI = "https://raw.githubusercontent.com/dyingroomdev/tdl-token/refs/heads/master/metadata.json";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

async function fixMetadata() {
  console.log("Fixing token metadata...\n");
  
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

  console.log("Mint:", mint.toString());
  console.log("Metadata PDA:", metadataPDA.toString());
  console.log("Metadata URI:", METADATA_URI);

  // Check if metadata exists
  const existingAccount = await connection.getAccountInfo(metadataPDA);
  
  if (existingAccount) {
    console.log("\nMetadata already exists. Updating it...");
    
    // Update metadata instruction (discriminator: 15)
    const nameBuffer = Buffer.from("Dollar Token");
    const symbolBuffer = Buffer.from("TDL");
    const uriBuffer = Buffer.from(METADATA_URI);
    
    const data = Buffer.concat([
      Buffer.from([15]), // UpdateMetadataAccountV2 discriminator
      Buffer.from([1]), // Data option (Some)
      // Name
      Buffer.from([nameBuffer.length, 0, 0, 0]),
      nameBuffer,
      // Symbol
      Buffer.from([symbolBuffer.length, 0, 0, 0]),
      symbolBuffer,
      // URI
      Buffer.from([uriBuffer.length, 0, 0, 0]),
      uriBuffer,
      Buffer.from([0, 0]), // seller_fee_basis_points
      Buffer.from([0]), // creators (None)
      Buffer.from([0]), // New update authority (None - keep current)
      Buffer.from([1]), // Primary sale happened (true)
      Buffer.from([1]), // Is mutable (true)
    ]);

    const keys = [
      { pubkey: metadataPDA, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    ];

    const ix = new anchor.web3.TransactionInstruction({
      keys,
      programId: TOKEN_METADATA_PROGRAM_ID,
      data,
    });

    const tx = new anchor.web3.Transaction().add(ix);
    const signature = await provider.sendAndConfirm(tx);
    
    console.log("\n✅ Metadata updated!");
    console.log("Transaction:", signature);
    
  } else {
    console.log("\nCreating new metadata...");
    
    // Create metadata instruction (discriminator: 33)
    const nameBuffer = Buffer.from("Dollar Token");
    const symbolBuffer = Buffer.from("TDL");
    const uriBuffer = Buffer.from(METADATA_URI);
    
    const data = Buffer.concat([
      Buffer.from([33]), // CreateMetadataAccountV3 discriminator
      // Name
      Buffer.from([nameBuffer.length, 0, 0, 0]),
      nameBuffer,
      // Symbol  
      Buffer.from([symbolBuffer.length, 0, 0, 0]),
      symbolBuffer,
      // URI
      Buffer.from([uriBuffer.length, 0, 0, 0]),
      uriBuffer,
      Buffer.from([0, 0]), // seller_fee_basis_points
      Buffer.from([0]), // creators (None)
      Buffer.from([0]), // collection (None)
      Buffer.from([0]), // uses (None)
      Buffer.from([1]), // is_mutable: true
      Buffer.from([0]), // collection_details (None)
    ]);

    const keys = [
      { pubkey: metadataPDA, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: payer.publicKey, isSigner: false, isWritable: false },
      { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    const ix = new anchor.web3.TransactionInstruction({
      keys,
      programId: TOKEN_METADATA_PROGRAM_ID,
      data,
    });

    const tx = new anchor.web3.Transaction().add(ix);
    const signature = await provider.sendAndConfirm(tx);
    
    console.log("\n✅ Metadata created!");
    console.log("Transaction:", signature);
  }

  console.log("\n📱 Wait 30-60 seconds, then check:");
  console.log(`   https://solscan.io/token/${mint.toString()}?cluster=devnet`);
  console.log("\n   You should see:");
  console.log("   - Name: Dollar Token");
  console.log("   - Symbol: TDL");
  console.log("   - Logo: Your SVG image");
}

fixMetadata().catch(console.error);
