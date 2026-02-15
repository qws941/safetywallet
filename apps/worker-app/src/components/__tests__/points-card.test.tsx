import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PointsCard } from "@/components/points-card";

vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));

describe("PointsCard", () => {
  it("renders point balance with Korean formatting", () => {
    render(<PointsCard balance={1234567} />);

    expect(screen.getByText("pointsCard.myPoints")).toBeInTheDocument();
    expect(screen.getByText("1,234,567 P")).toBeInTheDocument();
  });

  it("shows recent points only when positive", () => {
    const { rerender } = render(
      <PointsCard balance={1000} recentPoints={500} />,
    );
    expect(screen.getByText("pointsCard.thisMonth +500 P")).toBeInTheDocument();

    rerender(<PointsCard balance={1000} recentPoints={0} />);
    expect(screen.queryByText(/pointsCard.thisMonth/)).not.toBeInTheDocument();
  });

  it("shows monthly delta for positive and negative values", () => {
    const { rerender } = render(<PointsCard balance={1000} delta={250} />);
    expect(
      screen.getByText("pointsCard.monthlyChange ▲ 250 P"),
    ).toBeInTheDocument();

    rerender(<PointsCard balance={1000} delta={-300} />);
    expect(
      screen.getByText("pointsCard.monthlyChange ▼ 300 P"),
    ).toBeInTheDocument();
  });
});
