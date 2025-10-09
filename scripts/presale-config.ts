import { BN } from "@coral-xyz/anchor";
import fs from "fs";
import { PublicKey } from "@solana/web3.js";
import { PresaleConfigInput } from "../sdk/presaleClient";
import { resolvePath } from "./utils";

type Json = Record<string, unknown>;

export function loadPresaleConfig(configPath: string): PresaleConfigInput {
  const resolved = resolvePath(configPath);
  const raw = JSON.parse(fs.readFileSync(resolved, "utf8")) as Json;
  if (!raw) {
    throw new Error(`Invalid config JSON at ${resolved}`);
  }

  return {
    priceNumerator: toBNish(raw.priceNumerator),
    priceDenominator: toBNish(raw.priceDenominator),
    softCap: toBNish(raw.softCap),
    hardCap: toBNish(raw.hardCap),
    walletMin: toBNish(raw.walletMin),
    walletMax: toBNish(raw.walletMax),
    startTs: toBNish(raw.startTs),
    endTs: toBNish(raw.endTs),
    tgeBps: Number(raw.tgeBps ?? 0),
    cliffSeconds: toBNish(raw.cliffSeconds ?? 0),
    vestingSeconds: toBNish(raw.vestingSeconds ?? 0),
    whitelistEnabled: Boolean(raw.whitelistEnabled),
    whitelistRoot: parseBytes32(raw.whitelistRoot ?? []),
    buyCooldownSeconds: toBNish(raw.buyCooldownSeconds ?? 0),
    guardAuthority:
      typeof raw.guardAuthority === "string"
        ? new PublicKey(raw.guardAuthority)
        : null,
  } as PresaleConfigInput;
}

export function toBNish(value: unknown): BN {
  if (value instanceof BN) return value;
  if (typeof value === "number") return new BN(value);
  if (typeof value === "string") {
    if (value.startsWith("0x")) {
      return new BN(value.replace(/^0x/, ""), 16);
    }
    return new BN(value);
  }
  if (typeof value === "bigint") {
    return new BN(value.toString());
  }
  throw new Error(`Unable to convert value ${value} to BN`);
}

export function parseBytes32(value: unknown): number[] {
  if (Array.isArray(value)) {
    if (value.length !== 32) {
      throw new Error("whitelistRoot must be 32 bytes");
    }
    return value.map((v) => Number(v));
  }
  if (typeof value === "string") {
    const clean = value.startsWith("0x") ? value.slice(2) : value;
    if (clean.length !== 64) {
      throw new Error("whitelistRoot hex string must be 32 bytes");
    }
    const bytes: number[] = [];
    for (let i = 0; i < clean.length; i += 2) {
      bytes.push(parseInt(clean.slice(i, i + 2), 16));
    }
    return bytes;
  }
  if (!value) {
    return new Array(32).fill(0);
  }
  throw new Error("whitelistRoot must be array or hex string");
}

export function stateToConfigInput(state: any): PresaleConfigInput {
  return {
    priceNumerator: coerceBn(state.priceNumerator),
    priceDenominator: coerceBn(state.priceDenominator),
    softCap: coerceBn(state.softCap),
    hardCap: coerceBn(state.hardCap),
    walletMin: coerceBn(state.walletMin),
    walletMax: coerceBn(state.walletMax),
    startTs: coerceBn(state.startTs),
    endTs: coerceBn(state.endTs),
    tgeBps: Number(state.tgeBps ?? 0),
    cliffSeconds: coerceBn(state.cliffSeconds),
    vestingSeconds: coerceBn(state.vestingSeconds),
    whitelistEnabled: Boolean(state.whitelistEnabled),
    whitelistRoot: new Array(32).fill(0),
    buyCooldownSeconds: coerceBn(state.buyCooldownSeconds),
    guardAuthority: state.guardEnabled ? new PublicKey(state.guardAuthority) : null,
  };
}

export function mergePresaleConfig(
  base: PresaleConfigInput,
  overrides: Partial<PresaleConfigInput>
): PresaleConfigInput {
  return {
    ...base,
    ...overrides,
    whitelistRoot: overrides.whitelistRoot ?? base.whitelistRoot,
    guardAuthority:
      overrides.guardAuthority === undefined
        ? base.guardAuthority ?? null
        : overrides.guardAuthority,
  };
}

function coerceBn(value: any): BN {
  if (value instanceof BN) return value;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return new BN((value as { toString(): string }).toString());
  }
  return toBNish(value);
}
