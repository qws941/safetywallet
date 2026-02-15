import { UserRole } from "@safetywallet/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";

describe("auth store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      tokens: null,
      currentSiteId: null,
      isAdmin: false,
      _hasHydrated: true,
    });
  });

  it("sets user and admin state on login", () => {
    useAuthStore.getState().login(
      {
        id: "u1",
        phone: "010-1111-1111",
        nameMasked: "홍길동",
        role: UserRole.SITE_ADMIN,
      },
      { accessToken: "a", refreshToken: "r" },
    );

    const state = useAuthStore.getState();
    expect(state.user?.id).toBe("u1");
    expect(state.tokens?.accessToken).toBe("a");
    expect(state.isAdmin).toBe(true);
  });

  it("sets isAdmin true for SUPER_ADMIN role", () => {
    useAuthStore.getState().login(
      {
        id: "u2",
        phone: "010-2222-2222",
        nameMasked: "관리자",
        role: UserRole.SUPER_ADMIN,
      },
      { accessToken: "sa", refreshToken: "sr" },
    );

    const state = useAuthStore.getState();
    expect(state.isAdmin).toBe(true);
  });

  it("handles onFinishHydration when already hydrated", () => {
    useAuthStore.setState({ _hasHydrated: true });
    const setStateSpy = vi.spyOn(useAuthStore, "setState");

    useAuthStore.persist.rehydrate();

    expect(setStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ _hasHydrated: true }),
    );
  });

  it("updates site and token state transitions", () => {
    useAuthStore
      .getState()
      .setTokens({ accessToken: "new-a", refreshToken: "new-r" });
    useAuthStore.getState().setSiteId("site-77");

    const state = useAuthStore.getState();
    expect(state.tokens).toEqual({
      accessToken: "new-a",
      refreshToken: "new-r",
    });
    expect(state.currentSiteId).toBe("site-77");
  });

  it("clears auth state on logout", () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

    useAuthStore.setState({
      user: {
        id: "u1",
        phone: "010-1111-1111",
        nameMasked: "홍길동",
        role: UserRole.WORKER,
      },
      tokens: { accessToken: "a", refreshToken: "r" },
      currentSiteId: "site-1",
      isAdmin: false,
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.tokens).toBeNull();
    expect(state.currentSiteId).toBeNull();
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("skips fetch when logging out without refreshToken", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    useAuthStore.setState({
      user: {
        id: "u1",
        phone: "010-1111-1111",
        nameMasked: "홍길동",
        role: UserRole.WORKER,
      },
      tokens: { accessToken: "a", refreshToken: "" },
      currentSiteId: "site-1",
      isAdmin: false,
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("swallows fetch errors on logout", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    useAuthStore.setState({
      user: {
        id: "u1",
        phone: "010-1111-1111",
        nameMasked: "홍길동",
        role: UserRole.WORKER,
      },
      tokens: { accessToken: "a", refreshToken: "r" },
      currentSiteId: "site-1",
      isAdmin: false,
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
  });

  it("sets _hasHydrated via onFinishHydration callback", () => {
    useAuthStore.setState({ _hasHydrated: false });
    expect(useAuthStore.getState()._hasHydrated).toBe(false);

    useAuthStore.persist.rehydrate();
    expect(useAuthStore.getState()._hasHydrated).toBe(true);
  });

  it("skips hydration setup when window is undefined (SSR)", async () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    vi.resetModules();
    const { useAuthStore: ssrStore } = await import("@/stores/auth");

    expect(ssrStore.getState()).toBeDefined();

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });
});
