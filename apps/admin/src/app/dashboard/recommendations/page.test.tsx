import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecommendationStatsPage from "./page";
import { useRecommendationStats } from "@/hooks/use-recommendations";

vi.mock("@/hooks/use-recommendations", () => ({
  useRecommendationStats: vi.fn(),
}));

const mockUseRecommendationStats = vi.mocked(useRecommendationStats);

describe("RecommendationStatsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRecommendationStats.mockReturnValue({
      data: {
        totalRecommendations: 7,
        topRecommended: [
          { recommendedName: "홍길동", tradeType: "배관", count: 3 },
        ],
        dailyCounts: [{ date: "2026-02-10", count: 2 }],
      },
      isLoading: false,
    } as never);
  });

  it("renders loading skeleton when query is loading", () => {
    mockUseRecommendationStats.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);

    render(<RecommendationStatsPage />);

    expect(screen.getByText("추천 통계")).toBeInTheDocument();
    expect(
      screen.queryByText("최다 추천 근로자 TOP 10"),
    ).not.toBeInTheDocument();
  });

  it("renders summary cards and list/chart sections", () => {
    render(<RecommendationStatsPage />);

    expect(screen.getByText("총 추천 수")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("최다 추천 근로자 TOP 10")).toBeInTheDocument();
    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText("일별 추천 추이")).toBeInTheDocument();
  });

  it("shows empty placeholders for list and trend when result arrays are empty", () => {
    mockUseRecommendationStats.mockReturnValue({
      data: {
        totalRecommendations: 0,
        topRecommended: [],
        dailyCounts: [],
      },
      isLoading: false,
    } as never);

    render(<RecommendationStatsPage />);

    expect(screen.getAllByText("데이터 없음")).toHaveLength(2);
  });

  it("updates filter args and supports reset", () => {
    render(<RecommendationStatsPage />);

    const dateInputs = screen.getAllByDisplayValue("") as HTMLInputElement[];
    fireEvent.change(dateInputs[0], { target: { value: "2026-01-01" } });
    fireEvent.change(dateInputs[1], { target: { value: "2026-01-31" } });

    expect(mockUseRecommendationStats).toHaveBeenLastCalledWith(
      "2026-01-01",
      "2026-01-31",
    );

    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    expect(mockUseRecommendationStats).toHaveBeenLastCalledWith(
      undefined,
      undefined,
    );
  });
});
