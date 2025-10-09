#!/usr/bin/env ts-node

import { AnchorProvider, BN, web3 } from "@coral-xyz/anchor";
import { Command } from "commander";
import { TdlPresaleClient } from "../sdk/presaleClient";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import {
  getProvider,
  loadKeypair,
  parsePublicKey,
  ensureDirExists,
  resolvePath,
} from "./utils";
import { loadPresaleConfig, parseBytes32 } from "./presale-config";
import fs from "fs";

const program = new Command();
program
  .name("presale")
  .description("TDL Presale management CLI")
  .option(
    "-p, --program-id <address>",
    "Override presale program id (defaults to IDL metadata)"
  );

program
  .command("init")
  .description("Initialize presale state and vaults")
  .requiredOption("--tdl-mint <pubkey>", "TDL mint address")
  .requiredOption("--pay-mint <pubkey>", "Payment mint address (e.g. USDC)")
  .requiredOption("--config <file>", "JSON config describing presale terms")
  .option("--admin <keypair>", "Admin keypair path (defaults to provider)")
  .action(async (opts) => {
    const provider = getProvider();
    const admin =
      opts.admin !== undefined
        ? loadKeypair(resolvePath(opts.admin))
        : (provider.wallet as any)?.payer;
    if (!admin) {
      throw new Error("Admin keypair required (set ANCHOR_WALLET or --admin)");
    }

    const client = buildClient(provider, program.opts().programId);

    const config = loadPresaleConfig(opts.config);
    const tdlMint = parsePublicKey(opts.tdlMint, "tdl-mint");
    const payMint = parsePublicKey(opts.payMint, "pay-mint");
    const sig = await client.initializeToken({
      admin,
      tdlMint,
      payMint,
      config,
    });

    const state = TdlPresaleClient.deriveState(tdlMint);
    const stateAccount = await client.fetchState(state);
    const vaultAuthority = TdlPresaleClient.deriveVaultAuthority(state);
    const whitelist = TdlPresaleClient.deriveWhitelist(state);

    console.log("Presale initialized");
    console.log("  State PDA:", state.toBase58());
    console.log("  Vault authority:", vaultAuthority.toBase58());
    console.log("  TDL vault ATA:", stateAccount.tdlVault.toBase58());
    console.log("  Pay vault ATA:", stateAccount.payVault.toBase58());
    console.log("  Whitelist PDA:", whitelist.toBase58());
    console.log("  Transaction:", sig);
  });

program
  .command("set-config")
  .description("Update presale configuration")
  .requiredOption("--state <pubkey>", "Presale state PDA")
  .requiredOption("--config <file>", "JSON config file")
  .option("--admin <keypair>", "Admin keypair path")
  .action(async (opts) => {
    const provider = getProvider();
    const admin =
      opts.admin !== undefined
        ? loadKeypair(resolvePath(opts.admin))
        : (provider.wallet as any)?.payer;
    if (!admin) {
      throw new Error("Admin keypair required");
    }
    const client = buildClient(provider, program.opts().programId);
    const state = parsePublicKey(opts.state, "state");
    const config = loadPresaleConfig(opts.config);

    const whitelist = TdlPresaleClient.deriveWhitelist(state);

    const methods = client.program.methods as any;
    const sig = await methods
      .setConfig(client.serializeConfig(config))
      .accounts({
        admin: admin.publicKey,
        state,
        whitelist,
      })
      .signers([admin])
      .rpc();

    console.log("Configuration updated:", sig);
  });

program
  .command("status")
  .description("Print presale state summary")
  .argument("<state>", "Presale state PDA")
  .action(async (stateArg: string) => {
    const provider = getProvider();
    const client = buildClient(provider, program.opts().programId);
    const statePk = parsePublicKey(stateArg, "state");
    const state = await client.fetchState(statePk);
    console.log(formatState(statePk, state));
  });

