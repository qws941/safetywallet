import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { AuthGuard } from "@/components/auth-guard";
import { setMockPathname } from "@/__tests__/mocks";
import { useAuth } from "@/hooks/use-auth";

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient();
  const rendered = render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
  return { client, ...rendered };
}

describe("AuthGuard", () => {
  it("renders public path immediately even when unauthenticated", async () => {
    setMockPathname("/login");
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      currentSiteId: null,
      _hasHydrated: false,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });

    renderWithClient(
      <AuthGuard>
        <div>public page</div>
      </AuthGuard>,
    );

    expect(screen.getByText("public page")).toBeInTheDocument();
  });

  it("shows spinner on protected path while hydrating", () => {
    setMockPathname("/home");
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      currentSiteId: null,
      _hasHydrated: false,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });

    const { container } = renderWithClient(
      <AuthGuard>
        <div>protected page</div>
      </AuthGuard>,
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText("protected page")).not.toBeInTheDocument();
  });

  it("redirects to login on protected path when unauthenticated after hydration", async () => {
    setMockPathname("/profile");
    const replaceSpy = vi
      .spyOn(window.location, "replace")
      .mockImplementation(() => undefined);

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      currentSiteId: null,
      _hasHydrated: true,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });

    renderWithClient(
      <AuthGuard>
        <div>protected page</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(replaceSpy).toHaveBeenCalledWith("/login/");
    });
  });

  it("clears query cache when logged out after hydration", async () => {
    setMockPathname("/home");
    const clearSpy = vi.spyOn(QueryClient.prototype, "clear");
    vi.spyOn(window.location, "replace").mockImplementation(() => undefined);

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      currentSiteId: null,
      _hasHydrated: true,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });

    renderWithClient(
      <AuthGuard>
        <div>protected page</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalled();
    });
  });

  it("renders children on protected path when authenticated", () => {
    setMockPathname("/actions");
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: true,
      currentSiteId: "site-1",
      _hasHydrated: true,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });

    renderWithClient(
      <AuthGuard>
        <div>protected page</div>
      </AuthGuard>,
    );

    expect(screen.getByText("protected page")).toBeInTheDocument();
    expect(screen.queryByText("/login/")).not.toBeInTheDocument();
  });
});
