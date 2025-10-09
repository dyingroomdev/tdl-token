import { BN } from "@coral-xyz/anchor";

export function parseAmountToBN(value: string, decimals: number): BN {
  const sanitized = value.trim();
  if (!sanitized) return new BN(0);
  if (!/^\d+(\.\d+)?$/.test(sanitized)) {
    throw new Error("Invalid amount format");
  }
  const [whole, fraction = ""] = sanitized.split(".");
  const paddedFraction = (fraction + "0".repeat(decimals)).slice(0, decimals);
  const combined = whole + paddedFraction;
  return new BN(combined);
}
