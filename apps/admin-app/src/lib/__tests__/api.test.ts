import { beforeEach, describe, expect, it, vi } from "vitest";

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthState = {
  tokens: Tokens | null;
  logout: () => void;
  setTokens: (tokens: Tokens) => void;
};

const mockGetState = vi.fn<() => AuthState>();

vi.mock("@/stores/auth", () => ({
  useAuthStore: {
    getState: () => mockGetState(),
  },
}));

const mockFetch = vi.fn<typeof fetch>();

function createJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function createNonJsonResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockRejectedValue(new Error("not-json")),
  } as unknown as Response;
}

describe("ApiError", () => {
  it("sets name, message, status, and code", async () => {
    const { ApiError } = await import("@/lib/api");
    const error = new ApiError("boom", 418, "TEAPOT");

    expect(error.name).toBe("ApiError");
    expect(error.message).toBe("boom");
    expect(error.status).toBe(418);
    expect(error.code).toBe("TEAPOT");
  });
});

describe("apiFetch", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("calls API without Authorization when no tokens", async () => {
    mockGetState.mockReturnValue({
      tokens: null,
      logout: vi.fn(),
      setTokens: vi.fn(),
    });
    mockFetch.mockResolvedValueOnce(createJsonResponse(200, { ok: true }));

    const { apiFetch } = await import("@/lib/api");
    const result = await apiFetch<{ ok: boolean }>("/health");

    expect(mockFetch).toHaveBeenCalledWith("/api/health", {
      headers: { "Content-Type": "application/json" },
    });
    expect(result).toEqual({ ok: true });
  });

  it("adds Authorization header when access token exists", async () => {
    mockGetState.mockReturnValue({
      tokens: { accessToken: "token-a", refreshToken: "refresh-a" },
      logout: vi.fn(),
      setTokens: vi.fn(),
    });
    mockFetch.mockResolvedValueOnce(
      createJsonResponse(200, { data: { id: 1 } }),
    );

    const { apiFetch } = await import("@/lib/api");
    const result = await apiFetch<{ id: number }>("/users/me");

    expect(mockFetch).toHaveBeenCalledWith("/api/users/me", {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-a",
      },
    });
    expect(result).toEqual({ id: 1 });
  });

  it("refreshes token on 401 and retries request", async () => {
    const logout = vi.fn();
    const setTokens = vi.fn();
    mockGetState.mockReturnValue({
      tokens: { accessToken: "old-access", refreshToken: "old-refresh" },
      logout,
      setTokens,
    });

    mockFetch
      .mockResolvedValueOnce(
        createJsonResponse(401, { message: "unauthorized" }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          data: { accessToken: "new-access", refreshToken: "new-refresh" },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, { data: { success: true } }),
      );

    const { apiFetch } = await import("@/lib/api");
    const result = await apiFetch<{ success: boolean }>("/secure");

    expect(setTokens).toHaveBeenCalledWith({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
    expect(mockFetch).toHaveBeenNthCalledWith(2, "/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "old-refresh" }),
    });
    expect(mockFetch).toHaveBeenNthCalledWith(3, "/api/secure", {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer new-access",
      },
    });
    expect(logout).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("accepts refresh response without data wrapper", async () => {
    const setTokens = vi.fn();
    mockGetState.mockReturnValue({
      tokens: { accessToken: "old-access", refreshToken: "old-refresh" },
      logout: vi.fn(),
      setTokens,
    });

    mockFetch
      .mockResolvedValueOnce(
        createJsonResponse(401, { message: "unauthorized" }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          accessToken: "flat-access",
          refreshToken: "flat-refresh",
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(200, { ok: true }));

    const { apiFetch } = await import("@/lib/api");
    await apiFetch<{ ok: boolean }>("/secure-flat");

    expect(setTokens).toHaveBeenCalledWith({
      accessToken: "flat-access",
      refreshToken: "flat-refresh",
    });
  });

  it("logs out when refresh response is not ok", async () => {
    const logout = vi.fn();
    mockGetState.mockReturnValue({
      tokens: { accessToken: "old-access", refreshToken: "old-refresh" },
      logout,
      setTokens: vi.fn(),
    });

    mockFetch
      .mockResolvedValueOnce(
        createJsonResponse(401, { message: "unauthorized" }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(401, { message: "refresh failed" }),
      );

    const { apiFetch } = await import("@/lib/api");

    await expect(apiFetch("/secure")).rejects.toMatchObject({
      name: "ApiError",
      message: "Session expired",
      status: 401,
      code: "SESSION_EXPIRED",
    });
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("logs out when refresh response is missing tokens", async () => {
    const logout = vi.fn();
    mockGetState.mockReturnValue({
      tokens: { accessToken: "old-access", refreshToken: "old-refresh" },
      logout,
      setTokens: vi.fn(),
    });

    mockFetch
      .mockResolvedValueOnce(
        createJsonResponse(401, { message: "unauthorized" }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, { data: { accessToken: "only-one" } }),
      );

    const { apiFetch } = await import("@/lib/api");

    await expect(apiFetch("/secure")).rejects.toMatchObject({
      message: "Invalid refresh response",
      status: 401,
      code: "SESSION_EXPIRED",
    });
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("logs out when retried request is still 401", async () => {
    const logout = vi.fn();
    mockGetState.mockReturnValue({
      tokens: { accessToken: "old-access", refreshToken: "old-refresh" },
      logout,
      setTokens: vi.fn(),
    });

    mockFetch
      .mockResolvedValueOnce(
        createJsonResponse(401, { message: "unauthorized" }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          data: { accessToken: "new-access", refreshToken: "new-refresh" },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(401, { message: "still unauthorized" }),
      );

    const { apiFetch } = await import("@/lib/api");

    await expect(apiFetch("/secure")).rejects.toMatchObject({
      message: "Session invalid after refresh",
      status: 401,
      code: "SESSION_INVALID",
    });
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("throws ApiError using json message and code on non-ok response", async () => {
    mockGetState.mockReturnValue({
      tokens: null,
      logout: vi.fn(),
      setTokens: vi.fn(),
    });
    mockFetch.mockResolvedValueOnce(
      createJsonResponse(500, { message: "Server exploded", code: "E_BROKEN" }),
    );

    const { apiFetch } = await import("@/lib/api");

    await expect(apiFetch("/boom")).rejects.toMatchObject({
      message: "Server exploded",
      status: 500,
      code: "E_BROKEN",
    });
  });

  it("throws fallback message when non-ok response has no json body", async () => {
    mockGetState.mockReturnValue({
      tokens: null,
      logout: vi.fn(),
      setTokens: vi.fn(),
    });
    mockFetch.mockResolvedValueOnce(createNonJsonResponse(503));

    const { apiFetch } = await import("@/lib/api");

    await expect(apiFetch("/service")).rejects.toMatchObject({
      message: "Request failed",
      status: 503,
      code: undefined,
    });
  });

  it("returns response.data when data wrapper exists", async () => {
    mockGetState.mockReturnValue({
      tokens: null,
      logout: vi.fn(),
      setTokens: vi.fn(),
    });
    mockFetch.mockResolvedValueOnce(
      createJsonResponse(200, { data: { count: 3 } }),
    );

    const { apiFetch } = await import("@/lib/api");
    const result = await apiFetch<{ count: number }>("/wrapped");

    expect(result).toEqual({ count: 3 });
  });

  it("returns raw json when data wrapper is missing", async () => {
    mockGetState.mockReturnValue({
      tokens: null,
      logout: vi.fn(),
      setTokens: vi.fn(),
    });
    mockFetch.mockResolvedValueOnce(
      createJsonResponse(200, { hello: "world" }),
    );

    const { apiFetch } = await import("@/lib/api");
    const result = await apiFetch<{ hello: string }>("/raw");

    expect(result).toEqual({ hello: "world" });
  });
});
