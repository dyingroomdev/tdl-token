import {
  AnchorProvider,
  BN,
  Wallet as AnchorWallet,
  web3,
} from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { TdlPresaleClient } from "@sdk/presaleClient";
import { computeClaimableAmount } from "../utils/claimable";
import { APP_CONFIG } from "../config";
import { PublicKey } from "@solana/web3.js";

type PresaleStateLite = {
  raw: any;
  priceNumerator: BN;
  priceDenominator: BN;
  softCap: BN;
  hardCap: BN;
  collected: BN;
  totalAllocated: BN;
  fundsWithdrawn: BN;
  walletMin: BN;
  walletMax: BN;
  buyCooldownSeconds: number;
  payMintDecimals: number;
  payMintSymbol: string;
  tdlDecimals: number;
  startTs: number;
  endTs: number;
  tgeBps: number;
  cliffSeconds: number;
  vestingSeconds: number;
  whitelistEnabled: boolean;
  whitelistRoot: number[];
  guardEnabled: boolean;
  guardAuthority: PublicKey | null;
  isPaused: boolean;
  payVault: PublicKey;
};

type PresaleContextValue = {
  client: TdlPresaleClient | null;
  state: PresaleStateLite | null;
  position: any | null;
  claimable: BN;
  loadingState: boolean;
  loadingPosition: boolean;
  refresh: () => Promise<void>;
  buy: (amount: BN, minExpectedTdl: BN, proof?: number[][]) => Promise<void>;
  claim: () => Promise<void>;
};

const PresaleContext = createContext<PresaleContextValue | null>(null);

const READ_ONLY_WALLET: AnchorWallet = {
  publicKey: new web3.PublicKey("11111111111111111111111111111111"),
  signTransaction: async () => {
    throw new Error("Wallet not connected");
  },
  signAllTransactions: async () => {
    throw new Error("Wallet not connected");
  },
};

type Props = {
  children: ReactNode;
};

