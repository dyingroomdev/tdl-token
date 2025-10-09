#!/usr/bin/env ts-node

import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import { TdlPresaleClient } from "../sdk/presaleClient";
import {
  getProvider,
  loadKeypair,
  parsePublicKey,
  resolvePath,
  writeJson,
} from "./utils";
import { loadPresaleConfig } from "./presale-config";

const program = new Command();
program
  .description("Initialize presale state, vaults, and configuration")
  .requiredOption("--tdl-mint <pubkey>", "TDL mint address")
  .requiredOption("--pay-mint <pubkey>", "Payment mint address")
  .requiredOption("--config <file>", "Presale configuration JSON")
  .option("--admin <keypair>", "Admin keypair (defaults to provider wallet)")
  .option("--program-id <pubkey>", "Override presale program id")
  .option("--label <name>", "Artifact label", "devnet")
  .option("--artifacts <dir>", "Artifacts directory", "artifacts")
  .action(async (opts) => {
    const provider = getProvider();
    const admin =
      opts.admin !== undefined
        ? loadKeypair(resolvePath(opts.admin))
        : (provider.wallet as any)?.payer;
    if (!admin) {
      throw new Error("Admin keypair required (set ANCHOR_WALLET or --admin)");
    }

    const config = loadPresaleConfig(opts.config);
    const tdlMint = parsePublicKey(opts.tdlMint, "tdl-mint");
    const payMint = parsePublicKey(opts.payMint, "pay-mint");

    const client = new TdlPresaleClient(
      provider,
      opts.programId ? new PublicKey(opts.programId) : undefined
    );

    const statePda = TdlPresaleClient.deriveState(tdlMint);
    const vaultAuthority = TdlPresaleClient.deriveVaultAuthority(statePda);
    const whitelist = TdlPresaleClient.deriveWhitelist(statePda);

    const sig = await client.initializeToken({
      admin,
      tdlMint,
      payMint,
      config,
    });

    console.log("Presale initialized with transaction:", sig);
    const state = await client.fetchState(statePda);

    const artifact = {
      label: opts.label,
      programId: client.program.programId.toBase58(),
      state: statePda.toBase58(),
      admin: state.admin.toBase58(),
      tdlMint: state.tdlMint.toBase58(),
      payMint: state.payMint.toBase58(),
      tdlVault: state.tdlVault.toBase58(),
      payVault: state.payVault.toBase58(),
      vaultAuthority: vaultAuthority.toBase58(),
      whitelist: whitelist.toBase58(),
      transaction: sig,
      config: {
        priceNumerator: state.priceNumerator.toString(),
        priceDenominator: state.priceDenominator.toString(),
        softCap: state.softCap.toString(),
        hardCap: state.hardCap.toString(),
        walletMin: state.walletMin.toString(),
        walletMax: state.walletMax.toString(),
        startTs: state.startTs.toString(),
        endTs: state.endTs.toString(),
        tgeBps: state.tgeBps,
        cliffSeconds: state.cliffSeconds.toString(),
        vestingSeconds: state.vestingSeconds.toString(),
        whitelistEnabled: state.whitelistEnabled,
        buyCooldownSeconds: state.buyCooldownSeconds.toString(),
        guardEnabled: state.guardEnabled,
        guardAuthority: state.guardAuthority.toBase58(),
      },
      initializedAt: new Date().toISOString(),
    };

    const dir = resolvePath(opts.artifacts);
    const file = `${dir}/presale-${opts.label}.json`;
    writeJson(file, artifact);
    console.log("Artifacts written to", file);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error("Presale initialization failed:", err);
  process.exit(1);
});
