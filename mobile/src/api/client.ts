import axios, { AxiosError, AxiosResponse } from "axios";
import { API_BASE_URL, API_BASE_URL_FALLBACKS } from "../config/env";
import { useAuthStore } from "../store/auth-store";
import { ApiEnvelope, ApiErrorEnvelope } from "../types/api";

let activeApiBaseUrl = API_BASE_URL;

export const apiClient = axios.create({
  baseURL: activeApiBaseUrl,
  timeout: 20000,
});

apiClient.interceptors.request.use((config) => {
  const { token, user } = useAuthStore.getState();
  config.baseURL = activeApiBaseUrl;

  if (user?.id) {
    config.headers["x-user-id"] = String(user.id);
    config.headers["x-user-role"] = user.role;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  console.log(`[API] -> ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] <- ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      const config = error.config as (typeof error.config & { __fallbackRetried?: boolean }) | undefined;
      const isNetworkError = !error.response;
      if (isNetworkError && config && !config.__fallbackRetried) {
        const currentBase = config.baseURL || activeApiBaseUrl;
        const fallbackBase = API_BASE_URL_FALLBACKS.find((url) => url !== currentBase);
        if (fallbackBase) {
          activeApiBaseUrl = fallbackBase;
          config.baseURL = fallbackBase;
          config.__fallbackRetried = true;
          console.warn(
            `[API] Network error on ${currentBase}. Retrying once with fallback ${fallbackBase}.`
          );
          return apiClient.request(config);
        }
      }
    }

    if (axios.isAxiosError(error)) {
      console.error(`[API] Error: ${error.message}`, {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
    }
    return Promise.reject(error);
  }
);

export async function unwrapData<T>(
  request: Promise<AxiosResponse<ApiEnvelope<T>>>
): Promise<T> {
  const response = await request;
  return response.data.data;
}

export async function unwrapDataWithMeta<T, M>(
  request: Promise<AxiosResponse<ApiEnvelope<T>>>
): Promise<{ data: T; meta: M | undefined }> {
  const response = await request;
  return {
    data: response.data.data,
    meta: response.data.meta as M | undefined,
  };
}

export function getApiErrorMessage(error: unknown, fallback = "Request failed"): string {
  if (axios.isAxiosError(error)) {
    const apiError = error as AxiosError<ApiErrorEnvelope>;
    const status = apiError.response?.status;
    if (status === 401) {
      return "Session expired. Please sign in again.";
    }
    if (status === 403) {
      return "You do not have permission to perform this action.";
    }
    if (status && status >= 500) {
      return "Server error. Please try again later.";
    }
    if (!apiError.response) {
      // More specific error messages for different cases
      if (apiError.code === "ECONNABORTED") {
        return "Request timeout. Server is not responding.";
      }
      if (apiError.code === "ERR_NETWORK") {
        return "Network error. Cannot reach the server.";
      }
      return "Network error. Please check your connection.";
    }

    return apiError.response?.data?.error?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
