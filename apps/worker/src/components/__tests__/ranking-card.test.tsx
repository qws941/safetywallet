import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RankingCard } from "@/components/ranking-card";

vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));
vi.mock("@safetywallet/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@safetywallet/ui")>(
      "@safetywallet/ui",
    );
  return {
    ...actual,
    Skeleton: ({ className }: { className?: string }) => (
      <div data-testid="skeleton" className={className} />
    ),
  };
});

describe("RankingCard", () => {
  it("renders skeleton while loading", () => {
    render(<RankingCard myRank={null} isLoading />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("shows rank and participant count when rank exists", () => {
    render(
      <RankingCard myRank={3} totalParticipants={120} isLoading={false} />,
    );

    expect(screen.getByText("rankingCard.monthlyRank")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(
      screen.getByText("/ 120rankingCard.participants"),
    ).toBeInTheDocument();
    expect(screen.getByText("rankingCard.challengeRank1")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/points");
  });

  it("shows no-rank message when rank is null", () => {
    render(<RankingCard myRank={null} isLoading={false} />);

    expect(screen.getByText("rankingCard.noRank")).toBeInTheDocument();
    expect(screen.getByText("rankingCard.collectPoints")).toBeInTheDocument();
  });
});
