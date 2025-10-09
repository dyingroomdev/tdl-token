import { AnchorProvider, web3 } from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { Connection, Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { config } from "../config";

let provider: AnchorProvider | null = null;

function loadKeypair(): web3.Signer {
  const keypairPath =
    process.env.SERVICE_KEYPAIR ??
    path.join(process.cwd(), "backend", "service-keypair.json");

  if (!fs.existsSync(keypairPath)) {
    throw new Error(
      `Signer keypair missing at ${keypairPath}. Generate with 'solana-keygen new -o ${keypairPath}'.`
    );
  }
  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

export function getProvider() {
  if (provider) return provider;
  const connection = new Connection(config.rpcEndpoint, "confirmed");
  const signer = loadKeypair();

  const wallet: Wallet = {
    payer: signer,
    publicKey: signer.publicKey,
    signAllTransactions: async (txs) => {
      txs.forEach((tx) => tx.partialSign(signer));
      return txs;
    },
    signTransaction: async (tx) => {
      tx.partialSign(signer);
      return tx;
    },
  };

  provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return provider;
}
