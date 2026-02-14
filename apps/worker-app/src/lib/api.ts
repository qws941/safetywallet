import { useAuthStore } from "@/stores/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://safework2-api.jclee.workers.dev/api";

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

// Mutex for concurrent token refresh (prevents race conditions)
let refreshPromise: Promise<boolean> | null = null;

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { skipAuth = false, headers: customHeaders, ...rest } = options;

  const isFormData = rest.body instanceof FormData;
  const baseHeaders: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(customHeaders as Record<string, string>),
  };

  function getHeaders(): Record<string, string> {
    const h = { ...baseHeaders };
    if (!skipAuth) {
      const accessToken = useAuthStore.getState().accessToken;
      if (accessToken) {
        h["Authorization"] = `Bearer ${accessToken}`;
      }
    }
    return h;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...rest,
    headers: getHeaders(),
  });

  if (response.status === 401 && !skipAuth) {
    const refreshed = await refreshToken();
    if (refreshed) {
      const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...rest,
        headers: getHeaders(),
      });
      if (!retryResponse.ok) {
        throw new ApiError(retryResponse.status, await retryResponse.text());
      }
      return retryResponse.json();
    } else {
      useAuthStore.getState().logout();
      throw new ApiError(401, "Session expired");
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return response.json();
}

async function refreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = doRefresh();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function doRefresh(): Promise<boolean> {
  const storedRefreshToken = useAuthStore.getState().refreshToken;
  if (!storedRefreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: storedRefreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    const accessToken = data?.data?.accessToken;
    const newRefreshToken = data?.data?.refreshToken;
    if (!accessToken || !newRefreshToken) return false;

    useAuthStore.getState().setTokens(accessToken, newRefreshToken);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
