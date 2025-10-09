import { BN } from "@coral-xyz/anchor";
import { apiClient } from "./client";

export type PresaleStatusResponse = {
  admin: string;
  collected: string;
  softCap: string;
  hardCap: string;
  walletMin: string;
  walletMax: string;
  startTs: number;
  endTs: number;
  whitelistEnabled: boolean;
  guardEnabled: boolean;
  isPaused: boolean;
};

export const PresaleApi = {
  async getStatus() {
    return apiClient.request<PresaleStatusResponse>("/status/presale");
  },

  async pause(paused: boolean) {
    await apiClient.request("/presale/pause", {
      method: "POST",
      body: JSON.stringify({ paused }),
    });
  },

  async withdraw(amountLamports: BN, destination: string) {
    await apiClient.request("/presale/withdraw", {
      method: "POST",
      body: JSON.stringify({
        amount: amountLamports.toString(),
        destination,
      }),
    });
  },

  async whitelistPreview(file: File) {
    const form = new FormData();
    form.append("file", file);
    return apiClient.requestForm<{ count: number; root: number[]; sampleProof: number[][] }>(
      "/whitelist/preview",
      form,
      { method: "POST" }
    );
  },

  async whitelistApply(file: File) {
    const form = new FormData();
    form.append("file", file);
    await apiClient.requestForm<void>("/whitelist/apply", form, { method: "POST" });
  },
};
