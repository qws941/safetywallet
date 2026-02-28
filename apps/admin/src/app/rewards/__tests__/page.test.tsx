import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RewardsPage from "../page";

vi.mock("@safetywallet/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(" "),
}));

vi.mock("../components/rankings-tab", () => ({
  RankingsTab: () => <div>rankings-tab</div>,
}));
vi.mock("../components/criteria-tab", () => ({
  CriteriaTab: () => <div>criteria-tab</div>,
}));
vi.mock("../components/history-tab", () => ({
  HistoryTab: () => <div>history-tab</div>,
}));
vi.mock("../components/distribution-tab", () => ({
  DistributionTab: () => <div>distribution-tab</div>,
}));
vi.mock("../components/export-tab", () => ({
  ExportTab: () => <div>export-tab</div>,
}));

describe("rewards page", () => {
  it("switches reward tabs", () => {
    render(<RewardsPage />);
    expect(screen.getByText("포상 관리")).toBeInTheDocument();
    expect(screen.getByText("rankings-tab")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "포상 기준" }));
    expect(screen.getByText("criteria-tab")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "지급 내역" }));
    expect(screen.getByText("history-tab")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "배분 기록" }));
    expect(screen.getByText("distribution-tab")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "내보내기" }));
    expect(screen.getByText("export-tab")).toBeInTheDocument();
  });
});
