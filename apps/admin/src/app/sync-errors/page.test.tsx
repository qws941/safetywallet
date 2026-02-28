import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SyncErrorsPage from "./page";
import {
  useSyncErrors,
  useUpdateSyncErrorStatus,
} from "@/hooks/use-sync-errors";

const updateStatusMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/hooks/use-sync-errors", () => ({
  useSyncErrors: vi.fn(),
  useUpdateSyncErrorStatus: vi.fn(),
}));

vi.mock("@safetywallet/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@safetywallet/ui")>();
  return {
    ...actual,
    toast: (args: unknown) => toastMock(args),
    Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SelectTrigger: ({ children }: { children: ReactNode }) => (
      <button type="button">{children}</button>
    ),
    SelectValue: ({ placeholder }: { placeholder?: string }) => (
      <span>{placeholder ?? ""}</span>
    ),
    SelectContent: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    SelectItem: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialog: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogContent: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogHeader: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogTitle: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogDescription: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogFooter: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    AlertDialogAction: ({
      children,
      onClick,
      disabled,
    }: {
      children: ReactNode;
      onClick?: () => void;
      disabled?: boolean;
    }) => (
      <button type="button" onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
    AlertDialogCancel: ({ children }: { children: ReactNode }) => (
      <button type="button">{children}</button>
    ),
  };
});

vi.mock("@/components/data-table", () => ({
  DataTable: ({
    data,
    columns,
  }: {
    data: Array<{
      id: string;
      status: "OPEN" | "RESOLVED" | "IGNORED";
      createdAt: string;
      syncType: string;
      errorCode: string;
      errorMessage: string;
      siteId: string;
      retryCount: number;
    }>;
    columns: Array<{
      key: string;
      render: (item: {
        id: string;
        status: "OPEN" | "RESOLVED" | "IGNORED";
        createdAt: string;
        syncType: string;
        errorCode: string;
        errorMessage: string;
        siteId: string;
        retryCount: number;
      }) => ReactNode;
    }>;
  }) => (
    <div>
      <p>table</p>
      {data[0]
        ? columns.map((column) => (
            <div key={column.key}>{column.render(data[0])}</div>
          ))
        : null}
    </div>
  ),
}));

const mockUseSyncErrors = vi.mocked(useSyncErrors);
const mockUseUpdateSyncErrorStatus = vi.mocked(useUpdateSyncErrorStatus);

describe("SyncErrorsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSyncErrors.mockReturnValue({
      data: {
        total: 1,
        errors: [
          {
            id: "err-1",
            createdAt: "2026-02-28T00:00:00.000Z",
            syncType: "FAS_ATTENDANCE",
            errorCode: "E001",
            errorMessage: "sync failed",
            status: "OPEN",
            siteId: "site-1",
            retryCount: 1,
          },
        ],
      },
      isLoading: false,
    } as never);

    mockUseUpdateSyncErrorStatus.mockReturnValue({
      mutate: updateStatusMock,
      isPending: false,
    } as never);
  });

  it("renders header and open row actions", () => {
    render(<SyncErrorsPage />);

    expect(screen.getByText("FAS 동기화 에러 관리")).toBeInTheDocument();
    expect(screen.getByText("총 1건")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "RESOLVED" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "IGNORED" })).toBeInTheDocument();
  });

  it("shows loading message while query is loading", () => {
    mockUseSyncErrors.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);

    render(<SyncErrorsPage />);
    expect(screen.getByText("로딩 중...")).toBeInTheDocument();
  });

  it("updates status and emits success toast", async () => {
    updateStatusMock.mockImplementation((_payload, opts) => {
      opts?.onSuccess?.();
    });

    render(<SyncErrorsPage />);
    fireEvent.click(screen.getByRole("button", { name: "RESOLVED" }));
    fireEvent.click(screen.getByRole("button", { name: "변경" }));

    await waitFor(() => {
      expect(updateStatusMock).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalled();
    });
  });
});