program
  .command("buy")
  .description("Perform a controlled presale buy")
  .requiredOption("--state <pubkey>", "Presale state PDA")
  .requiredOption("--pay-mint <pubkey>", "Payment mint address")
  .requiredOption("--amount <number>", "Payment amount (raw units)")
  .option("--min-tdl <number>", "Minimum TDL expected", "0")
  .option("--buyer <keypair>", "Buyer keypair path")
  .option("--guard <keypair>", "Optional guard signer keypair path")
  .option("--proof <file>", "Merkle proof JSON/array for whitelist")
  .action(async (opts) => {
    const provider = getProvider();
    const buyer =
      opts.buyer !== undefined
        ? loadKeypair(resolvePath(opts.buyer))
        : (provider.wallet as any)?.payer;
    if (!buyer) throw new Error("Buyer keypair required");

    const guard =
      opts.guard !== undefined ? loadKeypair(resolvePath(opts.guard)) : null;

    const client = buildClient(provider, program.opts().programId);
    const state = parsePublicKey(opts.state, "state");
    const payMint = parsePublicKey(opts.payMint, "pay-mint");
    const merkleProof = loadMerkleProof(opts.proof);

    const sig = await client.buy({
      buyer,
      guard,
      state,
      payMint,
      args: {
        payAmount: new BN(opts.amount),
        minExpectedTdl: new BN(opts.minTdl),
        merkleProof,
      },
    });

    console.log("Buy transaction:", sig);
  });

program
  .command("claim")
  .description("Claim vested TDL tokens")
  .requiredOption("--state <pubkey>", "Presale state PDA")
  .requiredOption("--tdl-mint <pubkey>", "TDL mint address")
  .option("--buyer <keypair>", "Buyer keypair path")
  .action(async (opts) => {
    const provider = getProvider();
    const buyer =
      opts.buyer !== undefined
        ? loadKeypair(resolvePath(opts.buyer))
        : (provider.wallet as any)?.payer;
    if (!buyer) throw new Error("Buyer keypair required");

    const client = buildClient(provider, program.opts().programId);
    const state = parsePublicKey(opts.state, "state");
    const tdlMint = parsePublicKey(opts.tdlMint, "tdl-mint");

    const sig = await client.claim({
      buyer,
      state,
      tdlMint,
    });

    console.log("Claim transaction:", sig);
  });

program
  .command("refund")
  .description("Refund buyer if soft cap not met")
  .requiredOption("--state <pubkey>", "Presale state PDA")
  .requiredOption("--pay-mint <pubkey>", "Payment mint address")
  .option("--buyer <keypair>", "Buyer keypair path")
  .action(async (opts) => {
    const provider = getProvider();
    const buyer =
      opts.buyer !== undefined
        ? loadKeypair(resolvePath(opts.buyer))
        : (provider.wallet as any)?.payer;
    if (!buyer) throw new Error("Buyer keypair required");

    const client = buildClient(provider, program.opts().programId);
    const state = parsePublicKey(opts.state, "state");
    const payMint = parsePublicKey(opts.payMint, "pay-mint");

    const sig = await client.refund({
      buyer,
      state,
      payMint,
    });

    console.log("Refund transaction:", sig);
  });

