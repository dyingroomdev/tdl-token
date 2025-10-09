import { FormEvent, useState } from "react";
import { useApi } from "../../providers/ApiProvider";

export const ApiKeyBanner = () => {
  const { apiKey, setApiKey } = useApi();
  const [value, setValue] = useState(apiKey ?? "");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setApiKey(value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/70 p-4 md:flex-row md:items-center"
    >
      <div className="flex-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">Backend API Key</p>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter API key to unlock admin actions"
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40"
        />
      </div>
      <button
        type="submit"
        className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
      >
        {apiKey ? "Update" : "Apply"}
      </button>
    </form>
  );
};
