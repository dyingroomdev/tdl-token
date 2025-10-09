import { FormEvent, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePresale } from "../../hooks/usePresale";
import { formatAmount } from "../../utils/format";
import { parseAmountToBN } from "../../utils/units";
import { Alert } from "../ui/Alert";

export const BuyPanel = () => {
  const wallet = useWallet();
  const { state, buy, loadingState } = usePresale();
  const [amount, setAmount] = useState("");
  const [merkleProof, setMerkleProof] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const isDisabled = !wallet.connected || !state || loadingState;

  const expectedTokens = useMemo(() => {
    if (!state || !amount) return "0";
    try {
      const pay = parseFloat(amount);
      if (Number.isNaN(pay)) return "0";
      const tokens = (pay * state.priceDenominator.toNumber()) / state.priceNumerator.toNumber();
      return tokens.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } catch {
      return "0";
    }
  }, [state, amount]);

  const minContribution = useMemo(() => {
    if (!state) return "--";
    return formatAmount(state.walletMin, state.payMintDecimals, state.payMintSymbol);
  }, [state]);

  const maxContribution = useMemo(() => {
    if (!state) return "--";
    return formatAmount(state.walletMax, state.payMintDecimals, state.payMintSymbol);
  }, [state]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!state) return;
    if (!wallet.connected) {
      setStatus({ type: "error", message: "Connect a wallet to participate." });
      return;
    }
    try {
      const payAmount = parseAmountToBN(amount, state.payMintDecimals);
      const minExpectedTdl = payAmount.mul(state.priceDenominator).div(state.priceNumerator);
      const proof =
        merkleProof.trim().length === 0
          ? undefined
          : (JSON.parse(merkleProof) as number[][]);
      await buy(payAmount, minExpectedTdl, proof);
      setStatus({
        type: "success",
        message: `Purchase successful! You contributed ${amount} ${state.payMintSymbol}.`,
      });
      setAmount("");
      setMerkleProof("");
    } catch (error: any) {
      const message = error?.message ?? "Purchase failed.";
      setStatus({ type: "error", message });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-brand-900/10">
      <h2 className="text-lg font-semibold text-slate-200">Buy Allocation</h2>
      <p className="mt-1 text-sm text-slate-400">
        Participate in the presale by contributing {state?.payMintSymbol ?? "USDC"}.
      </p>

      {!wallet.connected && (
        <Alert className="mt-4" variant="warning">
          Connect a wallet to continue.
        </Alert>
      )}

      {status && (
        <Alert className="mt-4" variant={status.type}>
          {status.message}
        </Alert>
      )}

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">
            Contribution Amount ({state?.payMintSymbol ?? "USDC"})
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isDisabled}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-lg font-medium text-slate-100 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50"
          />
          <p className="mt-2 text-xs text-slate-500">
            Min: {minContribution} • Max: {maxContribution}
          </p>
        </div>

        {state?.whitelistEnabled && (
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">
              Merkle Proof (JSON array)
            </label>
            <textarea
              className="mt-2 h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50"
              placeholder='Optional proof if whitelisting is enabled. Example: ["ae..", "12.."]'
              value={merkleProof}
              onChange={(e) => setMerkleProof(e.target.value)}
              disabled={isDisabled}
            />
            <p className="mt-1 text-xs text-slate-500">
              Paste the JSON array provided by the team if whitelist mode is active.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Expected TDL Allocation</span>
            <span className="font-semibold text-slate-100">{expectedTokens} TDL</span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand-500 px-4 py-3 font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isDisabled}
        >
          {wallet.connected ? "Confirm Contribution" : "Connect Wallet"}
        </button>
      </form>
    </div>
  );
};
