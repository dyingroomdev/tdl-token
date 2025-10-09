import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePresale } from "../../hooks/usePresale";
import { formatAmount } from "../../utils/format";
import { Alert } from "../ui/Alert";

export const ClaimPanel = () => {
  const wallet = useWallet();
  const { position, claimable, claim, loadingState, state } = usePresale();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const isDisabled = !wallet.connected || loadingState || claimable.isZero();

  if (!state) {
    return null;
  }

  const purchased = position
    ? formatAmount(position.purchased, state.tdlDecimals, "TDL")
    : "--";
  const claimed = position
    ? formatAmount(position.claimed, state.tdlDecimals, "TDL")
    : "--";
  const claimableDisplay = formatAmount(claimable, state.tdlDecimals, "TDL");

  const handleClaim = async () => {
    if (!wallet.connected) {
      setStatus({ type: "error", message: "Connect your wallet first." });
      return;
    }
    try {
      await claim();
      setStatus({
        type: "success",
        message: `Successfully claimed ${claimableDisplay}`,
      });
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error?.message ?? "Claim failed.",
      });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-brand-900/10">
      <h2 className="text-lg font-semibold text-slate-200">Claim Tokens</h2>
      <p className="mt-1 text-sm text-slate-400">
        Claim vested TDL tokens as they become available according to the release schedule.
      </p>

      {status && (
        <Alert className="mt-4" variant={status.type}>
          {status.message}
        </Alert>
      )}

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total Purchased" value={purchased} />
        <Stat label="Claimed" value={claimed} />
        <Stat label="Currently Claimable" value={claimableDisplay} emphasize />
      </dl>

      <button
        onClick={handleClaim}
        disabled={isDisabled}
        className="mt-6 w-full rounded-lg border border-brand-500/40 bg-brand-500/10 px-4 py-3 font-semibold text-brand-200 transition hover:bg-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Claim Tokens
      </button>
      {!wallet.connected && (
        <p className="mt-2 text-xs text-slate-500">
          Connect your wallet to view claimable balances.
        </p>
      )}
    </div>
  );
};

type StatProps = {
  label: string;
  value: string;
  emphasize?: boolean;
};

const Stat = ({ label, value, emphasize }: StatProps) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p
      className={`mt-2 text-lg font-semibold ${
        emphasize ? "text-brand-300" : "text-slate-100"
      }`}
    >
      {value}
    </p>
  </div>
);
