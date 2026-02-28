import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TrendChart } from "./trend-chart";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Line: () => null,
  Bar: () => null,
}));

describe("TrendChart", () => {
  it("renders daily and category chart sections", () => {
    render(
      <TrendChart
        postsTrend={[
          { date: "2026-02-01", count: 2, category: "HAZARD" },
          { date: "2026-02-01", count: 1, category: "UNKNOWN_CODE" },
        ]}
        attendanceTrend={[{ date: "2026-02-01", count: 3 }]}
      />,
    );

    expect(screen.getByText("일별 추이")).toBeInTheDocument();
    expect(screen.getByText("카테고리별 게시물")).toBeInTheDocument();
  });
});
