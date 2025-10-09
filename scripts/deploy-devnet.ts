#!/usr/bin/env ts-node

import { Command } from "commander";
import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import { Keypair } from "@solana/web3.js";
import { writeJson, resolvePath } from "./utils";

const program = new Command();
program
  .description("Build and deploy the tdl_presale program to a target cluster")
  .option("--cluster <name>", "Anchor provider cluster", "devnet")
  .option("--skip-build", "Skip anchor build before deploy", false)
  .option(
    "--idl-out <path>",
    "Path to copy generated IDL",
    "sdk/idl/tdl_presale.json"
  )
  .option(
    "--artifacts <dir>",
    "Directory for deployment artifacts",
    "artifacts"
  )
  .action(async (opts) => {
    const anchorEnv = {
      ...process.env,
      ANCHOR_PROVIDER_URL:
        process.env.ANCHOR_PROVIDER_URL ??
        clusterToRpc(opts.cluster ?? "devnet"),
    };

    if (!opts.skipBuild) {
      runCommand("anchor", ["build"], anchorEnv);
    }

    runCommand("anchor", ["deploy", "--provider.cluster", opts.cluster], anchorEnv);

    const idlPath = resolvePath("target/idl/tdl_presale.json");
    if (!fs.existsSync(idlPath)) {
      throw new Error(`IDL not found at ${idlPath}. Did the build succeed?`);
    }

    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
    const programId =
      idl.metadata?.address ??
      idl.address ??
      readProgramIdFromKeypair("target/deploy/tdl_presale-keypair.json");

    const artifactsDir = resolvePath(opts.artifacts ?? "artifacts");
    fs.mkdirSync(artifactsDir, { recursive: true });
    const artifactPath = path.join(
      artifactsDir,
      `addresses.${opts.cluster}.json`
    );

    const artifact = {
      programId,
      cluster: opts.cluster,
      deployedAt: new Date().toISOString(),
      idlPath: path.relative(process.cwd(), idlPath),
    };

    writeJson(artifactPath, artifact);
    console.log("Deployment artifacts written to", artifactPath);

    const idlOut = resolvePath(opts.idlOut);
    fs.copyFileSync(idlPath, idlOut);
    console.log("IDL synced to", idlOut);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});

function clusterToRpc(cluster: string): string {
  switch (cluster) {
    case "mainnet":
    case "mainnet-beta":
      return "https://api.mainnet-beta.solana.com";
    case "devnet":
      return "https://api.devnet.solana.com";
    case "testnet":
      return "https://api.testnet.solana.com";
    default:
      return cluster;
  }
}

function runCommand(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv
): void {
  console.log(`> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.status}`);
  }
}

function readProgramIdFromKeypair(file: string): string {
  const resolved = resolvePath(file);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Program keypair missing at ${resolved}`);
  }
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(resolved, "utf8")));
  return Keypair.fromSecretKey(secret).publicKey.toBase58();
}
