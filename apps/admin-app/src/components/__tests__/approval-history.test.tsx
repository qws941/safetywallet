import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApprovalHistory } from "@/components/approvals/approval-history";

const mockUseManualApprovals = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useManualApprovals: (siteId?: string) => mockUseManualApprovals(siteId),
}));

describe("ApprovalHistory", () => {
  it("renders manual approval rows", () => {
    mockUseManualApprovals.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: "a1",
          reason: "사유",
          validDate: "2026-02-14T00:00:00.000Z",
          createdAt: "2026-02-14T01:00:00.000Z",
          user: {
            id: "u1",
            name: "홍길동",
            companyName: "건설사",
            tradeType: null,
          },
          status: "APPROVED",
          siteId: "s1",
          userId: "u1",
        },
      ],
    });

    render(<ApprovalHistory siteId="s1" />);

    expect(screen.getByText("작업자")).toBeInTheDocument();
    expect(screen.getByText("홍길동 (건설사)")).toBeInTheDocument();
    expect(screen.getAllByText("사유").length).toBeGreaterThan(0);
  });

  it("shows loading empty message when loading", () => {
    mockUseManualApprovals.mockReturnValue({ isLoading: true, data: [] });
    render(<ApprovalHistory />);
    expect(screen.getByText("로딩 중...")).toBeInTheDocument();
  });

  it("renders dash for missing user name and company", () => {
    mockUseManualApprovals.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: "a2",
          reason: "테스트",
          validDate: "2026-02-14T00:00:00.000Z",
          createdAt: "2026-02-14T01:00:00.000Z",
          user: {
            id: "u2",
            name: null,
            companyName: null,
            tradeType: null,
          },
          status: "APPROVED",
          siteId: "s1",
          userId: "u2",
        },
      ],
    });

    render(<ApprovalHistory siteId="s1" />);
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});
