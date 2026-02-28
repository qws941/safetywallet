import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";
import { useDashboardStats } from "@/hooks/use-api";
import {
  useAttendanceTrend,
  usePointsDistribution,
  usePostsTrend,
} from "@/hooks/use-trends";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Line: () => null,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}));

vi.mock("@/hooks/use-api", () => ({
  useDashboardStats: vi.fn(),
}));

vi.mock("@/hooks/use-trends", () => ({
  usePostsTrend: vi.fn(),
  useAttendanceTrend: vi.fn(),
  usePointsDistribution: vi.fn(),
}));

const mockUseDashboardStats = vi.mocked(useDashboardStats);
const mockUsePostsTrend = vi.mocked(usePostsTrend);
const mockUseAttendanceTrend = vi.mocked(useAttendanceTrend);
const mockUsePointsDistribution = vi.mocked(usePointsDistribution);

const toDashboardStatsResult = (
  value: unknown,
): ReturnType<typeof useDashboardStats> =>
  value as ReturnType<typeof useDashboardStats>;

const toPostsTrendResult = (value: unknown): ReturnType<typeof usePostsTrend> =>
  value as ReturnType<typeof usePostsTrend>;

const toAttendanceTrendResult = (
  value: unknown,
): ReturnType<typeof useAttendanceTrend> =>
  value as ReturnType<typeof useAttendanceTrend>;

const toPointsDistributionResult = (
  value: unknown,
): ReturnType<typeof usePointsDistribution> =>
  value as ReturnType<typeof usePointsDistribution>;

function createMockQueryResult<T>(
  data: T,
  isLoading = false,
  isSuccess = true,
): {
  data: T;
  isLoading: boolean;
  isSuccess: boolean;
} {
  return {
    data,
    isLoading,
    isSuccess,
  };
}

describe("DashboardPage", () => {
  beforeEach(() => {
    mockUseDashboardStats.mockReturnValue(
      toDashboardStatsResult({
        ...createMockQueryResult({
          todayPostsCount: 7,
          pendingCount: 3,
          urgentCount: 1,
          avgProcessingHours: 52,
          totalUsers: 30,
          totalPosts: 120,
          activeUsersToday: 12,
          totalSites: 4,
          categoryDistribution: {
            HAZARD: 0,
            UNSAFE_BEHAVIOR: 0,
            INCONVENIENCE: 0,
            SUGGESTION: 0,
            BEST_PRACTICE: 0,
          },
        }),
      }),
    );

    mockUsePostsTrend.mockReturnValue(
      toPostsTrendResult(createMockQueryResult([])),
    );
    mockUseAttendanceTrend.mockReturnValue(
      toAttendanceTrendResult(createMockQueryResult([])),
    );
    mockUsePointsDistribution.mockReturnValue(
      toPointsDistributionResult(createMockQueryResult([])),
    );
  });

  it("shows loading state while dashboard stats are loading", () => {
    mockUseDashboardStats.mockReturnValue(
      toDashboardStatsResult(createMockQueryResult(undefined, true, false)),
    );

    render(<DashboardPage />);

    expect(screen.getByText("대시보드")).toBeInTheDocument();
    expect(screen.queryByText("오늘 제보")).not.toBeInTheDocument();
  });

  it("renders backlog warning and empty chart states", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByText("48시간 이상 미검토 건이 있습니다"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("카테고리 분포")).toBeInTheDocument();
    expect(
      screen.getAllByText("데이터가 없습니다").length,
    ).toBeGreaterThanOrEqual(1);
  });
});
