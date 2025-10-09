import "dotenv/config";
import { Command } from "commander";
import {
  AuthorityType,
  TOKEN_PROGRAM_ID,
  Token,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  Commitment,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import BN from "bn.js";
import fs from "fs";
import path from "path";

type MintSnapshot = {
  supply: string;
  decimals: number;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  isInitialized: boolean;
};

type AuditReport = {
  timestamp: string;
  network: string;
  rpcEndpoint: string;
  mint: string;
  expectedTokens: string;
  expectedBaseUnits: string;
  supplyMatches: boolean;
  before: MintSnapshot;
  after: MintSnapshot;
  actions: {
    mintAuthority: string | null;
    freezeAuthority: string | null;
  };
  notes: string[];
};

const DEFAULT_EXPECTED_SUPPLY = "1000000000"; // 1B tokens

const program = new Command();
program
  .option("--mint <address>", "SPL mint to inspect")
  .option("--network <cluster>", "solana cluster", "devnet")
  .option("--rpc <url>", "custom RPC endpoint")
  .option(
    "--expected-supply <tokens>",
    "expected circulating supply in base tokens",
    DEFAULT_EXPECTED_SUPPLY
  )
  .option(
    "--set-mint-authority <target>",
    'new mint authority pubkey or "none" to revoke'
  )
  .option(
    "--set-freeze-authority <target>",
    'new freeze authority pubkey or "none" to revoke'
  )
  .option(
    "--commitment <level>",
    "RPC commitment level",
    "confirmed"
  )
  .option(
    "--wallet <path>",
    "path to signer keypair",
    process.env.ANCHOR_WALLET ||
      process.env.SOLANA_WALLET ||
      path.join(process.env.HOME || ".", ".config/solana/id.json")
  )
  .option(
    "--addresses <path>",
    "path to addresses.json for defaults",
    path.join(__dirname, "../client/addresses.json")
  )
  .parse(process.argv);

const opts = program.opts();

function loadKeypair(filePath: string): Keypair {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Wallet file not found at ${filePath}`);
  }
  const secret = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Keypair.fromSecretKey(new Uint8Array(secret));
}

function resolveMintAddress(addressesPath: string, cliMint?: string): PublicKey {
  if (cliMint) {
    return new PublicKey(cliMint);
  }

  if (fs.existsSync(addressesPath)) {
    const data = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    if (data.mint) {
      return new PublicKey(data.mint);
    }
  }

  throw new Error(
    "Mint address not provided. Pass --mint or supply client/addresses.json with `mint` field."
  );
}

async function fetchMintSnapshot(
  connection: Connection,
  mint: PublicKey
): Promise<MintSnapshot> {
  const tokenClient = new Token(
    connection,
    mint,
    TOKEN_PROGRAM_ID,
    Keypair.generate()
  );
  const mintInfo = await tokenClient.getMintInfo();
  return {
    supply: mintInfo.supply.toString(),
    decimals: mintInfo.decimals,
    mintAuthority: mintInfo.mintAuthority
      ? mintInfo.mintAuthority.toBase58()
      : null,
    freezeAuthority: mintInfo.freezeAuthority
      ? mintInfo.freezeAuthority.toBase58()
      : null,
    isInitialized: mintInfo.isInitialized,
  };
}

async function maybeSetAuthority(
  connection: Connection,
  payer: Keypair | null,
  mint: PublicKey,
  snapshot: MintSnapshot,
  authorityType: AuthorityType,
  requestedTarget: string | undefined,
  label: "mintAuthority" | "freezeAuthority"
): Promise<{ action: string | null; updated: boolean }> {
  if (!requestedTarget) {
    return { action: null, updated: false };
  }

  if (!payer) {
    throw new Error(
      `Cannot update ${label} without a signer. Provide --wallet pointing to the current authority keypair.`
    );
  }

  const current =
    label === "mintAuthority" ? snapshot.mintAuthority : snapshot.freezeAuthority;
  const target =
    requestedTarget.toLowerCase() === "none"
      ? null
      : new PublicKey(requestedTarget).toBase58();

  if (current === target) {
    console.log(`No change for ${label}; already set to ${target ?? "none"}.`);
    return {
      action: `no-op (${target ?? "none"})`,
      updated: false,
    };
  }

  const authoritySigner =
    current === payer.publicKey.toBase58()
      ? payer
      : null;

  if (!authoritySigner) {
    throw new Error(
      `Cannot update ${label}: signer ${payer.publicKey.toBase58()} is not current authority (${current ?? "none"}).`
    );
  }

  const newAuthorityPubkey =
    requestedTarget.toLowerCase() === "none"
      ? null
      : new PublicKey(requestedTarget);

  const transaction = new Transaction().add(
    Token.createSetAuthorityInstruction(
      TOKEN_PROGRAM_ID,
      mint,
      newAuthorityPubkey,
      authorityType,
      payer.publicKey,
      []
    )
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer]
  );

  console.log(
    `Updated ${label} to ${newAuthorityPubkey ? newAuthorityPubkey.toBase58() : "none"} (tx: ${signature}).`
  );

  return {
    action: `set to ${newAuthorityPubkey ? newAuthorityPubkey.toBase58() : "none"} (tx ${signature})`,
    updated: true,
  };
}

function toBaseUnits(tokens: string, decimals: number): string {
  const base = new BN(tokens);
  const scale = new BN(10).pow(new BN(decimals));
  return base.mul(scale).toString();
}

async function main() {
  const commitment = opts.commitment as Commitment;
  let rpcEndpoint: string;
  if (opts.rpc) {
    rpcEndpoint = opts.rpc;
  } else if (opts.network === "custom") {
    throw new Error("Custom network selected but no --rpc endpoint provided.");
  } else {
    rpcEndpoint = clusterApiUrl(opts.network);
  }

  const connection = new Connection(rpcEndpoint, commitment);
  const mint = resolveMintAddress(opts.addresses, opts.mint);
  const needsSigner = Boolean(
    opts.setMintAuthority || opts.setFreezeAuthority
  );
  const payer = needsSigner ? loadKeypair(path.resolve(opts.wallet)) : null;

  console.log("=== Mint Hardening Audit ===");
  console.log("Network:", opts.network);
  console.log("RPC:", rpcEndpoint);
  console.log("Mint:", mint.toBase58());

  const before = await fetchMintSnapshot(connection, mint);
  console.log("Current mint authority:", before.mintAuthority ?? "none");
  console.log("Current freeze authority:", before.freezeAuthority ?? "none");
  console.log("Supply:", before.supply);
  console.log("Decimals:", before.decimals);

  const expectedTokens = opts.expectedSupply;
  const expectedBaseUnits = toBaseUnits(expectedTokens, before.decimals);
  const supplyMatches = before.supply === expectedBaseUnits;

  if (!supplyMatches) {
    console.warn(
      `Warning: supply mismatch. Expected ${expectedBaseUnits}, found ${before.supply}.`
    );
  } else {
    console.log("Supply matches expected allocation.");
  }

  const notes: string[] = [];

  if (before.mintAuthority) {
    notes.push(
      "Mint authority present. Consider revoking (`--set-mint-authority none`) once allocations complete."
    );
  } else {
    notes.push("Mint authority already revoked.");
  }

  if (before.freezeAuthority) {
    notes.push(
      `Freeze authority set to ${before.freezeAuthority}. Ensure it is a trusted multisig or revoke if not needed.`
    );
  } else {
    notes.push("Freeze authority not set.");
  }

  const mintAuthorityResult = await maybeSetAuthority(
    connection,
    payer,
    mint,
    before,
    "MintTokens",
    opts.setMintAuthority,
    "mintAuthority"
  );

  const freezeAuthorityResult = await maybeSetAuthority(
    connection,
    payer,
    mint,
    before,
    "FreezeAccount",
    opts.setFreezeAuthority,
    "freezeAuthority"
  );

  const after = mintAuthorityResult.updated || freezeAuthorityResult.updated
    ? await fetchMintSnapshot(connection, mint)
    : before;

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    network: opts.network,
    rpcEndpoint,
    mint: mint.toBase58(),
    expectedTokens,
    expectedBaseUnits,
    supplyMatches,
    before,
    after,
    actions: {
      mintAuthority: mintAuthorityResult.action,
      freezeAuthority: freezeAuthorityResult.action,
    },
    notes,
  };

  const artifactsDir = path.join(process.cwd(), "artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  const reportPath = path.join(artifactsDir, "mint_audit.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Audit report written to ${reportPath}`);
}

main().catch((error) => {
  console.error("Mint hardening audit failed:", error);
  process.exit(1);
});
