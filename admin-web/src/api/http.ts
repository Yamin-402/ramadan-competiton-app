import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { AdminSession } from "../types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL is required. Set it in admin-web/.env.");
}

let currentSession: AdminSession | null = null;

export function setHttpSession(session: AdminSession | null) {
  currentSession = session;
}

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

http.interceptors.request.use((config) => {
  const headers = config.headers || {};

  if (currentSession?.user?.id) {
    headers["x-user-id"] = String(currentSession.user.id);
  }
  if (currentSession?.user?.role) {
    headers["x-user-role"] = currentSession.user.role;
  }
  if (currentSession?.token) {
    headers.Authorization = `Bearer ${currentSession.token}`;
  }

  config.headers = headers;
  return config;
});

export async function requestData<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<{ data: T }>(config);
  return response.data.data;
}

export function toApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const apiMessage = (error.response?.data as { error?: { message?: string } } | undefined)?.error
      ?.message;

    if (status === 401) {
      return "Session is invalid. Please login again.";
    }
    if (status === 403) {
      return "Access denied. Admin role is required.";
    }
    if (status && status >= 500) {
      return "Server error. Please try again.";
    }

    return apiMessage || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

