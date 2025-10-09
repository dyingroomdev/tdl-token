import { apiClient } from "./client";

export const ReportsApi = {
  async fetchSummary() {
    return apiClient.request(`/reports/summary`);
  },
  async downloadCsv() {
    return apiClient.requestRaw(`/reports/summary.csv`);
  },
};
