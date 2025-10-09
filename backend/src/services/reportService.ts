import { getProvider } from "./solanaProvider";
import { TdlPresaleClient } from "../../sdk/presaleClient";
import { config } from "../config";
import { BN } from "@coral-xyz/anchor";

const provider = getProvider();
const presaleClient = new TdlPresaleClient(provider, config.presaleProgramId);

export async function generatePresaleSummary() {
  const state = await presaleClient.fetchState(config.presaleState);
  return {
    state: config.presaleState.toBase58(),
    collected: state.collected.toString(),
    totalAllocated: state.totalAllocated.toString(),
    totalClaimed: state.totalClaimed.toString(),
    totalRefunded: state.totalRefunded.toString(),
    fundsWithdrawn: state.fundsWithdrawn.toString(),
    whitelistEnabled: state.whitelistEnabled,
    guardEnabled: state.guardEnabled,
    buyers: await fetchBuyerPositions(),
    generatedAt: new Date().toISOString(),
  };
}

async function fetchBuyerPositions() {
  const accountNamespace = presaleClient.program.account as any;
  const allPositions = await accountNamespace.buyerPosition.all([
    {
      memcmp: {
        offset: 9,
        bytes: config.presaleState.toBase58(),
      },
    },
  ]);

  return allPositions.map((entry: any) => ({
    buyer: entry.account.buyer.toBase58(),
    contributed: entry.account.contributed.toString(),
    purchased: entry.account.purchased.toString(),
    claimed: entry.account.claimed.toString(),
    refunded: entry.account.refunded,
    lastPurchaseTs: entry.account.lastPurchaseTs.toString(),
  }));
}

export function toCsv(summary: Awaited<ReturnType<typeof generatePresaleSummary>>) {
  const header = "buyer,contributed,purchased,claimed,refunded,last_purchase_ts";
  const lines = summary.buyers.map((buyer) =>
    [
      buyer.buyer,
      buyer.contributed,
      buyer.purchased,
      buyer.claimed,
      buyer.refunded ? "true" : "false",
      buyer.lastPurchaseTs,
    ].join(",")
  );

  return [header, ...lines].join("\n");
}
