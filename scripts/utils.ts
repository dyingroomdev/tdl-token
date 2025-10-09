import { AnchorProvider, setProvider } from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import { Keypair, PublicKey } from "@solana/web3.js";

export function getProvider(): AnchorProvider {
  const provider = AnchorProvider.env();
  setProvider(provider);
  return provider;
}

export function loadKeypair(path: string): Keypair {
  const secret = JSON.parse(fs.readFileSync(path, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

export function parsePublicKey(value: string, field: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`Invalid ${field} public key`);
  }
}

export function ensureDirExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function resolvePath(p: string): string {
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}

export function writeJson(file: string, data: unknown): void {
  ensureDirExists(file);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function readJson<T = any>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}
