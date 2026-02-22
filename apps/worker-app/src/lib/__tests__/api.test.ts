import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

interface MockAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  loginDate: string | null;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const {
  authState,
  getStateMock,
  setAccessTokenMock,
  clearAuthMock,
  setTokensMock,
  logoutMock,
} = vi.hoisted(() => {
  const state: MockAuthState = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    loginDate: "2026-02-23",
    setAccessToken: () => {},
    clearAuth: () => {},
    setTokens: () => {},
    logout: () => {},
  };

  const setAccessToken = vi.fn<(token: string) => void>((token) => {
    state.accessToken = token;
  });

  const clearAuth = vi.fn<() => void>(() => {
    state.accessToken = null;
    state.refreshToken = null;
  });

  const setTokens = vi.fn<(accessToken: string, refreshToken: string) => void>(
    (accessToken, refreshToken) => {
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
    },
  );

  const logout = vi.fn<() => void>(() => {
    state.accessToken = null;
    state.refreshToken = null;
  });

  state.setAccessToken = setAccessToken;
  state.clearAuth = clearAuth;
  state.setTokens = setTokens;
  state.logout = logout;

  return {
    authState: state,
    getStateMock: vi.fn(() => state),
    setAccessTokenMock: setAccessToken,
    clearAuthMock: clearAuth,
    setTokensMock: setTokens,
    logoutMock: logout,
  };
});

vi.mock("@/stores/auth", () => ({
  useAuthStore: {
    getState: getStateMock,
  },
}));

import {
  apiFetch,
  ApiError,
  flushOfflineQueue,
  getOfflineQueueLength,
} from "@/lib/api";

const fetchMock = vi.fn<typeof fetch>();

function setOnlineStatus(online: boolean): void {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: online,
  });
}

const queueKey = "safetywallet_offline_queue";

describe("api.ts", () => {
  beforeEach(() => {
    authState.accessToken = "access-token";
    authState.refreshToken = "refresh-token";
    authState.loginDate = "2026-02-23";

    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    localStorage.clear();
    setOnlineStatus(true);
    fetchMock.mockReset();
  });

  afterEach(() => {
    setOnlineStatus(true);
    localStorage.clear();
  });

  it("apiFetch sends GET with auth header", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await apiFetch<{ ok: boolean }>("/health");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("apiFetch sends POST JSON with content-type", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const payload = { title: "report" };
    await apiFetch<{ success: boolean }>("/posts", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/posts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("apiFetch sends POST FormData without content-type", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ uploaded: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const formData = new FormData();
    formData.append("file", new Blob(["x"], { type: "text/plain" }), "a.txt");

    await apiFetch<{ uploaded: boolean }>("/uploads", {
      method: "POST",
      body: formData,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/uploads",
      expect.objectContaining({
        method: "POST",
        body: formData,
      }),
    );

    const headers = fetchMock.mock.calls[0]?.[1]?.headers;
    expect(headers).toBeTypeOf("object");
    expect(headers).not.toHaveProperty("Content-Type");
    expect(headers).toHaveProperty("Authorization", "Bearer access-token");
  });

  it("apiFetch throws ApiError for non-ok response", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Boom", { status: 500 }));

    await expect(apiFetch("/broken")).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      message: "Boom",
    });
  });

  it("apiFetch retries original request after successful refresh on 401", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: "new-access-token",
              refreshToken: "new-refresh-token",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: 42 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const result = await apiFetch<{ value: number }>("/protected");

    expect(result).toEqual({ value: 42 });
    expect(setTokensMock).toHaveBeenCalledWith(
      "new-access-token",
      "new-refresh-token",
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/auth/refresh");

    const retryHeaders = fetchMock.mock.calls[2]?.[1]?.headers;
    expect(retryHeaders).toHaveProperty(
      "Authorization",
      "Bearer new-access-token",
    );
  });

  it("apiFetch clears auth when refresh fails after 401", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(new Response("refresh denied", { status: 401 }));

    await expect(apiFetch("/protected")).rejects.toMatchObject({
      status: 401,
      message: "Session expired",
    });

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("apiFetch enqueues request when offlineQueue is true and offline", async () => {
    setOnlineStatus(false);

    const result = await apiFetch<{
      success: boolean;
      data: null;
      queued: boolean;
    }>("/posts", {
      method: "POST",
      body: JSON.stringify({ title: "offline" }),
      offlineQueue: true,
      headers: { "X-Test": "offline" },
    });

    expect(result).toEqual({ success: true, data: null, queued: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getOfflineQueueLength()).toBe(1);

    const savedQueue = JSON.parse(
      localStorage.getItem(queueKey) ?? "[]",
    ) as Array<{
      endpoint: string;
      options: {
        method?: string;
        body?: string;
        headers?: Record<string, string>;
      };
    }>;

    expect(savedQueue).toHaveLength(1);
    expect(savedQueue[0]?.endpoint).toBe("/posts");
    expect(savedQueue[0]?.options.method).toBe("POST");
    expect(savedQueue[0]?.options.body).toBe(
      JSON.stringify({ title: "offline" }),
    );
    expect(savedQueue[0]?.options.headers).toEqual({ "X-Test": "offline" });
  });

  it("ApiError exposes status and message", () => {
    const error = new ApiError(418, "teapot");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(418);
    expect(error.message).toBe("teapot");
  });

  it("getOfflineQueueLength returns queue count", () => {
    localStorage.setItem(
      queueKey,
      JSON.stringify([
        {
          id: "1",
          endpoint: "/a",
          options: { method: "POST", body: "{}", headers: {} },
          createdAt: "2026-02-23T00:00:00.000Z",
          retryCount: 0,
        },
        {
          id: "2",
          endpoint: "/b",
          options: { method: "POST", body: "{}", headers: {} },
          createdAt: "2026-02-23T00:01:00.000Z",
          retryCount: 0,
        },
      ]),
    );

    expect(getOfflineQueueLength()).toBe(2);
  });

  it("flushOfflineQueue replays queued requests when online", async () => {
    localStorage.setItem(
      queueKey,
      JSON.stringify([
        {
          id: "q1",
          endpoint: "/queued-1",
          options: {
            method: "POST",
            body: JSON.stringify({ id: 1 }),
            headers: { "X-From-Queue": "1" },
          },
          createdAt: "2026-02-23T00:00:00.000Z",
          retryCount: 0,
        },
        {
          id: "q2",
          endpoint: "/queued-2",
          options: {
            method: "POST",
            body: JSON.stringify({ id: 2 }),
            headers: { "X-From-Queue": "2" },
          },
          createdAt: "2026-02-23T00:01:00.000Z",
          retryCount: 0,
        },
      ]),
    );

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const result = await flushOfflineQueue();

    expect(result).toEqual({ succeeded: 2, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/queued-1");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/queued-2");
    expect(getOfflineQueueLength()).toBe(0);
    expect(localStorage.getItem(queueKey)).toBe("[]");
  });

  it("mocked auth store exposes legacy and current methods", () => {
    authState.setAccessToken("legacy-token");
    expect(setAccessTokenMock).toHaveBeenCalledWith("legacy-token");

    authState.clearAuth();
    expect(clearAuthMock).toHaveBeenCalledTimes(1);
  });
});
