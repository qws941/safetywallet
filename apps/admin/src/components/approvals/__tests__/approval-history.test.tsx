import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalHistory } from "../approval-history";
import { useManualApprovals } from "@/hooks/use-api";

interface ApprovalRow {
  id: string;
}

interface MockDataTableProps {
  data: ApprovalRow[];
  emptyMessage?: string;
}

let latestProps: MockDataTableProps | null = null;

vi.mock("@/hooks/use-api", () => ({
  useManualApprovals: vi.fn(),
}));

vi.mock("@/components/data-table", () => ({
  DataTable: (props: MockDataTableProps) => {
    latestProps = props;
    return (
      <div>
        <p>{props.emptyMessage}</p>
        <p data-testid="history-count">{props.data.length}</p>
      </div>
    );
  },
}));

vi.mock("@safetywallet/ui", () => ({
  Button: ({ children }: { children: ReactNode }) => (
    <button>{children}</button>
  ),
}));

const mockUseManualApprovals = vi.mocked(useManualApprovals);

const toResult = (value: unknown): ReturnType<typeof useManualApprovals> =>
  value as never;

describe("ApprovalHistory", () => {
  beforeEach(() => {
    latestProps = null;
  });

  it("shows loading empty message", () => {
    mockUseManualApprovals.mockReturnValue(
      toResult({ data: [], isLoading: true }),
    );

    render(<ApprovalHistory siteId="site-1" />);

    expect(screen.getByText("로딩 중...")).toBeInTheDocument();
    expect(screen.getByTestId("history-count")).toHaveTextContent("0");
  });

  it("renders history rows", () => {
    mockUseManualApprovals.mockReturnValue(
      toResult({
        data: [
          {
            id: "h-1",
            user: { name: "홍길동", companyName: "안전건설" },
            reason: "사유",
            validDate: "2026-03-01T00:00:00.000Z",
            createdAt: "2026-03-01T00:00:00.000Z",
          },
        ],
        isLoading: false,
      }),
    );

    render(<ApprovalHistory />);

    expect(screen.getByTestId("history-count")).toHaveTextContent("1");
    expect(latestProps?.data).toHaveLength(1);
  });
});
