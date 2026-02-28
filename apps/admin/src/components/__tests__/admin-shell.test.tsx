import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminShell } from "@/components/admin-shell";

const pushMock = vi.fn();
const pathnameMock = vi.fn();

const authState = {
  user: null as { id: string } | null,
  isAdmin: false,
  _hasHydrated: false,
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => pathnameMock(),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => authState,
}));

vi.mock("@/components/sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar">sidebar</div>,
  MobileHeader: () => <div data-testid="mobile-header">mobile-header</div>,
}));

describe("AdminShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathnameMock.mockReturnValue("/dashboard");
    authState.user = null;
    authState.isAdmin = false;
    authState._hasHydrated = false;
  });

  it("renders children only on login route", () => {
    pathnameMock.mockReturnValue("/login");

    render(
      <AdminShell>
        <div>login-content</div>
      </AdminShell>,
    );

    expect(screen.getByText("login-content")).toBeInTheDocument();
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
  });

  it("returns null while auth is not hydrated", () => {
    const { container } = render(
      <AdminShell>
        <div>protected</div>
      </AdminShell>,
    );
    expect(container.firstChild).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects to login when hydrated user is missing", async () => {
    authState._hasHydrated = true;

    const { container } = render(
      <AdminShell>
        <div>protected</div>
      </AdminShell>,
    );

    expect(container.firstChild).toBeNull();
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("renders sidebar layout for authenticated admin", () => {
    authState._hasHydrated = true;
    authState.user = { id: "admin-1" };
    authState.isAdmin = true;

    render(
      <AdminShell>
        <div>protected-content</div>
      </AdminShell>,
    );

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-header")).toBeInTheDocument();
    expect(screen.getByText("protected-content")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
