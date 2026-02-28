import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { usePushSubscription } from "@/hooks/use-push-subscription";

const { apiFetchMock, authState } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  authState: { isAuthenticated: false },
}));

vi.mock("@/lib/api", () => ({ apiFetch: apiFetchMock }));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn(
    (selector: (s: { isAuthenticated: boolean }) => unknown) =>
      selector(authState),
  ),
}));

interface MockSubscriptionData {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

interface MockPushSubscription {
  endpoint: string;
  unsubscribe: () => Promise<boolean>;
  toJSON: () => MockSubscriptionData;
}

function createSubscription(
  data: MockSubscriptionData = {
    endpoint: "https://push.example/sub",
    keys: { p256dh: "p256dh-key", auth: "auth-key" },
  },
): MockPushSubscription {
  return {
    endpoint: data.endpoint,
    unsubscribe: vi.fn().mockResolvedValue(true),
    toJSON: () => data,
  };
}

function setupPushEnvironment({
  existingSubscription = null,
  subscribedValue,
}: {
  existingSubscription?: MockPushSubscription | null;
  subscribedValue?: MockPushSubscription;
} = {}) {
  const getSubscription = vi.fn().mockResolvedValue(existingSubscription);
  const subscribe = vi
    .fn()
    .mockResolvedValue(subscribedValue ?? createSubscription());

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: globalThis,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      userAgent: "vitest-agent",
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription,
            subscribe,
          },
        }),
      },
    },
  });

  Object.defineProperty(globalThis, "PushManager", {
    configurable: true,
    value: class PushManagerMock {},
  });

  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: {
      permission: "default",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    },
  });

  return { getSubscription, subscribe };
}

