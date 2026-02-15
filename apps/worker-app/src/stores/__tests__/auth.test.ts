import { describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";

const baseUser = {
  id: "user-1",
  phone: "01000000000",
  nameMasked: "김*수",
  role: "WORKER",
};

describe("auth store", () => {
  it("login sets auth state and tokens", () => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      currentSiteId: null,
      _hasHydrated: true,
    });

    useAuthStore.getState().login(baseUser, "access-1", "refresh-1");
    const state = useAuthStore.getState();

    expect(state.user).toEqual(baseUser);
    expect(state.accessToken).toBe("access-1");
    expect(state.refreshToken).toBe("refresh-1");
    expect(state.isAuthenticated).toBe(true);
  });

  it("setUser and setCurrentSite update state slices", () => {
    useAuthStore.getState().setUser({
      ...baseUser,
      id: "user-2",
      phone: "01099998888",
    });
    useAuthStore.getState().setCurrentSite("site-123");

    const state = useAuthStore.getState();
    expect(state.user?.id).toBe("user-2");
    expect(state.currentSiteId).toBe("site-123");
  });

  it("logout clears user, tokens, auth flag, and current site", () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));

    useAuthStore.setState({
      user: baseUser,
      accessToken: "access-2",
      refreshToken: "refresh-2",
      isAuthenticated: true,
      currentSiteId: "site-9",
      _hasHydrated: true,
    });

    useAuthStore.getState().logout();
    const state = useAuthStore.getState();

    expect(fetchSpy).toHaveBeenCalled();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.currentSiteId).toBeNull();
  });
});
