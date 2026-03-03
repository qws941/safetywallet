import { useAuthStore } from "@/stores/auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

/** Default request timeout in milliseconds (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Mutex for token refresh — prevents concurrent 401 handlers from
 * racing against each other and issuing duplicate refresh requests.
 */
let refreshPromise: Promise<{
  accessToken: string;
  refreshToken: string;
}> | null = null;

async function refreshTokens(
  currentRefreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: currentRefreshToken }),
  });

  if (!response.ok) {
    throw new ApiError("Session expired", 401, "SESSION_EXPIRED");
  }

  const result = await response.json();
  const newTokens = result.data ?? result;

  if (!newTokens?.accessToken || !newTokens?.refreshToken) {
    throw new ApiError("Invalid refresh response", 401, "SESSION_EXPIRED");
  }

  return newTokens;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { tokens, logout, setTokens } = useAuthStore.getState();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (tokens?.accessToken) {
    headers["Authorization"] = `Bearer ${tokens.accessToken}`;
  }

  // Create AbortController with timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const signal = options.signal
    ? anySignal([options.signal, controller.signal])
    : controller.signal;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out", 0, "TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  // Handle token refresh on 401 with mutex
  if (response.status === 401 && tokens?.refreshToken) {
    try {
      // Use mutex: if a refresh is already in-flight, reuse it
      if (!refreshPromise) {
        refreshPromise = refreshTokens(tokens.refreshToken);
      }
      const newTokens = await refreshPromise;
      setTokens(newTokens);
      headers["Authorization"] = `Bearer ${newTokens.accessToken}`;
    } catch (error) {
      logout();
      if (error instanceof ApiError) throw error;
      throw new ApiError("Session expired", 401, "SESSION_EXPIRED");
    } finally {
      refreshPromise = null;
    }

    // Retry the original request with new token
    const retryController = new AbortController();
    const retryTimeoutId = setTimeout(
      () => retryController.abort(),
      DEFAULT_TIMEOUT_MS,
    );
    const retrySignal = options.signal
      ? anySignal([options.signal, retryController.signal])
      : retryController.signal;

    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        signal: retrySignal,
      });
    } catch (error) {
      clearTimeout(retryTimeoutId);
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError("Request timed out", 0, "TIMEOUT");
      }
      throw error;
    } finally {
      clearTimeout(retryTimeoutId);
    }

    if (response.status === 401) {
      logout();
      throw new ApiError(
        "Session invalid after refresh",
        401,
        "SESSION_INVALID",
      );
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      error.message || "Request failed",
      response.status,
      error.code,
    );
  }

  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

/**
 * Combines multiple AbortSignals into one — aborts when ANY input signal fires.
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
      signal: controller.signal,
    });
  }
  return controller.signal;
}
