import { Activity } from "lucide-react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatsCard } from "@/components/stats-card";

describe("StatsCard", () => {
  it("renders title, value, description and positive trend", () => {
    render(
      <StatsCard
        title="활성 사용자"
        value={120}
        description="오늘 기준"
        icon={Activity}
        trend={{ value: 12, isPositive: true }}
      />,
    );

    expect(screen.getByText("활성 사용자")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("오늘 기준")).toBeInTheDocument();
    expect(screen.getByText("+12% 전주 대비")).toBeInTheDocument();
  });

  it("renders negative trend without plus sign", () => {
    render(
      <StatsCard
        title="처리 시간"
        value="8h"
        icon={Activity}
        trend={{ value: 5, isPositive: false }}
      />,
    );

    expect(screen.getByText("5% 전주 대비")).toBeInTheDocument();
  });
});
