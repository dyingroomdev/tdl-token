import { useState } from "react";
import { Alert } from "../ui/Alert";

type Status = { type: "success" | "error" | "info"; message: string };

export const TokenOperationsPanel = () => {
  const [status, setStatus] = useState<Status | null>(null);

  // Placeholder actions – to be implemented when backend endpoints are added
  const handleComingSoon = () => {
    setStatus({ type: "info" as any, message: "Token administration endpoints coming soon." });
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-brand-900/10">
      <h2 className="text-lg font-semibold text-slate-200">Token Administration</h2>
      <p className="mt-1 text-sm text-slate-400">
        Manage mint authority, liquidity, and other SPL token actions. Backend endpoints are
        scaffolded and will be exposed in a future iteration.
      </p>

      {status && (
        <Alert className="mt-4" variant={status.type}>
          {status.message}
        </Alert>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <button
          onClick={handleComingSoon}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-brand-500 hover:text-brand-300"
        >
          Mint / Burn Tokens
        </button>
        <button
          onClick={handleComingSoon}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-brand-500 hover:text-brand-300"
        >
          Liquidity Operations
        </button>
        <button
          onClick={handleComingSoon}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-brand-500 hover:text-brand-300"
        >
          Authority Management
        </button>
        <button
          onClick={handleComingSoon}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-brand-500 hover:text-brand-300"
        >
          Token Snapshot / Airdrop
        </button>
      </div>
    </div>
  );
};
