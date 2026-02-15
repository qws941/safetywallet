import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "@/components/sidebar";

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
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
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

    expect(screen.getByText("안전지갑 관리자")).toBeInTheDocument();
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
});
