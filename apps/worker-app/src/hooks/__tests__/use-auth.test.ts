import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth";

vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn() }));

describe("useAuth", () => {
  it("returns auth state and actions from store", () => {
    const login = vi.fn();
    const logout = vi.fn();
    const setCurrentSite = vi.fn();

    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: "u1",
        phone: "01012345678",
        nameMasked: "김*수",
        role: "WORKER",
      },
      isAuthenticated: true,
      currentSiteId: "site-1",
      _hasHydrated: true,
      accessToken: "access-token",
      refreshToken: "refresh-token",
      setUser: vi.fn(),
      setTokens: vi.fn(),
      setCurrentSite,
      login,
      logout,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user?.id).toBe("u1");
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.currentSiteId).toBe("site-1");
    expect(result.current._hasHydrated).toBe(true);
    expect(result.current.login).toBe(login);
    expect(result.current.logout).toBe(logout);
    expect(result.current.setCurrentSite).toBe(setCurrentSite);
  });
});
