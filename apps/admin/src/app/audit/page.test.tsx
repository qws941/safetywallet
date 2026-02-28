import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuditPage from "./page";
import { useAuditLogs } from "@/hooks/use-api";

const mockUseAuditLogs = vi.mocked(useAuditLogs);

vi.mock("@/hooks/use-api", () => ({
  useAuditLogs: vi.fn(),
}));

vi.mock("@/components/data-table", () => ({
  DataTable: ({
    data,
    columns,
    emptyMessage,
  }: {
    data: Array<{
      action: string;
      targetType: string;
      targetId: string;
      performer?: { name: string };
    }>;
    columns: Array<{
      key: string;
      render: (item: {
        action: string;
        targetType: string;
        targetId: string;
        performer?: { name: string };
      }) => React.ReactNode;
    }>;
    emptyMessage: string;
  }) => (
    <div>
      <p>{emptyMessage}</p>
      {data[0]
        ? columns.map((column) => (
            <div key={column.key}>{column.render(data[0])}</div>
          ))
        : null}
    </div>
  ),
}));

describe("AuditPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuditLogs.mockReturnValue({
      data: [
        {
          id: "audit-1",
          createdAt: "2026-02-28T00:00:00.000Z",
          action: "POST_REVIEWED",
          targetType: "post",
          targetId: "12345678-abcdef",
          performer: { name: "관리자" },
        },
      ],
      isLoading: false,
    } as ReturnType<typeof useAuditLogs>);
  });

  it("renders heading and mapped action/target labels", () => {
    render(<AuditPage />);

    expect(screen.getByText("감사 로그")).toBeInTheDocument();
    expect(screen.getByText("제보 검토")).toBeInTheDocument();
    expect(screen.getByText("제보")).toBeInTheDocument();
    expect(screen.getByText(/12345678/)).toBeInTheDocument();
    expect(screen.getByText("관리자")).toBeInTheDocument();
  });

  it("uses loading empty message", () => {
    mockUseAuditLogs.mockReturnValue({
      data: [],
      isLoading: true,
    } as ReturnType<typeof useAuditLogs>);

    render(<AuditPage />);
    expect(screen.getByText("로딩 중...")).toBeInTheDocument();
  });
});
