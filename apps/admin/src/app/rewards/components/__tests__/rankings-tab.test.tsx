import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RankingsTab } from "../rankings-tab";
import { useMonthlyRankings } from "@/hooks/use-rewards";

vi.mock("@/stores/auth", () => ({
  useAuthStore: (selector: (s: { currentSiteId: string }) => string) =>
    selector({ currentSiteId: "site-1" }),
}));

vi.mock("@/hooks/use-rewards", () => ({
  useMonthlyRankings: vi.fn(),
}));

vi.mock("@/components/data-table", () => ({
  DataTable: ({ data }: { data: Array<{ nameMasked: string }> }) => (
    <div>{data.map((d) => d.nameMasked).join(",")}</div>
  ),
}));

vi.mock("@safetywallet/ui", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

const mockUseMonthlyRankings = vi.mocked(useMonthlyRankings);

describe("rankings tab", () => {
  it("renders loading state", () => {
    mockUseMonthlyRankings.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useMonthlyRankings>);
    render(<RankingsTab />);
    expect(screen.getByText("로딩 중...")).toBeInTheDocument();
  });

  it("renders leaderboard", () => {
    mockUseMonthlyRankings.mockReturnValueOnce({
      data: {
        leaderboard: [
          {
            rank: 1,
            nameMasked: "홍길동",
            totalPoints: 1000,
            isCurrentUser: true,
          },
        ],
      },
      isLoading: false,
    } as ReturnType<typeof useMonthlyRankings>);
    render(<RankingsTab />);
    expect(screen.getByText(/월간 순위/)).toBeInTheDocument();
    expect(screen.getByText("홍길동")).toBeInTheDocument();
  });
});
