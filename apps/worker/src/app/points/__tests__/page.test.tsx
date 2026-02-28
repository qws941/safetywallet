import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PointsPage from "@/app/points/page";
import { useAuth } from "@/hooks/use-auth";
import { usePoints } from "@/hooks/use-api";
import { useLeaderboard } from "@/hooks/use-leaderboard";

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/use-api", () => ({ usePoints: vi.fn() }));
vi.mock("@/hooks/use-leaderboard", () => ({ useLeaderboard: vi.fn() }));
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

describe("app/points/page", () => {
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

  it("renders points and ranking table", () => {
    vi.mocked(usePoints).mockReturnValue({
      data: {
        data: { balance: 500, history: [] },
        success: true,
        timestamp: "",
      },
      isLoading: false,
    } as never);
    vi.mocked(useLeaderboard).mockReturnValue({
      data: {
        myRank: 1,
        leaderboard: [
          {
            userId: "u1",
            rank: 1,
            nameMasked: "홍*동",
            totalPoints: 500,
            isCurrentUser: true,
          },
        ],
      },
      isLoading: false,
    } as never);

    render(<PointsPage />);

    expect(screen.getByText("points:500")).toBeInTheDocument();
    expect(screen.getByText("홍*동")).toBeInTheDocument();
  });

  it("switches ranking tabs and shows empty history", () => {
    vi.mocked(usePoints).mockReturnValue({
      data: {
        data: { balance: 0, history: [] },
        success: true,
        timestamp: "",
      },
      isLoading: false,
    } as never);
    vi.mocked(useLeaderboard).mockReturnValue({
      data: { myRank: null, leaderboard: [] },
      isLoading: false,
    } as never);

    render(<PointsPage />);

    fireEvent.click(screen.getByRole("button", { name: "points.monthlyTab" }));
    expect(screen.getByText("points.noRankingData")).toBeInTheDocument();
    expect(screen.getByText("points.noPointsHistory")).toBeInTheDocument();
  });
});
