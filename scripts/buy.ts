#!/usr/bin/env ts-node

import { Command } from "commander";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import fs from "fs";
import {
  getProvider,
  loadKeypair,
  parsePublicKey,
  resolvePath,
} from "./utils";
import { TdlPresaleClient } from "../sdk/presaleClient";
import { parseBytes32 } from "./presale-config";

const program = new Command();
program
  .description("Submit a presale buy transaction from a local keypair")
  .requiredOption("--state <pubkey>", "Presale state PDA")
  .requiredOption("--pay-mint <pubkey>", "Payment mint (USDC/SOL)")
  .requiredOption("--amount <number>", "Contribution amount in raw units")
  .option("--min-tdl <number>", "Minimum acceptable TDL output", "0")
  .option("--buyer <keypair>", "Buyer keypair (defaults to provider wallet)")
  .option("--guard <keypair>", "Optional guard signer keypair")
  .option("--proof <file>", "Merkle proof JSON (array of 32-byte hex strings)")
  .option("--program-id <pubkey>", "Override presale program id")
  .action(async (opts) => {
    const provider = getProvider();
    const buyer =
      opts.buyer !== undefined
        ? loadKeypair(resolvePath(opts.buyer))
        : (provider.wallet as any)?.payer;
    if (!buyer) {
      throw new Error("Buyer keypair required (set ANCHOR_WALLET or --buyer)");
    }

    const guard =
      opts.guard !== undefined
        ? loadKeypair(resolvePath(opts.guard))
        : null;

    const client = new TdlPresaleClient(
      provider,
      opts.programId ? new PublicKey(opts.programId) : undefined
    );

    const state = parsePublicKey(opts.state, "state");
    const payMint = parsePublicKey(opts.payMint, "pay-mint");
    const proof = opts.proof ? loadProof(opts.proof) : undefined;

    const signature = await client.buy({
      buyer,
      state,
      payMint,
      guard,
      args: {
        payAmount: new BN(opts.amount),
        minExpectedTdl: new BN(opts.minTdl),
        merkleProof: proof,
      },
    });

    console.log("Buy transaction signature:", signature);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error("Presale buy failed:", err);
  process.exit(1);
});

function loadProof(file: string): number[][] {
  const resolved = resolvePath(file);
  const raw = JSON.parse(fs.readFileSync(resolved, "utf8"));
  if (!Array.isArray(raw)) {
    throw new Error("Merkle proof file must contain an array of nodes");
  }
  return raw.map(parseBytes32);
}
