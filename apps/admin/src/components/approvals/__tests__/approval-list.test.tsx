import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalList } from "../approval-list";
import { useApproveManualRequest, useManualApprovals } from "@/hooks/use-api";

const toastMock = vi.fn();
const approveMutateMock = vi.fn();
const approveMutateAsyncMock = vi.fn();

interface ManualApprovalItem {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string;
  validDate: string;
  createdAt: string;
  rejectionReason?: string;
  approvedBy?: { name?: string | null };
  user: {
    name?: string | null;
    companyName?: string | null;
  };
}

interface MockDataTableProps {
  columns: Array<{
    key: string;
    header: string;
    render?: (item: ManualApprovalItem) => ReactNode;
  }>;
  data: ManualApprovalItem[];
  emptyMessage?: string;
  onSelectionChange?: (items: ManualApprovalItem[]) => void;
}

let latestTableProps: MockDataTableProps | null = null;

vi.mock("@/hooks/use-api", () => ({
  useManualApprovals: vi.fn(),
  useApproveManualRequest: vi.fn(),
  useRejectManualRequest: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@safetywallet/ui", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: (e: { stopPropagation: () => void }) => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick?.({ stopPropagation: () => undefined })}
    >
      {children}
    </button>
  ),
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  toast: toastMock,
}));

vi.mock("@/components/data-table", () => ({
  DataTable: (props: MockDataTableProps) => {
    latestTableProps = props;
    return (
      <div>
        <p>{props.emptyMessage}</p>
        <button
          type="button"
          onClick={() => props.onSelectionChange?.(props.data.slice(0, 2))}
        >
          select-two
        </button>
        <p data-testid="row-count">{props.data.length}</p>
        {props.data[0] &&
          props.columns.map((column) => (
            <div key={column.key} data-testid={`col-${column.key}`}>
              {column.render ? column.render(props.data[0]) : null}
            </div>
          ))}
      </div>
    );
  },
}));

vi.mock("../reject-dialog", () => ({
  RejectDialog: ({
    isOpen,
    approvalId,
  }: {
    isOpen: boolean;
    approvalId: string;
  }) => <div data-testid="reject-dialog">{isOpen ? approvalId : "closed"}</div>,
}));

const mockUseManualApprovals = vi.mocked(useManualApprovals);
const mockUseApproveManualRequest = vi.mocked(useApproveManualRequest);

const toApprovalsResult = (
  value: unknown,
): ReturnType<typeof useManualApprovals> =>
  value as ReturnType<typeof useManualApprovals>;

const approvals: ManualApprovalItem[] = [
  {
    id: "ap-1",
    status: "PENDING",
    reason: "현장 출입 승인",
    validDate: "2026-02-28T00:00:00.000Z",
    createdAt: "2026-02-28T00:00:00.000Z",
    user: { name: "홍길동", companyName: "안전건설" },
  },
  {
    id: "ap-2",
    status: "APPROVED",
    reason: "야간 작업",
    validDate: "2026-02-28T00:00:00.000Z",
    createdAt: "2026-02-27T00:00:00.000Z",
    approvedBy: { name: "관리자" },
    user: { name: "김철수", companyName: "대한건설" },
  },
];

describe("ApprovalList", () => {
  beforeEach(() => {
    toastMock.mockReset();
    approveMutateMock.mockReset();
    approveMutateAsyncMock.mockReset();
    latestTableProps = null;

    mockUseManualApprovals.mockReturnValue(
      toApprovalsResult({ data: approvals, isLoading: false }),
    );
    mockUseApproveManualRequest.mockReturnValue({
      mutate: approveMutateMock,
      mutateAsync: approveMutateAsyncMock,
      isPending: false,
    } as ReturnType<typeof useApproveManualRequest>);
  });

  it("renders pending list and approves single item", async () => {
    approveMutateMock.mockImplementation(
      (_id, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      },
    );

    render(<ApprovalList status="PENDING" selectable />);

    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() => {
      expect(approveMutateMock).toHaveBeenCalledWith(
        "ap-1",
        expect.any(Object),
      );
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: "승인되었습니다." }),
      );
    });
  });

  it("shows error toast when single approve fails", async () => {
    approveMutateMock.mockImplementation(
      (_id, options: { onError?: (e: Error) => void }) => {
        options.onError?.(new Error("실패"));
      },
    );

    render(<ApprovalList status="PENDING" selectable />);
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          description: "실패",
        }),
      );
    });
  });

  it("handles bulk approve flow", async () => {
    approveMutateAsyncMock.mockResolvedValue({});

    render(<ApprovalList status="PENDING" selectable />);
    fireEvent.click(screen.getByRole("button", { name: "select-two" }));
    fireEvent.click(screen.getByRole("button", { name: "일괄 승인" }));

    await waitFor(() => {
      expect(approveMutateAsyncMock).toHaveBeenCalledTimes(2);
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: "2건 승인되었습니다." }),
      );
    });
  });

  it("opens reject dialog from pending action", () => {
    render(<ApprovalList status="PENDING" selectable />);

    fireEvent.click(screen.getByRole("button", { name: "거절" }));
    expect(screen.getByTestId("reject-dialog")).toHaveTextContent("ap-1");
  });

  it("renders history-specific columns and filters pending rows out", () => {
    render(<ApprovalList status="HISTORY" />);

    expect(latestTableProps?.data).toHaveLength(1);
    expect(screen.getByTestId("col-approvedBy.name")).toHaveTextContent(
      "관리자",
    );
    expect(screen.getByTestId("col-rejectionReason")).toHaveTextContent("-");
    expect(screen.queryByTestId("reject-dialog")).not.toBeInTheDocument();
  });
});
