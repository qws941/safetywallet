import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RootPage from "@/app/page";
import { useAuth } from "@/hooks/use-auth";

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));

describe("app/page", () => {
  const replaceSpy = vi
    .spyOn(window.location, "replace")
    .mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading spinner while waiting hydration", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      _hasHydrated: false,
      user: null,
      currentSiteId: null,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });

    const { container } = render(<RootPage />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated user to login", async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      _hasHydrated: true,
      user: null,
      currentSiteId: null,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });

    render(<RootPage />);

    await waitFor(() => {
      expect(replaceSpy).toHaveBeenCalledWith("/login/");
    });
  });

  it("redirects authenticated user to home", async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      _hasHydrated: true,
      user: null,
      currentSiteId: "site-1",
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });

    render(<RootPage />);

    await waitFor(() => {
      expect(replaceSpy).toHaveBeenCalledWith("/home/");
    });
  });
});
