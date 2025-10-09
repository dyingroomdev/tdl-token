import { useState } from "react";
import { Alert } from "../ui/Alert";
import { ReportsApi } from "../../api/reports";
import { useApi } from "../../providers/ApiProvider";

export const ReportsPanel = () => {
  const { apiKey } = useApi();
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(
    null
  );
  const [summary, setSummary] = useState<any | null>(null);

  const requireApiKey = () => {
    if (!apiKey) {
      setStatus({ type: "error", message: "Set API key to use backend reports." });
      return false;
    }
    return true;
  };

  const handleFetchSummary = async () => {
    if (!requireApiKey()) return;
    try {
      const data = await ReportsApi.fetchSummary();
      setSummary(data);
      setStatus({ type: "success", message: "Summary fetched." });
    } catch (error: any) {
      setStatus({ type: "error", message: error?.message ?? "Failed to fetch summary." });
    }
  };

  const handleDownloadCsv = async () => {
    if (!requireApiKey()) return;
    try {
      const csv = await ReportsApi.downloadCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "presale-summary.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus({ type: "success", message: "CSV downloaded." });
    } catch (error: any) {
      setStatus({ type: "error", message: error?.message ?? "Download failed." });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-brand-900/10">
      <h2 className="text-lg font-semibold text-slate-200">Reports & Analytics</h2>
      <p className="mt-1 text-sm text-slate-400">
        Export presale and distribution reports, download whitelist snapshots, and integrate with external dashboards.
      </p>

      {status && (
        <Alert className="mt-4" variant={status.type}>
          {status.message}
        </Alert>
      )}

      <div className="mt-6 space-y-3">
        <button
          onClick={handleFetchSummary}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-brand-500 hover:text-brand-300"
        >
          Fetch Presale Summary
        </button>
        <button
          onClick={handleDownloadCsv}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-brand-500 hover:text-brand-300"
        >
          Download Presale Summary (CSV)
        </button>
      </div>

      {summary && (
        <div className="mt-6 space-y-2 text-xs text-slate-400">
          <p>
            <strong>Collected:</strong> {summary.collected}
          </p>
          <p>
            <strong>Total Allocated:</strong> {summary.totalAllocated}
          </p>
          <p>
            <strong>Total Claimed:</strong> {summary.totalClaimed}
          </p>
          <p>
            <strong>Total Refunded:</strong> {summary.totalRefunded}
          </p>
          <p>
            <strong>Funds Withdrawn:</strong> {summary.fundsWithdrawn}
          </p>
          <p>
            <strong>Buyers:</strong> {summary.buyers.length}
          </p>
        </div>
      )}
    </div>
  );
};
