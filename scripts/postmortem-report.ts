#!/usr/bin/env ts-node

import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import path from "path";
import {
  getProvider,
  parsePublicKey,
  resolvePath,
  writeJson,
} from "./utils";
import { TdlPresaleClient } from "../sdk/presaleClient";
import fs from "fs";

const program = new Command();
program
  .description("Generate presale post-mortem report (JSON or CSV)")
  .requiredOption("--state <pubkey>", "Presale state PDA")
  .option("--program-id <pubkey>", "Override presale program id")
  .option("--format <json|csv>", "Output format", "json")
  .option("--out <path>", "Output file (stdout if omitted)")
  .action(async (opts) => {
    const provider = getProvider();
    const client = new TdlPresaleClient(
      provider,
      opts.programId ? new PublicKey(opts.programId) : undefined
    );
    const statePk = parsePublicKey(opts.state, "state");

    const state = await client.fetchState(statePk);
    const positions = await (client.program.account as any).buyerPosition.all([
      {
        memcmp: {
          offset: 9, // 8 discriminator + 1 bump
          bytes: statePk.toBase58(),
        },
      },
    ]);

    const rows = positions.map((entry: any) => ({
      buyer: entry.account.buyer.toBase58(),
      contributed: entry.account.contributed.toString(),
      purchased: entry.account.purchased.toString(),
      claimed: entry.account.claimed.toString(),
      lastPurchaseTs: entry.account.lastPurchaseTs.toString(),
      refunded: entry.account.refunded,
    }));

    const summary = {
      state: statePk.toBase58(),
      programId: client.program.programId.toBase58(),
      admin: state.admin.toBase58(),
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
      },
      buyers: rows.length,
      generatedAt: new Date().toISOString(),
    };

    const format = String(opts.format ?? "json").toLowerCase();
    if (format === "csv") {
      const csv = toCsv(rows);
      emit(csv, opts.out);
    } else {
      const output = {
        summary,
        buyers: rows,
      };
      if (opts.out) {
        writeJson(resolvePath(opts.out), output);
      } else {
        console.log(JSON.stringify(output, null, 2));
      }
    }
  });

program.parseAsync(process.argv).catch((err) => {
  console.error("Report generation failed:", err);
  process.exit(1);
});

function toCsv(rows: any[]): string {
  const header = "buyer,contributed,purchased,claimed,last_purchase_ts,refunded";
  const lines = rows.map(
    (row) =>
      [
        row.buyer,
        row.contributed,
        row.purchased,
        row.claimed,
        row.lastPurchaseTs,
        row.refunded ? "true" : "false",
      ].join(",")
  );
  return [header, ...lines].join("\n");
}

function emit(content: string, out?: string): void {
  if (out) {
    const resolved = resolvePath(out);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content);
    console.log("Report written to", resolved);
  } else {
    console.log(content);
  }
}
