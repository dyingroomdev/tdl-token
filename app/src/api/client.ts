import { config } from "../config";

class ApiClient {
  private readonly baseUrl: string;
  private apiKey: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");
    if (this.apiKey) {
      headers.set("x-api-key", this.apiKey);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error ?? response.statusText);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async requestForm<T>(path: string, form: FormData, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (this.apiKey) {
      headers.set("x-api-key", this.apiKey);
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      body: form,
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error ?? response.statusText);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  async requestRaw(path: string, options: RequestInit = {}): Promise<string> {
    const headers = new Headers(options.headers || {});
    if (this.apiKey) {
      headers.set("x-api-key", this.apiKey);
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response.text();
  }
}

export const apiClient = new ApiClient();
