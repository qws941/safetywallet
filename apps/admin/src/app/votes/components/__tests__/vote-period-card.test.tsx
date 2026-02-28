import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VotePeriodCard } from "../vote-period-card";
import { useVotePeriod, useUpdateVotePeriod } from "@/hooks/use-votes";

const mutateAsyncMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/hooks/use-votes", () => ({
  useVotePeriod: vi.fn(),
  useUpdateVotePeriod: vi.fn(),
}));

vi.mock("@safetywallet/ui", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  useToast: () => ({ toast: toastMock }),
}));

const mockUseVotePeriod = vi.mocked(useVotePeriod);
const mockUseUpdateVotePeriod = vi.mocked(useUpdateVotePeriod);

describe("vote period card", () => {
  beforeEach(() => {
    mutateAsyncMock.mockReset();
    toastMock.mockReset();
    mockUseVotePeriod.mockReturnValue({
      data: { startDate: "1706742000", endDate: "1709251200" },
    } as ReturnType<typeof useVotePeriod>);
    mockUseUpdateVotePeriod.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as ReturnType<typeof useUpdateVotePeriod>);
  });

  it("renders period dates and status", () => {
    render(<VotePeriodCard month="2026-02" />);
    expect(screen.getByText("투표 기간 설정")).toBeInTheDocument();
    expect(screen.getByText(/ACTIVE|UPCOMING|ENDED/)).toBeInTheDocument();
  });

  it("submits updated period", async () => {
    render(<VotePeriodCard month="2026-02" />);

    const inputs = screen.getAllByDisplayValue(/2024|2026/);
    fireEvent.change(inputs[0], { target: { value: "2026-02-01" } });
    fireEvent.change(inputs[1], { target: { value: "2026-02-29" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({ month: "2026-02" }),
      );
    });
  });

  it("shows error toast when update fails", async () => {
    mutateAsyncMock.mockRejectedValueOnce(new Error("저장 실패"));
    render(<VotePeriodCard month="2026-02" />);

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" }),
      );
    });
  });
});