describe("usePushSubscription", () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    apiFetchMock.mockReset();
  });

  it("handles SSR safely when window is unavailable", async () => {
    authState.isAuthenticated = true;
    const originalWindow = globalThis.window;
    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {},
    });

    try {
      const HookProbe = () => {
        usePushSubscription();
        return null;
      };

      expect(() => renderToString(createElement(HookProbe))).not.toThrow();
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

  it("returns unsupported when service worker is missing", async () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { userAgent: "vitest-agent" },
    });
    Object.defineProperty(globalThis, "PushManager", {
      configurable: true,
      value: class PushManagerMock {},
    });
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: { requestPermission: vi.fn().mockResolvedValue("granted") },
    });

    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(false);
      expect(result.current.isSubscribed).toBe(false);
    });
  });

  it("returns unsupported when PushManager is missing", async () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        userAgent: "vitest-agent",
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn(),
              subscribe: vi.fn(),
            },
          }),
        },
      },
    });
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: { requestPermission: vi.fn().mockResolvedValue("granted") },
    });
    Reflect.deleteProperty(globalThis, "PushManager");

    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(false);
    });
  });

  it("does not check existing subscription when unauthenticated", async () => {
    const { getSubscription } = setupPushEnvironment({
      existingSubscription: createSubscription(),
    });

    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
      expect(result.current.isSubscribed).toBe(false);
    });
    expect(getSubscription).not.toHaveBeenCalled();
  });

  it("checks existing subscription when authenticated", async () => {
    authState.isAuthenticated = true;
    const { getSubscription } = setupPushEnvironment({
      existingSubscription: createSubscription(),
    });

    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
      expect(result.current.isSubscribed).toBe(true);
    });
    expect(getSubscription).toHaveBeenCalledTimes(1);
  });

  it("swallows checkExistingSubscription errors", async () => {
    authState.isAuthenticated = true;
    const getSubscription = vi.fn().mockRejectedValue(new Error("unavailable"));
    const subscribe = vi.fn();

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        userAgent: "vitest-agent",
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription,
              subscribe,
            },
          }),
        },
      },
    });
    Object.defineProperty(globalThis, "PushManager", {
      configurable: true,
      value: class PushManagerMock {},
    });
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: {
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("granted"),
      },
    });

    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => {
      expect(result.current.isSupported).toBe(true);
      expect(result.current.isSubscribed).toBe(false);
    });
    expect(getSubscription).toHaveBeenCalledTimes(1);
  });

  it("subscribes successfully with granted permission", async () => {
    authState.isAuthenticated = true;
    const { subscribe } = setupPushEnvironment();
    const requestPermission = vi
      .mocked(Notification.requestPermission)
      .mockResolvedValue("granted");

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        success: true,
        data: { publicKey: "dGVzdA" },
      })
      .mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => usePushSubscription());

    let subscribed = false;
    await act(async () => {
      subscribed = await result.current.subscribe();
    });

    expect(subscribed).toBe(true);
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        userVisibleOnly: true,
      }),
    );
    expect(vi.mocked(apiFetch).mock.calls[0]?.[0]).toBe(
      "/notifications/vapid-key",
    );
    expect(vi.mocked(apiFetch).mock.calls[1]?.[0]).toBe(
      "/notifications/subscribe",
    );
    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("subscribes with empty key values when subscription keys are missing", async () => {
    authState.isAuthenticated = true;
    const { subscribe } = setupPushEnvironment({
      subscribedValue: createSubscription({
        endpoint: "https://push.example/sub-2",
        keys: {},
      }),
    });
    vi.mocked(Notification.requestPermission).mockResolvedValue("granted");

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ success: true, data: { publicKey: "dGVzdA" } })
      .mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => usePushSubscription());

    let subscribed = false;
    await act(async () => {
      subscribed = await result.current.subscribe();
    });

    expect(subscribed).toBe(true);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiFetch).mock.calls[1]?.[1]).toMatchObject({
      body: JSON.stringify({
        endpoint: "https://push.example/sub-2",
        keys: { p256dh: "", auth: "" },
        userAgent: "vitest-agent",
      }),
    });
  });

  it("fails subscribe when permission is denied", async () => {
    setupPushEnvironment();
    vi.mocked(Notification.requestPermission).mockResolvedValue("denied");

    const { result } = renderHook(() => usePushSubscription());

    let subscribed = true;
    await act(async () => {
      subscribed = await result.current.subscribe();
    });

    expect(subscribed).toBe(false);
    expect(result.current.error).toBe("알림 권한이 거부되었습니다.");
    expect(vi.mocked(apiFetch)).not.toHaveBeenCalled();
  });

  it("fails subscribe when VAPID public key is missing", async () => {
    setupPushEnvironment();
    vi.mocked(Notification.requestPermission).mockResolvedValue("granted");
    vi.mocked(apiFetch).mockResolvedValueOnce({ success: true, data: {} });

    const { result } = renderHook(() => usePushSubscription());

    let subscribed = true;
    await act(async () => {
      subscribed = await result.current.subscribe();
    });

    expect(subscribed).toBe(false);
    expect(result.current.error).toBe("푸시 알림 서비스를 사용할 수 없습니다.");
  });

  it("handles subscribe errors", async () => {
    setupPushEnvironment();
    vi.mocked(Notification.requestPermission).mockResolvedValue("granted");
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("subscribe failed"));

    const { result } = renderHook(() => usePushSubscription());

    let subscribed = true;
    await act(async () => {
      subscribed = await result.current.subscribe();
    });

    expect(subscribed).toBe(false);
    expect(result.current.error).toBe("subscribe failed");
  });

  it("falls back to default subscribe error message for non-Error throws", async () => {
    setupPushEnvironment();
    vi.mocked(Notification.requestPermission).mockResolvedValue("granted");
    vi.mocked(apiFetch).mockRejectedValueOnce("boom");

    const { result } = renderHook(() => usePushSubscription());

    let subscribed = true;
    await act(async () => {
      subscribed = await result.current.subscribe();
    });

    expect(subscribed).toBe(false);
    expect(result.current.error).toBe("푸시 알림 등록에 실패했습니다.");
  });

  it("unsubscribes successfully with existing subscription", async () => {
    const existingSubscription = createSubscription();
    setupPushEnvironment({ existingSubscription });

    const { result } = renderHook(() => usePushSubscription());

    let unsubscribed = false;
    await act(async () => {
      unsubscribed = await result.current.unsubscribe();
    });

    expect(unsubscribed).toBe(true);
    expect(existingSubscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiFetch).mock.calls[0]?.[0]).toContain(
      "/notifications/unsubscribe?endpoint=",
    );
    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("unsubscribes successfully when no subscription exists", async () => {
    const { getSubscription } = setupPushEnvironment({
      existingSubscription: null,
    });

    const { result } = renderHook(() => usePushSubscription());

    let unsubscribed = false;
    await act(async () => {
      unsubscribed = await result.current.unsubscribe();
    });

    expect(unsubscribed).toBe(true);
    expect(getSubscription).toHaveBeenCalled();
    expect(vi.mocked(apiFetch)).not.toHaveBeenCalled();
    expect(result.current.isSubscribed).toBe(false);
  });

  it("handles unsubscribe errors", async () => {
    setupPushEnvironment();
    const unsubscribeError = new Error("unsubscribe failed");
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        userAgent: "vitest-agent",
        serviceWorker: {
          ready: Promise.reject(unsubscribeError),
        },
      },
    });

    const { result } = renderHook(() => usePushSubscription());

    let unsubscribed = true;
    await act(async () => {
      unsubscribed = await result.current.unsubscribe();
    });

    expect(unsubscribed).toBe(false);
    expect(result.current.error).toBe("unsubscribe failed");
  });

  it("falls back to default unsubscribe error message for non-Error throws", async () => {
    setupPushEnvironment();
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        userAgent: "vitest-agent",
        serviceWorker: {
          ready: Promise.reject("oops"),
        },
      },
    });

    const { result } = renderHook(() => usePushSubscription());

    let unsubscribed = true;
    await act(async () => {
      unsubscribed = await result.current.unsubscribe();
    });

    expect(unsubscribed).toBe(false);
    expect(result.current.error).toBe("푸시 알림 해제에 실패했습니다.");
  });
});
