import { BN } from "@coral-xyz/anchor";
import { formatAmount, formatDateTime } from "../../utils/format";
import { usePresale } from "../../hooks/usePresale";

export const StatusCard = () => {
  const { state, loadingState } = usePresale();

  if (loadingState || !state) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-brand-900/10">
        <h2 className="text-lg font-semibold text-slate-200">Sale Status</h2>
        <p className="mt-4 text-sm text-slate-400">Loading presale data…</p>
      </div>
    );
  }

  const collected = formatAmount(state.collected, state.payMintDecimals, state.payMintSymbol);
  const hardCap = formatAmount(state.hardCap, state.payMintDecimals, state.payMintSymbol);
  const softCap = formatAmount(state.softCap, state.payMintDecimals, state.payMintSymbol);
  const progress = state.hardCap.isZero()
    ? 0
    : Math.min(
        100,
        Number(state.collected.muln(100).div(state.hardCap).toString())
      );

  const now = Math.floor(Date.now() / 1000);
  const hasStarted = now >= state.startTs;
  const hasEnded = now > state.endTs;
  const status = hasEnded ? "Ended" : hasStarted ? "Live" : "Upcoming";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-brand-900/10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-200">Sale Status</h2>
          <p className="mt-1 text-sm text-slate-400">Real-time presale metrics.</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            status === "Live"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : status === "Ended"
              ? "border-slate-600 bg-slate-800 text-slate-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-200"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Progress</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {collected} / {hardCap}
          </p>
          <div className="mt-2 h-2 rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Soft cap: {softCap} {state.payMintSymbol}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Schedule (UTC)
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Start: {formatDateTime(state.startTs)}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            End: {formatDateTime(state.endTs)}
          </p>
          {!hasEnded && hasStarted && (
            <p className="mt-3 text-xs text-slate-500">
              Time remaining: {formatCountdown(state.endTs - now)}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Settings</p>
          <dl className="mt-2 space-y-2 text-sm text-slate-300">
            <div className="flex justify-between">
              <dt>Whitelist</dt>
              <dd>{state.whitelistEnabled ? "Enabled" : "Disabled"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Trading Pause</dt>
              <dd>{state.isPaused ? "Paused" : "Active"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Price</dt>
              <dd>
                {state.priceNumerator.toString()} /{" "}
                {state.priceDenominator.toString()} (
                {formatPrice(state.priceNumerator, state.priceDenominator)} {state.payMintSymbol}{" "}
                per TDL)
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

function formatCountdown(secondsRemaining: number) {
  if (secondsRemaining <= 0) return "Completed";
  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function formatPrice(numerator: BN, denominator: BN) {
  if (numerator.isZero()) return "0";
  const price = denominator.toNumber() / numerator.toNumber();
  return price.toLocaleString(undefined, { minimumFractionDigits: 4 });
}
