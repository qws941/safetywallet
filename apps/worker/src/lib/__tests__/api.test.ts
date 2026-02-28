import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";

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

  it("apiFetch omits auth header when token is missing", async () => {
    authState.accessToken = null;
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await apiFetch<{ ok: boolean }>("/health");

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as
      | Record<string, string>
      | undefined;
    expect(headers).toMatchObject({ "Content-Type": "application/json" });
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("apiFetch omits auth header when skipAuth is enabled", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await apiFetch<{ ok: boolean }>("/public", { skipAuth: true });

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as
      | Record<string, string>
      | undefined;
    expect(headers).toMatchObject({ "Content-Type": "application/json" });
    expect(headers).not.toHaveProperty("Authorization");
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

  it("throws retry response status when refreshed retry still fails", async () => {
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
      .mockResolvedValueOnce(new Response("retry failed", { status: 503 }));

    await expect(apiFetch("/protected")).rejects.toMatchObject({
      status: 503,
      message: "retry failed",
    });

    expect(setTokensMock).toHaveBeenCalledWith(
      "new-access-token",
      "new-refresh-token",
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

  it("apiFetch clears auth when refresh token does not exist", async () => {
    authState.refreshToken = null;
    fetchMock.mockResolvedValueOnce(
      new Response("unauthorized", { status: 401 }),
    );

    await expect(apiFetch("/protected")).rejects.toMatchObject({
      status: 401,
      message: "Session expired",
    });

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("apiFetch clears auth when refresh response is missing tokens", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { accessToken: "new-access-token" },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    await expect(apiFetch("/protected")).rejects.toMatchObject({
      status: 401,
      message: "Session expired",
    });

    expect(setTokensMock).not.toHaveBeenCalled();
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("apiFetch clears auth when refresh request throws", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockRejectedValueOnce(new Error("refresh network error"));

    await expect(apiFetch("/protected")).rejects.toMatchObject({
      status: 401,
      message: "Session expired",
    });

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses single refresh mutex for concurrent 401 responses", async () => {
    const unauthorizedSeen = new Set<string>();
    let refreshCalls = 0;

    fetchMock.mockImplementation(async (input) => {
      const url = String(input);

      if (url === "/api/auth/refresh") {
        refreshCalls += 1;
        await Promise.resolve();
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: "mutex-access-token",
              refreshToken: "mutex-refresh-token",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (
        (url === "/api/protected-a" || url === "/api/protected-b") &&
        !unauthorizedSeen.has(url)
      ) {
        unauthorizedSeen.add(url);
        return new Response("unauthorized", { status: 401 });
      }

      if (url === "/api/protected-a") {
        return new Response(JSON.stringify({ value: "A" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url === "/api/protected-b") {
        return new Response(JSON.stringify({ value: "B" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("unexpected", { status: 500 });
    });

    const [a, b] = await Promise.all([
      apiFetch<{ value: string }>("/protected-a"),
      apiFetch<{ value: string }>("/protected-b"),
    ]);

    expect(a).toEqual({ value: "A" });
    expect(b).toEqual({ value: "B" });
    expect(refreshCalls).toBe(1);
    expect(setTokensMock).toHaveBeenCalledTimes(1);
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

  it("apiFetch queues form-data request with undefined body and headers", async () => {
    setOnlineStatus(false);
    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["payload"], { type: "text/plain" }),
      "a.txt",
    );

    const result = await apiFetch<{
      success: boolean;
      data: null;
      queued: boolean;
    }>("/uploads", {
      method: "POST",
      body: formData,
      offlineQueue: true,
    });

    expect(result).toEqual({ success: true, data: null, queued: true });
    const savedQueue = JSON.parse(
      localStorage.getItem(queueKey) ?? "[]",
    ) as Array<{
      options: { body?: string; headers?: Record<string, string> };
    }>;

    expect(savedQueue).toHaveLength(1);
    expect(savedQueue[0]?.options.body).toBeUndefined();
    expect(savedQueue[0]?.options.headers).toBeUndefined();
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

  it("flushOfflineQueue returns zero counts when queue is empty", async () => {
    localStorage.setItem(queueKey, JSON.stringify([]));

    const result = await flushOfflineQueue();

    expect(result).toEqual({ succeeded: 0, failed: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("flushOfflineQueue keeps retryable failures and drops exhausted items", async () => {
    localStorage.setItem(
      queueKey,
      JSON.stringify([
        {
          id: "keep",
          endpoint: "/retryable",
          options: { method: "POST", body: "{}", headers: {} },
          createdAt: "2026-02-23T00:00:00.000Z",
          retryCount: 1,
        },
        {
          id: "drop",
          endpoint: "/exhausted",
          options: { method: "POST", body: "{}", headers: {} },
          createdAt: "2026-02-23T00:01:00.000Z",
          retryCount: 4,
        },
      ]),
    );

    fetchMock.mockRejectedValue(new Error("queue replay failed"));

    const result = await flushOfflineQueue();

    expect(result).toEqual({ succeeded: 0, failed: 2 });
    const queue = JSON.parse(localStorage.getItem(queueKey) ?? "[]") as Array<{
      id: string;
      endpoint: string;
      options: {
        method: string;
        body: string;
        headers: Record<string, string>;
      };
      createdAt: string;
      retryCount: number;
    }>;
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ id: "keep", retryCount: 2 });
  });

  it("flushes queue via online event listener", async () => {
    localStorage.setItem(
      queueKey,
      JSON.stringify([
        {
          id: "event-1",
          endpoint: "/event-queued",
          options: { method: "POST", body: "{}", headers: { "X-Queue": "1" } },
          createdAt: "2026-02-23T00:00:00.000Z",
          retryCount: 0,
        },
      ]),
    );

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    window.dispatchEvent(new Event("online"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/event-queued",
        expect.objectContaining({ method: "POST", body: "{}" }),
      );
      expect(getOfflineQueueLength()).toBe(0);
    });
  });

  it("getOfflineQueueLength returns 0 for invalid stored queue payload", () => {
    localStorage.setItem(queueKey, "this-is-not-json");
    expect(getOfflineQueueLength()).toBe(0);
  });

  it("mocked auth store exposes legacy and current methods", () => {
    authState.setAccessToken("legacy-token");
    expect(setAccessTokenMock).toHaveBeenCalledWith("legacy-token");

    authState.clearAuth();
    expect(clearAuthMock).toHaveBeenCalledTimes(1);
  });

  it("loads api module safely when window is unavailable", async () => {
    const originalWindow = globalThis.window;
    const originalNavigator = globalThis.navigator;

    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "navigator");
    vi.resetModules();

    try {
      const apiModule = await import("@/lib/api");
      expect(typeof apiModule.apiFetch).toBe("function");
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: originalNavigator,
      });
    }
  });
});