program
  .command("withdraw")
  .description("Withdraw raised funds to admin destination token account")
  .requiredOption("--state <pubkey>", "Presale state PDA")
  .requiredOption("--pay-mint <pubkey>", "Payment mint address")
  .requiredOption("--destination <pubkey>", "Destination token account")
  .requiredOption("--amount <number>", "Amount to withdraw (raw units)")
  .option("--admin <keypair>", "Admin keypair path")
  .action(async (opts) => {
    const provider = getProvider();
    const admin =
      opts.admin !== undefined
        ? loadKeypair(resolvePath(opts.admin))
        : (provider.wallet as any)?.payer;
    if (!admin) throw new Error("Admin keypair required");

    const client = buildClient(provider, program.opts().programId);
    const state = parsePublicKey(opts.state, "state");
    const providedPayMint = parsePublicKey(opts.payMint, "pay-mint");
    const destination = parsePublicKey(opts.destination, "destination");

    const vaultAuthority = TdlPresaleClient.deriveVaultAuthority(state);
    const stateAccount = await client.fetchState(state);
    if (!stateAccount.payMint.equals(providedPayMint)) {
      console.warn(
        "Warning: provided pay mint does not match presale state configuration."
      );
    }
    const methods = client.program.methods as any;

    const sig = await methods
      .withdrawFunds(new BN(opts.amount))
      .accounts({
        admin: admin.publicKey,
        state,
        vault_authority: vaultAuthority,
        pay_vault: stateAccount.payVault,
        destination,
        token_program: TOKEN_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();

    console.log("Withdraw transaction:", sig);
  });

program
  .command("report")
  .description("Emit JSON summary of presale state to file/stdout")
  .requiredOption("--state <pubkey>", "Presale state PDA")
  .option("--out <file>", "Output path for JSON report")
  .action(async (opts) => {
    const provider = getProvider();
    const client = buildClient(provider, program.opts().programId);
    const statePk = parsePublicKey(opts.state, "state");
    const state = await client.fetchState(statePk);
    const report = {
      state: statePk.toBase58(),
      admin: state.admin.toBase58(),
      tdlMint: state.tdlMint.toBase58(),
      payMint: state.payMint.toBase58(),
      totals: {
        collected: state.collected.toString(),
        allocated: state.totalAllocated.toString(),
        claimed: state.totalClaimed.toString(),
        refunded: state.totalRefunded.toString(),
        withdrawn: state.fundsWithdrawn.toString(),
      },
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
        buyCooldownSeconds: state.buyCooldownSeconds.toString(),
        whitelistEnabled: state.whitelistEnabled,
        guardEnabled: state.guardEnabled,
      },
      flags: {
        isPaused: state.isPaused,
      },
      generatedAt: new Date().toISOString(),
    };

    if (opts.out) {
      const outPath = resolvePath(opts.out);
      ensureDirExists(outPath);
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
      console.log("Report written to", outPath);
    } else {
      console.log(JSON.stringify(report, null, 2));
    }
  });

program
  .command("toggle")
  .description("Pause or resume the sale")
  .requiredOption("--state <pubkey>", "Presale state PDA")
  .requiredOption("--action <pause|unpause>", "Action to perform")
  .option("--admin <keypair>", "Admin keypair path")
  .action(async (opts) => {
    const provider = getProvider();
    const admin =
      opts.admin !== undefined
        ? loadKeypair(resolvePath(opts.admin))
        : (provider.wallet as any)?.payer;
    if (!admin) throw new Error("Admin keypair required");

    const client = buildClient(provider, program.opts().programId);
    const state = parsePublicKey(opts.state, "state");
    const action = `${opts.action}`.toLowerCase();

    const methods = client.program.methods as any;
    const method =
      action === "pause"
        ? methods.pause()
        : action === "unpause"
        ? methods.unpause()
        : null;

    if (!method) {
      throw new Error("Action must be either pause or unpause");
    }

    const sig = await method
      .accounts({
        admin: admin.publicKey,
        state,
      })
      .signers([admin])
      .rpc();

    console.log(`Sale ${action}d:`, sig);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

function buildClient(
  provider: AnchorProvider,
  programId?: string
): TdlPresaleClient {
  const idOverride = programId ? new web3.PublicKey(programId) : undefined;
  return new TdlPresaleClient(provider, idOverride);
}

function loadMerkleProof(file?: string): number[][] | undefined {
  if (!file) return undefined;
  const proofRaw = JSON.parse(fs.readFileSync(resolvePath(file), "utf8"));
  if (!Array.isArray(proofRaw)) {
    throw new Error("Merkle proof file must be an array");
  }
  return proofRaw.map(parseBytes32);
}

function formatState(statePk: PublicKey, state: any): string {
  return [
    `State:        ${statePk.toBase58()}`,
    `Admin:        ${state.admin.toBase58()}`,
    `TDL Mint:     ${state.tdlMint.toBase58()}`,
    `Pay Mint:     ${state.payMint.toBase58()}`,
    `Vault PDA:    ${TdlPresaleClient.deriveVaultAuthority(statePk).toBase58()}`,
    `Collected:    ${state.collected.toString()}`,
    `Allocated:    ${state.totalAllocated.toString()}`,
    `Claimed:      ${state.totalClaimed.toString()}`,
    `Refunded:     ${state.totalRefunded.toString()}`,
    `Withdrawn:    ${state.fundsWithdrawn.toString()}`,
    `Whitelist:    ${state.whitelistEnabled}`,
    `Guard:        ${state.guardEnabled}`,
    `Paused:       ${state.isPaused}`,
    `Start TS:     ${state.startTs.toString()}`,
    `End TS:       ${state.endTs.toString()}`,
    `TGE bps:      ${state.tgeBps}`,
  ].join("\n");
}
