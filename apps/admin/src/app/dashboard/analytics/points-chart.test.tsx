import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PointsChart } from "./points-chart";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  PieChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe("PointsChart", () => {
  it("renders chart title and description", () => {
    render(
      <PointsChart
        data={[
          { reasonCode: "POST_APPROVED", totalAmount: 300, count: 3 },
          { reasonCode: "UNKNOWN", totalAmount: 100, count: 1 },
        ]}
      />,
    );

    expect(screen.getByText("포인트 사유 분포")).toBeInTheDocument();
    expect(
      screen.getByText("선택 기간의 reasonCode 별 지급/회수 합계"),
    ).toBeInTheDocument();
  });
});
