import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalList } from "@/components/approvals/approval-list";

const {
  mockToast,
  mockUseManualApprovals,
  mockApproveMutate,
  mockApproveMutateAsync,
  mockRejectMutate,
} = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockUseManualApprovals: vi.fn(),
  mockApproveMutate: vi.fn(),
  mockApproveMutateAsync: vi.fn(),
  mockRejectMutate: vi.fn(),
}));

const sharedItem = {
  id: "approval-1",
  userId: "u1",
  siteId: "s1",
  reason: "사유",
  validDate: "2026-02-14T00:00:00.000Z",
  status: "PENDING" as const,
  createdAt: "2026-02-14T01:00:00.000Z",
  user: { id: "u1", name: "홍길동", companyName: "건설사", tradeType: null },
};

vi.mock("@safetywallet/ui", async () => {
  const React = await import("react");
  return {
    Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props} />
    ),
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
      <input {...props} />
    ),
    Badge: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
    cn: (...classes: Array<string | false | null | undefined>) =>
      classes.filter(Boolean).join(" "),
    toast: mockToast,
  };
});

vi.mock("@/components/approvals/reject-dialog", () => ({
  RejectDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="reject-dialog">reject</div> : null,
}));

vi.mock("@/hooks/use-api", () => ({
  useManualApprovals: (...args: unknown[]) => mockUseManualApprovals(...args),
  useApproveManualRequest: () => ({
    mutate: mockApproveMutate,
    mutateAsync: mockApproveMutateAsync,
    isPending: false,
  }),
  useRejectManualRequest: () => ({
    mutate: mockRejectMutate,
    isPending: false,
  }),
}));

describe("ApprovalList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseManualApprovals.mockReturnValue({
      isLoading: false,
      data: [sharedItem],
    });
  });

  it("approves single request from pending list", async () => {
    mockApproveMutate.mockImplementation(
      (_id, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      },
    );

    render(<ApprovalList status="PENDING" selectable />);
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() => {
      expect(mockApproveMutate).toHaveBeenCalledWith(
        "approval-1",
        expect.any(Object),
      );
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "승인되었습니다." }),
    );
  });

  it("opens reject dialog on reject action", () => {
    render(<ApprovalList status="PENDING" selectable />);
    fireEvent.click(screen.getByRole("button", { name: "거절" }));
    expect(screen.getByTestId("reject-dialog")).toBeInTheDocument();
  });

  it("shows history-only columns and filters pending in history mode", () => {
    mockUseManualApprovals.mockReturnValue({
      isLoading: false,
      data: [
        sharedItem,
        {
          ...sharedItem,
          id: "approval-2",
          status: "REJECTED",
          rejectionReason: "근거 부족",
          approvedBy: { id: "admin-1", name: "관리자" },
        },
      ],
    });

    render(<ApprovalList status="HISTORY" />);

    expect(screen.queryByText("대기중")).not.toBeInTheDocument();
    expect(screen.getByText("처리자")).toBeInTheDocument();
    expect(screen.getByText("근거 부족")).toBeInTheDocument();
  });
});
