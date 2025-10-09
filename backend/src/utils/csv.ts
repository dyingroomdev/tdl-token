import { parse } from "csv-parse/sync";
import { PublicKey } from "@solana/web3.js";

export function parseWhitelistCsv(buffer: Buffer): PublicKey[] {
  const records = parse(buffer.toString("utf8"), {
    skip_empty_lines: true,
    columns: false,
    trim: true,
  }) as string[][];

  const addresses: PublicKey[] = [];
  for (const row of records) {
    if (!row.length) continue;
    const value = row[0];
    if (!value || value.toLowerCase() === "address" || value.startsWith("#")) {
      continue;
    }
    addresses.push(new PublicKey(value));
  }
  return addresses;
}
