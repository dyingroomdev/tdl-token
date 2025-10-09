import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { apiClient } from "../api/client";

type ApiContextValue = {
  apiKey: string | null;
  setApiKey: (value: string) => void;
};

const ApiContext = createContext<ApiContextValue | undefined>(undefined);

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);

  const setApiKey = (value: string) => {
    const cleaned = value.trim();
    setApiKeyState(cleaned.length ? cleaned : null);
    apiClient.setApiKey(cleaned);
  };

  const value = useMemo(() => ({ apiKey, setApiKey }), [apiKey]);

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApi must be used within ApiProvider");
  }
  return context;
};
