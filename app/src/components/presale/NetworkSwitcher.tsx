import { useMemo } from "react";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { APP_CONFIG } from "../../config";

const NETWORK_OPTIONS = [
  { label: "Devnet", value: "devnet" },
  { label: "Mainnet", value: "mainnet-beta" },
] as const;

export const NetworkSwitcher = () => {
  const { setEndpoint } = useConnection();

  const active = useMemo(() => APP_CONFIG.network, []);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = event.target.value;
    if (selected === APP_CONFIG.network) return;
    const endpoint =
      selected === "custom" ? APP_CONFIG.rpcEndpoint : clusterApiUrl(selected as any);
    setEndpoint(endpoint);
  };

  return (
    <select
      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
      defaultValue={active}
      onChange={handleChange}
    >
      {NETWORK_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
