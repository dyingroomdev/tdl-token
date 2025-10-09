#!/usr/bin/env ts-node

import { Command } from "commander";
import fs from "fs";
import { getProvider, loadKeypair, resolvePath, writeJson } from "./utils";
import { TdlPresaleClient } from "../sdk/presaleClient";
import {
  loadPresaleConfig,
  mergePresaleConfig,
  stateToConfigInput,
} from "./presale-config";
import { computeMerkleArtifacts } from "./whitelist-merkle";
import { PublicKey } from "@solana/web3.js";
import { parsePublicKey } from "./utils";

const cmd = new Command();
cmd
  .description("Import whitelist CSV and update presale config")
  .requiredOption("--state <pubkey>", "Presale state PDA")
  .requiredOption("--csv <file>", "CSV file with wallet addresses")
  .option("--config <file>", "Presale config JSON to use as base overrides")
  .option("--admin <keypair>", "Admin keypair path (defaults to provider wallet)")
  .option("--program-id <pubkey>", "Override presale program id")
  .option("--disable", "Disable whitelist while uploading", false)
  .option("--artifacts <path>", "Output artifacts directory", "artifacts")
  .action(async (opts) => {
    const provider = getProvider();
    const admin =
      opts.admin !== undefined
        ? loadKeypair(resolvePath(opts.admin))
        : (provider.wallet as any)?.payer;
    if (!admin) {
      throw new Error("Admin keypair required (set ANCHOR_WALLET or --admin)");
    }

    const client = new TdlPresaleClient(
      provider,
      opts.programId ? new PublicKey(opts.programId) : undefined
    );
    const statePk = parsePublicKey(opts.state, "state");

    const whitelistAccounts = readWhitelistCsv(opts.csv);
    console.log(`Loaded ${whitelistAccounts.length} whitelist entries.`);

    const { root, proofs } = computeMerkleArtifacts(whitelistAccounts);
    console.log("Computed whitelist root:", `0x${Buffer.from(root).toString("hex")}`);

    const state = await client.fetchState(statePk);
    const baseConfig = stateToConfigInput(state);
    const overrides = opts.config ? loadPresaleConfig(opts.config) : undefined;
    const merged = mergePresaleConfig(baseConfig, {
      ...(overrides ?? {}),
      whitelistEnabled: !opts.disable,
      whitelistRoot: Array.from(root),
    });

    const whitelistPda = TdlPresaleClient.deriveWhitelist(statePk);
    const sig = await client.program.methods
      .setConfig(client.serializeConfig(merged))
      .accounts({
        admin: admin.publicKey,
        state: statePk,
        whitelist: whitelistPda,
      })
      .signers([admin])
      .rpc();

    console.log("Whitelist configuration updated:", sig);

    const artifact = {
      state: statePk.toBase58(),
      whitelist: whitelistAccounts.map((pk) => pk.toBase58()),
      root: `0x${Buffer.from(root).toString("hex")}`,
      proofs,
      whitelistEnabled: !opts.disable,
      transaction: sig,
      generatedAt: new Date().toISOString(),
    };

    const outPath = resolvePath(
      `${opts.artifacts}/whitelist-${Date.now()}.json`
    );
    writeJson(outPath, artifact);
    console.log("Artifacts written to", outPath);
  });

cmd.parseAsync(process.argv).catch((err) => {
  console.error("Whitelist import failed:", err);
  process.exit(1);
});

function readWhitelistCsv(file: string): PublicKey[] {
  const resolved = resolvePath(file);
  const contents = fs.readFileSync(resolved, "utf8");
  const lines = contents.split(/\r?\n/).map((line) => line.trim());
  const addresses: PublicKey[] = [];

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const [raw] = line.split(/,|;/).map((cell) => cell.trim());
    if (!raw) continue;
    if (raw.toLowerCase() === "address") continue;
    try {
      addresses.push(new PublicKey(raw));
    } catch (err) {
      throw new Error(`Invalid public key in CSV: ${raw}`);
    }
  }

  if (addresses.length === 0) {
    console.warn("Warning: whitelist CSV produced zero addresses.");
  }
  return addresses;
}
