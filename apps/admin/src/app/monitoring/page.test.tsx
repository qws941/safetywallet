import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MonitoringPage from "./page";
import {
  useMonitoringSummary,
  useMonitoringMetrics,
  useMonitoringTopErrors,
} from "@/hooks/use-monitoring-api";

vi.mock("@/hooks/use-monitoring-api", () => ({
  useMonitoringSummary: vi.fn(),
  useMonitoringMetrics: vi.fn(),
  useMonitoringTopErrors: vi.fn(),
}));

vi.mock("@safetywallet/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@safetywallet/ui")>();
  return {
    ...actual,
    Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SelectTrigger: ({ children }: { children: ReactNode }) => (
      <button type="button">{children}</button>
    ),
    SelectValue: () => <span>period</span>,
    SelectContent: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    SelectItem: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

const mockUseMonitoringSummary = vi.mocked(useMonitoringSummary);
const mockUseMonitoringMetrics = vi.mocked(useMonitoringMetrics);
const mockUseMonitoringTopErrors = vi.mocked(useMonitoringTopErrors);

describe("MonitoringPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMonitoringSummary.mockReturnValue({
      data: {
        totalRequests: 1234,
        errorRate: 3.2,
        totalErrors: 10,
        avgDurationMs: 530,
        maxDurationMs: 1800,
        statusBreakdown: { "2xx": 1200, "4xx": 20, "5xx": 14 },
      },
      isLoading: false,
    } as ReturnType<typeof useMonitoringSummary>);

    mockUseMonitoringMetrics.mockImplementation((kind: string) => {
      if (kind === "time") {
        return {
          data: {
            rows: [
              {
                bucket: "2026-02-28T10:00:00.000Z",
                totalRequests: 100,
                totalErrors: 5,
              },
            ],
          },
          isLoading: false,
        } as ReturnType<typeof useMonitoringMetrics>;
      }

      return {
        data: {
          rows: [
            {
              method: "GET",
              endpoint: "/admin/posts",
              totalRequests: 20,
              avgDurationMs: 120,
            },
          ],
        },
        isLoading: false,
      } as ReturnType<typeof useMonitoringMetrics>;
    });

    mockUseMonitoringTopErrors.mockReturnValue({
      data: {
        rows: [
          {
            method: "POST",
            endpoint: "/reviews",
            totalRequests: 15,
            errorRate: 12,
            total5xx: 2,
          },
        ],
      },
      isLoading: false,
    } as ReturnType<typeof useMonitoringTopErrors>);
  });

  it("renders summary cards and metric sections", () => {
    render(<MonitoringPage />);

    expect(screen.getByText("운영 모니터링")).toBeInTheDocument();
    expect(screen.getByText("총 요청 수")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("요청 추이")).toBeInTheDocument();
    expect(screen.getByText("엔드포인트별 요청")).toBeInTheDocument();
    expect(screen.getByText("에러 상위 엔드포인트")).toBeInTheDocument();
  });

  it("renders empty-state messages when metric arrays are empty", () => {
    mockUseMonitoringMetrics.mockReturnValue({
      data: { rows: [] },
      isLoading: false,
    } as ReturnType<typeof useMonitoringMetrics>);
    mockUseMonitoringTopErrors.mockReturnValue({
      data: { rows: [] },
      isLoading: false,
    } as ReturnType<typeof useMonitoringTopErrors>);

    render(<MonitoringPage />);

    expect(
      screen.getByText("해당 기간에 수집된 메트릭이 없습니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("데이터 없음")).toBeInTheDocument();
    expect(screen.getByText("에러가 감지되지 않았습니다.")).toBeInTheDocument();
  });

  it("renders loading placeholders for summary and sub-sections", () => {
    mockUseMonitoringSummary.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useMonitoringSummary>);
    mockUseMonitoringMetrics.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useMonitoringMetrics>);
    mockUseMonitoringTopErrors.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useMonitoringTopErrors>);

    render(<MonitoringPage />);

    expect(screen.getByText("운영 모니터링")).toBeInTheDocument();
    expect(screen.queryByText("1,234")).not.toBeInTheDocument();
  });
});
