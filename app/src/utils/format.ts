import { BN } from "@coral-xyz/anchor";

export function formatAmount(
  amount: BN,
  decimals: number,
  symbol?: string
) {
  const base = amount.toString();
  const padded = base.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals) || "0";
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  const formatted = fraction ? `${whole}.${fraction}` : whole;
  return symbol ? `${formatted} ${symbol}` : formatted;
}

export function formatDateTime(unixSeconds: number) {
  if (!unixSeconds) return "--";
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
