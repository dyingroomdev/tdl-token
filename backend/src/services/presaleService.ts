import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { TdlPresaleClient } from "../../sdk/presaleClient";
import { getProvider } from "./solanaProvider";
import { config } from "../config";
import { computeMerkleArtifacts } from "../utils/merkle";

const provider = getProvider();
const presaleClient = new TdlPresaleClient(provider, config.presaleProgramId);

export async function fetchPresaleStatus() {
  const state = await presaleClient.fetchState(config.presaleState);
  return {
    admin: state.admin.toBase58(),
    collected: state.collected.toString(),
    softCap: state.softCap.toString(),
    hardCap: state.hardCap.toString(),
    walletMin: state.walletMin.toString(),
    walletMax: state.walletMax.toString(),
    startTs: state.startTs.toNumber(),
    endTs: state.endTs.toNumber(),
    whitelistEnabled: state.whitelistEnabled,
    guardEnabled: state.guardEnabled,
    isPaused: state.isPaused,
  };
}

export async function togglePause(paused: boolean, admin: PublicKey) {
  const methods = presaleClient.program.methods as any;
  const method = paused ? methods.pause() : methods.unpause();
  await method
    .accounts({
      admin,
      state: config.presaleState,
    })
    .rpc();
}

export async function updateWhitelistRoot(addresses: PublicKey[], admin: PublicKey) {
  const { root } = computeMerkleArtifacts(addresses);
  const current = await presaleClient.fetchState(config.presaleState);
  const serialized = presaleClient.serializeConfig({
    priceNumerator: current.priceNumerator,
    priceDenominator: current.priceDenominator,
    softCap: current.softCap,
    hardCap: current.hardCap,
    walletMin: current.walletMin,
    walletMax: current.walletMax,
    startTs: current.startTs,
    endTs: current.endTs,
    tgeBps: current.tgeBps,
    cliffSeconds: current.cliffSeconds,
    vestingSeconds: current.vestingSeconds,
    whitelistEnabled: true,
    whitelistRoot: root,
    buyCooldownSeconds: current.buyCooldownSeconds,
    guardAuthority: current.guardEnabled ? current.guardAuthority : null,
  });

  await (presaleClient.program.methods as any)
    .setConfig(serialized)
    .accounts({
      admin,
      state: config.presaleState,
      whitelist: TdlPresaleClient.deriveWhitelist(config.presaleState),
    })
    .rpc();
}

export async function withdrawFunds(amount: BN, admin: PublicKey, destination: PublicKey) {
  await (presaleClient.program.methods as any)
    .withdrawFunds(amount)
    .accounts({
      admin,
      state: config.presaleState,
      vault_authority: TdlPresaleClient.deriveVaultAuthority(config.presaleState),
      pay_vault: (await presaleClient.fetchState(config.presaleState)).payVault,
      destination,
      token_program: config.tokenProgramId ?? new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    })
    .rpc();
}
