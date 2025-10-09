import { FormEvent, useMemo, useState } from "react";
import { BN } from "@coral-xyz/anchor";
import { usePresale } from "../../hooks/usePresale";
import { useApi } from "../../providers/ApiProvider";
import { PresaleApi } from "../../api/presale";
import { formatAmount } from "../../utils/format";
import { parseAmountToBN } from "../../utils/units";
import { APP_CONFIG } from "../../config";
import { Alert } from "../ui/Alert";

type PanelStatus = { type: "success" | "error" | "info"; message: string } | null;

export const AdminPanel = () => {
  const { apiKey } = useApi();
  const { state, refresh } = usePresale();

  const [status, setStatus] = useState<PanelStatus>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [destination, setDestination] = useState(APP_CONFIG.treasury ?? "");
  const [whitelistFile, setWhitelistFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ count: number; root: number[] } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<PanelStatus>(null);

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
    return (
      <Alert variant="info" className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        Loading presale data...
      </Alert>
    );
  }

  const requireApiKey = () => {
    if (!apiKey) {
      setStatus({ type: "error", message: "Set API key to use backend controls." });
      return false;
    }
    return true;
  };

  const handlePauseToggle = async (shouldPause: boolean) => {
    if (!requireApiKey()) return;
    try {
      await PresaleApi.pause(shouldPause);
      await refresh();
      setStatus({
        type: "success",
        message: shouldPause ? "Sale paused via backend." : "Sale resumed.",
      });
    } catch (error: any) {
      setStatus({ type: "error", message: error?.message ?? "Operation failed." });
    }
  };

  const handleWithdraw = async (event: FormEvent) => {
    event.preventDefault();
    if (!requireApiKey()) return;
    try {
      const amountBn = parseAmountToBN(withdrawAmount, state.payMintDecimals);
      if (!destination) {
        throw new Error("Destination token account required");
      }
      await PresaleApi.withdraw(amountBn, destination);
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

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!requireApiKey()) return;
    try {
      const previewResponse = await PresaleApi.whitelistPreview(file);
      setWhitelistFile(file);
      setPreview({ count: previewResponse.count, root: previewResponse.root });
      setUploadStatus({
        type: "success",
        message: `Preview ready – ${previewResponse.count} wallets detected.`,
      });
    } catch (error: any) {
      setUploadStatus({ type: "error", message: error?.message ?? "Preview failed." });
    }
  };

  const handlePublishWhitelist = async () => {
    if (!whitelistFile) {
      setUploadStatus({ type: "error", message: "Upload a CSV first." });
      return;
    }
    if (!requireApiKey()) return;
    try {
      await PresaleApi.whitelistApply(whitelistFile);
      await refresh();
      setUploadStatus({ type: "success", message: "Whitelist root published." });
      setWhitelistFile(null);
      setPreview(null);
    } catch (error: any) {
      setUploadStatus({ type: "error", message: error?.message ?? "Whitelist update failed." });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-brand-900/10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-200">Admin Controls</h2>
          <p className="mt-1 text-sm text-slate-400">
            Manage sale parameters, whitelist, and treasury actions via the backend service.
          </p>
        </div>
        {!apiKey && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200">
            API Key Required
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
            disabled={!apiKey}
          >
            Pause Sale
          </button>
          <button
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => handlePauseToggle(false)}
            disabled={!apiKey}
          >
            Resume Sale
          </button>
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs text-slate-400">
            Whitelist: <strong>{whitelistStateLabel}</strong>
          </div>
          <Alert variant="info" className="border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs text-slate-400">
            Direct enable/disable will be exposed once backend config endpoints land.
          </Alert>
        </div>
      </section>

      <section className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Withdraw Raised Funds
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Available balance: {formatAmount(availableBalance, state.payMintDecimals, state.payMintSymbol)}
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
                disabled={!apiKey}
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
                disabled={!apiKey}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!apiKey}
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
        {preview && (
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs text-slate-400">
            <p>Detected wallets: {preview.count}</p>
            <p className="break-all text-slate-500">Root: {preview.root.map((b) => b.toString(16).padStart(2, "0")).join("")}</p>
          </div>
        )}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            disabled={!apiKey}
            className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-400"
          />
          <button
            type="button"
            onClick={handlePublishWhitelist}
            disabled={!apiKey || !whitelistFile}
            className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-200 transition hover:bg-brand-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Publish Whitelist Root
          </button>
        </div>
      </section>
    </div>
  );
};
