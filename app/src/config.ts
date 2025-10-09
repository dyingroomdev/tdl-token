import { PublicKey, clusterApiUrl } from "@solana/web3.js";
import { TdlPresaleClient } from "@sdk/presaleClient";

const network = (import.meta.env.VITE_NETWORK ?? "devnet") as
  | "devnet"
  | "testnet"
  | "mainnet-beta";
const rpcEndpoint =
  import.meta.env.VITE_RPC_ENDPOINT ?? clusterApiUrl(network);

function requireEnv(name: string) {
  const value = import.meta.env[name] as string | undefined;
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

const programId = new PublicKey(
  requireEnv("VITE_PRESALE_PROGRAM_ID")
);
const state = new PublicKey(requireEnv("VITE_PRESALE_STATE"));
const tdlMint = new PublicKey(requireEnv("VITE_TDL_MINT"));
const payMint = new PublicKey(requireEnv("VITE_PAY_MINT"));

export const APP_CONFIG = {
  network,
  rpcEndpoint,
  programId,
  state,
  tdlMint,
  payMint,
  payMintSymbol: import.meta.env.VITE_PAY_SYMBOL ?? "USDC",
  authority: new PublicKey(requireEnv("VITE_PRESALE_AUTHORITY")),
  treasury: import.meta.env.VITE_TREASURY_TOKEN_ACCOUNT ?? "",
  whitelist: TdlPresaleClient.deriveWhitelist(state),
  vaultAuthority: TdlPresaleClient.deriveVaultAuthority(state),
};
