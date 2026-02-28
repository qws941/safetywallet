import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CriteriaTab } from "../criteria-tab";
import {
  useCreatePolicy,
  useDeletePolicy,
  usePolicies,
  useUpdatePolicy,
} from "@/hooks/use-points-api";

const createMutateMock = vi.fn();
const updateMutateMock = vi.fn();
const deleteMutateMock = vi.fn();

vi.mock("@/stores/auth", () => ({
  useAuthStore: (selector: (s: { currentSiteId: string }) => string) =>
    selector({ currentSiteId: "site-1" }),
}));

vi.mock("@/hooks/use-points-api", () => ({
  usePolicies: vi.fn(),
  useCreatePolicy: vi.fn(),
  useUpdatePolicy: vi.fn(),
  useDeletePolicy: vi.fn(),
}));

vi.mock("@/components/data-table", () => ({
  DataTable: ({
    data,
    columns,
  }: {
    data: Array<{ id: string; name: string }>;
    columns: Array<{ render?: (r: { id: string; name: string }) => ReactNode }>;
  }) => (
    <div>
      {data.map((row) => (
        <div key={row.id}>
          <span>{row.name}</span>
          {columns[columns.length - 1].render?.(row)}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@safetywallet/ui", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={props.type ?? "button"} {...props}>
      {children}
    </button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

const mockUsePolicies = vi.mocked(usePolicies);
const mockUseCreatePolicy = vi.mocked(useCreatePolicy);
const mockUseUpdatePolicy = vi.mocked(useUpdatePolicy);
const mockUseDeletePolicy = vi.mocked(useDeletePolicy);

describe("criteria tab", () => {
  beforeEach(() => {
    createMutateMock.mockReset();
    updateMutateMock.mockReset();
    deleteMutateMock.mockReset();

    mockUsePolicies.mockReturnValue({
      data: [
        {
          id: "p1",
          reasonCode: "REWARD",
          name: "포상 포인트",
          defaultAmount: 10,
          minAmount: 1,
          maxAmount: 100,
          dailyLimit: 10,
          monthlyLimit: 100,
          isActive: true,
        },
      ],
    } as ReturnType<typeof usePolicies>);
    mockUseCreatePolicy.mockReturnValue({
      mutate: createMutateMock,
      isPending: false,
    } as ReturnType<typeof useCreatePolicy>);
    mockUseUpdatePolicy.mockReturnValue({
      mutate: updateMutateMock,
      isPending: false,
    } as ReturnType<typeof useUpdatePolicy>);
    mockUseDeletePolicy.mockReturnValue({
      mutate: deleteMutateMock,
    } as ReturnType<typeof useDeletePolicy>);
  });

  it("creates policy", async () => {
    render(<CriteriaTab />);
    fireEvent.click(screen.getByRole("button", { name: "+ 기준 추가" }));
    fireEvent.change(screen.getByPlaceholderText("예: SAFETY_REPORT"), {
      target: { value: "SAFE" },
    });
    fireEvent.change(screen.getByPlaceholderText("예: 안전 제보 포인트"), {
      target: { value: "안전 포인트" },
    });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    await waitFor(() => {
      expect(createMutateMock).toHaveBeenCalled();
    });
  });

  it("edits and deletes policy", async () => {
    render(<CriteriaTab />);
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    await waitFor(() => {
      expect(updateMutateMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(deleteMutateMock).toHaveBeenCalledWith("p1");
  });
});
