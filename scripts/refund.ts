#!/usr/bin/env ts-node

import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import {
  getProvider,
  loadKeypair,
  parsePublicKey,
  resolvePath,
} from "./utils";
import { TdlPresaleClient } from "../sdk/presaleClient";

const program = new Command();
program
  .description("Request a refund from the presale escrow if soft cap was not met")
  .requiredOption("--state <pubkey>", "Presale state PDA")
  .requiredOption("--pay-mint <pubkey>", "Payment mint address")
  .option("--buyer <keypair>", "Buyer keypair (defaults to provider wallet)")
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

    const client = new TdlPresaleClient(
      provider,
      opts.programId ? new PublicKey(opts.programId) : undefined
    );

    const state = parsePublicKey(opts.state, "state");
    const payMint = parsePublicKey(opts.payMint, "pay-mint");

    const signature = await client.refund({
      buyer,
      state,
      payMint,
    });

    console.log("Refund transaction signature:", signature);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error("Refund failed:", err);
  process.exit(1);
});