export const PresaleProvider = ({ children }: Props) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [client, setClient] = useState<TdlPresaleClient | null>(null);
  const [state, setState] = useState<PresaleStateLite | null>(null);
  const [position, setPosition] = useState<any | null>(null);
  const [loadingState, setLoadingState] = useState(true);
  const [loadingPosition, setLoadingPosition] = useState(false);
  const [claimable, setClaimable] = useState(new BN(0));

  useEffect(() => {
    const walletImpl = wallet.connected && wallet.publicKey && wallet.signAllTransactions
      ? {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction!,
          signAllTransactions: wallet.signAllTransactions!,
        }
      : READ_ONLY_WALLET;

    const provider = new AnchorProvider(connection, walletImpl, {
      commitment: "processed",
    });
    setClient(new TdlPresaleClient(provider, APP_CONFIG.programId));
  }, [connection, wallet.connected, wallet.publicKey, wallet.signAllTransactions, wallet.signTransaction]);

  const fetchState = useCallback(async () => {
    if (!client) return;
    setLoadingState(true);
    try {
      const account = await client.fetchState(APP_CONFIG.state);
      const whitelistRoot = account.whitelistRoot ?? account.whitelist_root ?? new Array(32).fill(0);
      const buyCooldown = account.buyCooldownSeconds ?? account.buy_cooldown_seconds;
      const guardAuthority = account.guardAuthority ?? account.guard_authority ?? null;
      const guardEnabled = account.guardEnabled ?? account.guard_enabled ?? false;
      const isPaused = account.isPaused ?? account.is_paused ?? false;
      const cliffSeconds = toNumber(account.cliffSeconds ?? account.cliff_seconds);
      const vestingSeconds = toNumber(account.vestingSeconds ?? account.vesting_seconds);
      const startTs = toNumber(account.startTs ?? account.start_ts);
      const endTs = toNumber(account.endTs ?? account.end_ts);
      const walletMin = account.walletMin ?? account.wallet_min;
      const walletMax = account.walletMax ?? account.wallet_max;
      const softCap = toBN(account.softCap ?? account.soft_cap ?? 0);
      const hardCap = toBN(account.hardCap ?? account.hard_cap ?? 0);
      const collected = toBN(account.collected ?? 0);
      const totalAllocated = toBN(account.totalAllocated ?? account.total_allocated ?? 0);
      const fundsWithdrawn = toBN(account.fundsWithdrawn ?? account.funds_withdrawn ?? 0);
      const payVault = account.payVault ?? account.pay_vault;

      setState({
        raw: account,
        priceNumerator: toBN(account.priceNumerator ?? account.price_numerator ?? 0),
        priceDenominator: toBN(account.priceDenominator ?? account.price_denominator ?? 1),
        softCap: softCap,
        hardCap: hardCap,
        collected,
        totalAllocated,
        fundsWithdrawn,
        walletMin: toBN(walletMin ?? 0),
        walletMax: toBN(walletMax ?? 0),
        buyCooldownSeconds: toNumber(buyCooldown),
        payMintDecimals: account.payMintDecimals,
        payMintSymbol: APP_CONFIG.payMintSymbol,
        tdlDecimals: 9,
        startTs,
        endTs,
        tgeBps: account.tgeBps ?? account.tge_bps ?? 0,
        cliffSeconds,
        vestingSeconds,
        whitelistEnabled: account.whitelistEnabled ?? account.whitelist_enabled ?? false,
        whitelistRoot,
        guardEnabled,
        guardAuthority,
        isPaused,
        payVault,
      });
    } finally {
      setLoadingState(false);
    }
  }, [client]);

  const fetchPosition = useCallback(async () => {
    if (!client || !wallet.publicKey) {
      setPosition(null);
      setClaimable(new BN(0));
      return;
    }
    setLoadingPosition(true);
    try {
      const positionPda = TdlPresaleClient.deriveBuyerPosition(
        APP_CONFIG.state,
        wallet.publicKey
      );
      const account = await (client.program.account as any).buyerPosition.fetchNullable(
        positionPda
      );
      setPosition(account);
      if (account && state) {
        const claimableAmount = computeClaimableAmount(state.raw, account, Math.floor(Date.now() / 1000));
        setClaimable(claimableAmount);
      } else {
        setClaimable(new BN(0));
      }
    } catch {
      setPosition(null);
      setClaimable(new BN(0));
    } finally {
      setLoadingPosition(false);
    }
  }, [client, wallet.publicKey, state]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  useEffect(() => {
    if (!state || !position) return;
    const amount = computeClaimableAmount(
      state.raw,
      position,
      Math.floor(Date.now() / 1000)
    );
    setClaimable(amount);
  }, [state, position]);

  useEffect(() => {
    if (!state || !position) return;
    const interval = setInterval(() => {
      const amount = computeClaimableAmount(
        state.raw,
        position,
        Math.floor(Date.now() / 1000)
      );
      setClaimable(amount);
    }, 15000);
    return () => clearInterval(interval);
  }, [state, position]);

  const refresh = useCallback(async () => {
    await fetchState();
    await fetchPosition();
  }, [fetchState, fetchPosition]);

  const buy = useCallback(
    async (amount: BN, minExpectedTdl: BN, proof?: number[][]) => {
      if (!client || !wallet.connected || !wallet.publicKey) {
        throw new Error("Connect a wallet to buy.");
      }
      const buyerWallet = client.program.provider.wallet as AnchorWallet;
      await client.buy({
        buyer: buyerWallet,
        state: APP_CONFIG.state,
        payMint: APP_CONFIG.payMint,
        guard: null,
        args: {
          payAmount: amount,
          minExpectedTdl,
          merkleProof: proof ?? [],
        },
      });
      await refresh();
    },
    [client, wallet, refresh]
  );

  const claim = useCallback(async () => {
    if (!client || !wallet.connected || !wallet.publicKey) {
      throw new Error("Connect a wallet to claim.");
    }
    const buyerWallet = client.program.provider.wallet as AnchorWallet;
    await client.claim({
      buyer: buyerWallet,
      state: APP_CONFIG.state,
      tdlMint: APP_CONFIG.tdlMint,
    });
    await refresh();
  }, [client, wallet, refresh]);

  const value = useMemo<PresaleContextValue>(
    () => ({
      client,
      state,
      position,
      claimable,
      loadingState,
      loadingPosition,
      refresh,
      buy,
      claim,
    }),
    [client, state, position, claimable, loadingState, loadingPosition, refresh, buy, claim]
  );

  return <PresaleContext.Provider value={value}>{children}</PresaleContext.Provider>;
};

export const usePresaleContext = () => {
  const context = useContext(PresaleContext);
  if (!context) {
    throw new Error("usePresaleContext must be used within a PresaleProvider");
  }
  return context;
};

function toNumber(value: any): number {
  if (typeof value === "number") return value;
  if (value instanceof BN) return value.toNumber();
  if (value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  if (typeof value === "string") return Number(value);
  return 0;
}

function toBN(value: any): BN {
  if (value instanceof BN) return value;
  if (typeof value === "string") return new BN(value);
  if (typeof value === "number") return new BN(value);
  if (value && typeof value.toString === "function") {
    return new BN(value.toString());
  }
  return new BN(0);
}
