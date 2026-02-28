import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnnouncementsPage from "@/app/announcements/page";
import { useAuth } from "@/hooks/use-auth";
import { useAnnouncements } from "@/hooks/use-api";

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/use-api", () => ({ useAnnouncements: vi.fn() }));
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));
vi.mock("@/components/header", () => ({ Header: () => <div>header</div> }));
vi.mock("@/components/bottom-nav", () => ({
  BottomNav: () => <div>bottom-nav</div>,
}));

describe("app/announcements/page", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      currentSiteId: "site-1",
      isAuthenticated: true,
      _hasHydrated: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });
  });

  it("renders loading state", () => {
    vi.mocked(useAnnouncements).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    render(<AnnouncementsPage />);
    expect(screen.getByText("header")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    vi.mocked(useAnnouncements).mockReturnValue({
      data: { data: [] },
      isLoading: false,
    });
    render(<AnnouncementsPage />);
    expect(screen.getByText("announcements.empty")).toBeInTheDocument();
  });

  it("renders and expands announcement item", () => {
    vi.mocked(useAnnouncements).mockReturnValue({
      data: {
        data: [
          {
            id: "a1",
            title: "공지사항",
            content: "세부 내용",
            createdAt: "2026-02-28T00:00:00Z",
            isPinned: true,
            type: "RANKING",
          },
        ],
      },
      isLoading: false,
    });

    render(<AnnouncementsPage />);
    fireEvent.click(screen.getByText("공지사항"));

    expect(screen.getByText("세부 내용")).toBeInTheDocument();
  });
});
