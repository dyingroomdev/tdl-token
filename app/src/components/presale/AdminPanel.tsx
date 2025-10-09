import { FormEvent, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { BN, web3 } from "@coral-xyz/anchor";
import { usePresale } from "../../hooks/usePresale";
import { formatAmount } from "../../utils/format";
import { parseAmountToBN } from "../../utils/units";
import { Alert } from "../ui/Alert";
import { computeWhitelistRoot } from "../../utils/whitelist";
import { APP_CONFIG } from "../../config";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

type PanelStatus = { type: "success" | "error"; message: string } | null;

export const AdminPanel = () => {
  const wallet = useWallet();
  const { state, refresh, client } = usePresale();
  const [status, setStatus] = useState<PanelStatus>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [destination, setDestination] = useState(APP_CONFIG.treasury ?? "");
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<PanelStatus>(null);

  const isAdmin = wallet.publicKey?.equals(APP_CONFIG.authority);

  const whitelistStateLabel = useMemo(
    () => (state?.whitelistEnabled ? "Enabled" : "Disabled"),
    [state]
  );

  const availableBalance = useMemo(() => {
    if (!state) return new BN(0);
    const diff = state.collected.sub(state.fundsWithdrawn);
    return diff.isNeg() ? new BN(0) : diff;
  }, [state]);

  if (!state) {
    return null;
  }

  const handlePauseToggle = async (shouldPause: boolean) => {
    if (!client || !wallet.publicKey) {
      setStatus({ type: "error", message: "Connect an admin wallet first." });
      return;
    }
    try {
      const methods = client.program.methods as any;
      const method = shouldPause ? methods.pause() : methods.unpause();
      await method
        .accounts({
          admin: wallet.publicKey,
          state: APP_CONFIG.state,
        })
        .rpc();
      await refresh();
      setStatus({
        type: "success",
        message: shouldPause ? "Sale paused." : "Sale resumed.",
      });
    } catch (error: any) {
      setStatus({ type: "error", message: error?.message ?? "Operation failed." });
    }
  };

  const handleWithdraw = async (event: FormEvent) => {
    event.preventDefault();
    if (!client || !wallet.publicKey) {
      setStatus({ type: "error", message: "Connect an admin wallet first." });
      return;
    }
    try {
      const amountBn = parseAmountToBN(withdrawAmount, state.payMintDecimals);
      if (!destination) {
        throw new Error("Destination token account required");
      }
      await (client.program.methods as any)
        .withdrawFunds(amountBn)
        .accounts({
          admin: wallet.publicKey,
          state: APP_CONFIG.state,
          vault_authority: APP_CONFIG.vaultAuthority,
          pay_vault: state.payVault,
          destination: new web3.PublicKey(destination),
          token_program: TOKEN_PROGRAM_ID,
        })
        .rpc();
      await refresh();
      setStatus({
        type: "success",
        message: `Withdrawn ${withdrawAmount} ${state.payMintSymbol}.`,
      });
      setWithdrawAmount("");
    } catch (error: any) {
      setStatus({ type: "error", message: error?.message ?? "Withdrawal failed." });
    }
  };

  const handleWhitelistToggle = async (enabled: boolean) => {
    if (!client || !wallet.publicKey) return;
    try {
      const config = stateToConfig(state);
      config.whitelist_enabled = enabled;
      await (client.program.methods as any)
        .setConfig(config)
        .accounts({
          admin: wallet.publicKey,
          state: APP_CONFIG.state,
          whitelist: APP_CONFIG.whitelist,
        })
        .rpc();
      await refresh();
      setStatus({
        type: "success",
        message: `Whitelist ${enabled ? "enabled" : "disabled"}.`,
      });
    } catch (error: any) {
      setStatus({ type: "error", message: error?.message ?? "Toggle failed." });
    }
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvContent(text);
    setUploadStatus({
      type: "success",
      message: "CSV loaded. Review and publish to update whitelist root.",
    });
  };

  const handlePublishWhitelist = async () => {
    if (!client || !wallet.publicKey || !csvContent) {
      setUploadStatus({
        type: "error",
        message: "Upload a CSV and connect an admin wallet.",
      });
      return;
    }
    try {
      const addresses = csvContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.toLowerCase() !== "address")
        .map((value) => new web3.PublicKey(value));
      const { root } = computeWhitelistRoot(addresses);
      const config = stateToConfig(state);
      config.whitelist_root = root;
      config.whitelist_enabled = true;
      await (client.program.methods as any)
        .setConfig(config)
        .accounts({
          admin: wallet.publicKey,
          state: APP_CONFIG.state,
          whitelist: APP_CONFIG.whitelist,
        })
        .rpc();
      await refresh();
      setUploadStatus({
        type: "success",
        message: `Whitelist updated with ${addresses.length} entries.`,
      });
    } catch (error: any) {
      setUploadStatus({
        type: "error",
        message: error?.message ?? "Whitelist update failed.",
      });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-brand-900/10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-200">Admin Controls</h2>
          <p className="mt-1 text-sm text-slate-400">
            Manage sale parameters, whitelist, and treasury actions. Requires admin wallet.
          </p>
        </div>
        {!isAdmin && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200">
            Limited Access
          </span>
        )}
      </div>

      {status && (
        <Alert className="mt-4" variant={status.type}>
          {status.message}
        </Alert>
      )}

      <section className="mt-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Sale Controls
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-brand-500 hover:text-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => handlePauseToggle(true)}
            disabled={!isAdmin}
          >
            Pause Sale
          </button>
          <button
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => handlePauseToggle(false)}
            disabled={!isAdmin}
          >
            Resume Sale
          </button>
          <button
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-amber-500 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => handleWhitelistToggle(!state.whitelistEnabled)}
            disabled={!isAdmin}
          >
            {state.whitelistEnabled ? "Disable Whitelist" : "Enable Whitelist"}
          </button>
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs text-slate-400">
            Current whitelist status: <strong>{whitelistStateLabel}</strong>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Withdraw Raised Funds
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Available balance: {formatAmount(
            availableBalance,
            state.payMintDecimals,
            state.payMintSymbol
          )}
        </p>
        <form className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]" onSubmit={handleWithdraw}>
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500">
                Amount ({state.payMintSymbol})
              </label>
              <input
                type="text"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={!isAdmin}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500">
                Destination Token Account
              </label>
              <input
                type="text"
                placeholder="Enter USDC treasury token account"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={!isAdmin}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isAdmin}
            >
              Withdraw
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Whitelist Import
          </h3>
          <p className="text-xs text-slate-500">Upload CSV with one wallet per line.</p>
        </div>
        {uploadStatus && (
          <Alert className="mt-3" variant={uploadStatus.type}>
            {uploadStatus.message}
          </Alert>
        )}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            disabled={!isAdmin}
            className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-400"
          />
          <button
            type="button"
            onClick={handlePublishWhitelist}
            disabled={!isAdmin || !csvContent}
            className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-200 transition hover:bg-brand-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Publish Whitelist Root
          </button>
        </div>
      </section>
    </div>
  );
};

function stateToConfig(state: ReturnType<typeof usePresale>["state"]) {
  if (!state) {
    throw new Error("State unavailable");
  }
  return {
    price_numerator: state.priceNumerator,
    price_denominator: state.priceDenominator,
    soft_cap: state.softCap,
    hard_cap: state.hardCap,
    wallet_min: state.walletMin,
    wallet_max: state.walletMax,
    start_ts: new BN(state.startTs),
    end_ts: new BN(state.endTs),
    tge_bps: state.tgeBps,
    cliff_seconds: new BN(state.cliffSeconds),
    vesting_seconds: new BN(state.vestingSeconds),
    whitelist_enabled: state.whitelistEnabled,
    whitelist_root: state.whitelistRoot,
    buy_cooldown_seconds: new BN(state.buyCooldownSeconds),
    guard_authority: state.guardEnabled ? state.guardAuthority : null,
  };
}
