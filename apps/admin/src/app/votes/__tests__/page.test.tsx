import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VotesPage from "../page";

vi.mock("@safetywallet/ui", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("../components/vote-period-card", () => ({
  VotePeriodCard: ({ month }: { month: string }) => (
    <div data-testid="period">{month}</div>
  ),
}));

vi.mock("../components/candidates-card", () => ({
  CandidatesCard: ({ month }: { month: string }) => (
    <div data-testid="candidates">{month}</div>
  ),
}));

vi.mock("../components/results-card", () => ({
  ResultsCard: ({ month }: { month: string }) => (
    <div data-testid="results">{month}</div>
  ),
}));

describe("votes page", () => {
  it("renders title and passes selected month to child cards", () => {
    render(<VotesPage />);

    expect(screen.getByText("투표 관리")).toBeInTheDocument();
    const monthInput = screen.getByDisplayValue(
      new Date().toISOString().slice(0, 7),
    );
    expect(monthInput).toHaveAttribute("type", "month");

    fireEvent.change(monthInput, { target: { value: "2026-03" } });

    expect(screen.getByTestId("period")).toHaveTextContent("2026-03");
    expect(screen.getByTestId("candidates")).toHaveTextContent("2026-03");
    expect(screen.getByTestId("results")).toHaveTextContent("2026-03");
  });
});
