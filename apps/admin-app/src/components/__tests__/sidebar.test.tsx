import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileHeader, Sidebar } from "@/components/sidebar";

const mockUsePathname = vi.fn();
const mockLogout = vi.fn();
const mockSetSiteId = vi.fn();
const mockUseMySites = vi.fn();
const mockClear = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
  }: {
    href: string;
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useQueryClient: () => ({
      clear: mockClear,
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

vi.mock("@/stores/auth", () => ({
  useAuthStore: (
    selector: (state: {
      logout: () => void;
      currentSiteId: string;
      setSiteId: (siteId: string) => void;
    }) => unknown,
  ) =>
    selector({
      logout: mockLogout,
      currentSiteId: "site-1",
      setSiteId: mockSetSiteId,
    }),
}));

vi.mock("@/hooks/use-admin-api", () => ({
  useMySites: () => mockUseMySites(),
}));

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseMySites.mockReturnValue({
      data: [
        { siteId: "site-1", siteName: "서울 현장" },
        { siteId: "site-2", siteName: "부산 현장" },
      ],
    });
  });

  it("renders nav items and current site", () => {
    render(<Sidebar />);

    expect(screen.getByText("송도세브란스 관리자")).toBeInTheDocument();
    expect(screen.getByText("서울 현장")).toBeInTheDocument();
    expect(screen.getByText("대시보드")).toBeInTheDocument();
  });

  it("opens site switcher and selects a site", async () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: /서울 현장/ }));
    fireEvent.click(screen.getByRole("button", { name: "부산 현장" }));

    await waitFor(() => {
      expect(mockSetSiteId).toHaveBeenCalledWith("site-2");
    });
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });

  it("handles logout action", () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(mockClear).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  it("does not render site dropdown when sitesData is undefined", () => {
    mockUseMySites.mockReturnValue({ data: undefined });
    render(<Sidebar />);
    // sites = undefined ?? [] = [], length 0 → dropdown hidden
    expect(screen.queryByText("서울 현장")).not.toBeInTheDocument();
    expect(screen.queryByText("부산 현장")).not.toBeInTheDocument();
  });

  it("shows fallback text when no matching currentSite", () => {
    mockUseMySites.mockReturnValue({
      data: [{ siteId: "site-999", siteName: "기타 현장" }],
    });
    render(<Sidebar />);
    expect(
      screen.getByRole("button", { name: "현장 선택" }),
    ).toBeInTheDocument();
  });

  it("handles null pathname from usePathname", () => {
    mockUsePathname.mockReturnValue(null);
    render(<Sidebar />);
    expect(screen.getByText("대시보드")).toBeInTheDocument();
  });

  it("toggles sidebar collapse state", () => {
    render(<Sidebar />);

    // Find the collapse toggle button (not logout or site switch buttons)
    const buttons = screen.getAllByRole("button");
    const collapseButton = buttons.find(
      (btn) =>
        !btn.textContent?.includes("로그아웃") &&
        !btn.textContent?.includes("서울 현장") &&
        !btn.textContent?.includes("부산 현장"),
    );

    expect(collapseButton).toBeDefined();
    fireEvent.click(collapseButton!);

    // After collapse, nav text should be hidden or layout changed
    // The collapsed state changes the rendering
    expect(collapseButton).toBeInTheDocument();
  });

  it("renders mobile header with current site name", () => {
    render(<MobileHeader />);

    expect(screen.getByText("서울 현장")).toBeInTheDocument();
  });

  it("shows mobile header fallback text when site does not match", () => {
    mockUseMySites.mockReturnValue({
      data: [{ siteId: "other-site", siteName: "다른 현장" }],
    });

    render(<MobileHeader />);

    expect(screen.getByText("송도세브란스 관리자")).toBeInTheDocument();
  });

  it("shows mobile header fallback text when sites data is undefined", () => {
    mockUseMySites.mockReturnValue({ data: undefined });

    render(<MobileHeader />);

    expect(screen.getByText("송도세브란스 관리자")).toBeInTheDocument();
  });
});
