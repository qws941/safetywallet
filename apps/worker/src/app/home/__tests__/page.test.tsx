import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/home/page";
import { useAuth } from "@/hooks/use-auth";
import { usePosts, usePoints, useAttendanceToday } from "@/hooks/use-api";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { useQuery } from "@tanstack/react-query";

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/use-api", () => ({
  usePosts: vi.fn(),
  usePoints: vi.fn(),
  useAttendanceToday: vi.fn(),
}));
vi.mock("@/hooks/use-leaderboard", () => ({ useLeaderboard: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useQuery: vi.fn() }));
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));
vi.mock("@/components/header", () => ({ Header: () => <div>header</div> }));
vi.mock("@/components/bottom-nav", () => ({
  BottomNav: () => <div>bottom-nav</div>,
}));
vi.mock("@/components/points-card", () => ({
  PointsCard: ({ balance }: { balance: number }) => <div>points:{balance}</div>,
}));
vi.mock("@/components/ranking-card", () => ({
  RankingCard: ({ myRank }: { myRank: number | null }) => (
    <div>rank:{myRank ?? "none"}</div>
  ),
}));
vi.mock("@/components/post-card", () => ({
  PostCard: ({ post }: { post: { id: string } }) => (
    <div>post-card:{post.id}</div>
  ),
}));

describe("app/home/page", () => {
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
    vi.mocked(usePosts).mockReturnValue({
      data: { data: { posts: [] }, success: true, timestamp: "" },
      isLoading: false,
    } as never);
    vi.mocked(usePoints).mockReturnValue({
      data: {
        data: { balance: 1200, history: [] },
        success: true,
        timestamp: "",
      },
      isLoading: false,
    } as never);
    vi.mocked(useLeaderboard).mockReturnValue({
      data: {
        myRank: 2,
        leaderboard: [
          {
            userId: "u1",
            rank: 1,
            nameMasked: "홍*동",
            totalPoints: 100,
            isCurrentUser: false,
          },
        ],
      },
      isLoading: false,
    } as never);
    vi.mocked(useAttendanceToday).mockReturnValue({
      data: { attended: true, checkinAt: "2026-02-28T08:10:00Z" },
      isLoading: false,
    } as never);
    vi.mocked(useQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
  });

  it("renders no-sites state when site is unavailable", () => {
    vi.mocked(useAuth).mockReturnValue({
      currentSiteId: null,
      isAuthenticated: true,
      _hasHydrated: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });

    render(<HomePage />);

    expect(screen.getByText("auth.noSitesAvailable")).toBeInTheDocument();
    expect(screen.getByText("잠시만 기다려주세요...")).toBeInTheDocument();
  });

  it("renders dashboard links and cards", () => {
    render(<HomePage />);

    expect(screen.getByText("header")).toBeInTheDocument();
    expect(screen.getByText("points:1200")).toBeInTheDocument();
    expect(screen.getByText("rank:2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /posts\.title/ })).toHaveAttribute(
      "href",
      "/posts/new",
    );
    expect(
      screen.getByRole("link", { name: /announcements\.title/ }),
    ).toHaveAttribute("href", "/announcements");
    expect(screen.getByRole("link", { name: /votes\.title/ })).toHaveAttribute(
      "href",
      "/votes",
    );
    expect(screen.getByText("home.noReports")).toBeInTheDocument();
  });
});
