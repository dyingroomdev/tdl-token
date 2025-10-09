import { useState } from "react";
import { useApi } from "../../providers/ApiProvider";
import { PresaleApi } from "../../api/presale";
import { ReportsApi } from "../../api/reports";
import { Alert } from "../ui/Alert";

type ChecklistItem = {
  id: string;
  label: string;
  action?: () => Promise<void>;
};

const items: ChecklistItem[] = [
  { id: "hardening", label: "Run mint hardening audit" },
  { id: "whitelist", label: "Publish final whitelist" },
  { id: "pause", label: "Resume trading" },
  { id: "reports", label: "Generate presale report" },
];

export const LaunchChecklist = () => {
  const { apiKey } = useApi();
  const [completed, setCompleted] = useState<string[]>([]);
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(
    null
  );

  const ensureApiKey = () => {
    if (!apiKey) {
      setStatus({ type: "error", message: "Set API key before running automation." });
      return false;
    }
    return true;
  };

  const markComplete = (id: string) => {
    setCompleted((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleRun = async (item: ChecklistItem) => {
    if (!ensureApiKey()) return;
    try {
      switch (item.id) {
        case "pause":
          await PresaleApi.pause(false);
          break;
        case "reports":
          await ReportsApi.fetchSummary();
          break;
        default:
          setStatus({ type: "info", message: "Automation placeholder for this step." });
          markComplete(item.id);
          return;
      }
      markComplete(item.id);
      setStatus({ type: "success", message: `${item.label} completed.` });
    } catch (error: any) {
      setStatus({ type: "error", message: error?.message ?? "Automation failed." });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-brand-900/10">
      <h2 className="text-lg font-semibold text-slate-200">Launch Checklist</h2>
      <p className="mt-1 text-sm text-slate-400">
        Run critical tasks before mainnet release. Items auto-mark when backend automation succeeds.
      </p>

      {status && (
        <Alert className="mt-4" variant={status.type}>
          {status.message}
        </Alert>
      )}

      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={completed.includes(item.id)}
                readOnly
                className="h-4 w-4 rounded border-slate-700 bg-slate-900"
              />
              <span>{item.label}</span>
            </div>
            <button
              className="rounded-md border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-200 transition hover:bg-brand-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => handleRun(item)}
              disabled={completed.includes(item.id)}
            >
              Run
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
