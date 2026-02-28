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

vi.mock("../../votes-helpers", () => ({
  epochToKstDateString: (epoch: string) => {
    const map: Record<string, string> = {
      "1706742000": "2024-02-01",
      "1709251200": "2024-03-01",
    };
    return map[epoch] || "";
  },
  dateStringToKstEpoch: (date: string) => date,
  getPeriodStatus: () => "ENDED",
  PERIOD_STATUS_CONFIG: {
    ACTIVE: { label: "ACTIVE", className: "" },
    UPCOMING: { label: "UPCOMING", className: "" },
    ENDED: { label: "ENDED", className: "" },
  },
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
    } as never);
    mockUseUpdateVotePeriod.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as never);
  });

  it("renders period dates and status", () => {
    render(<VotePeriodCard month="2026-02" />);
    expect(screen.getByText("투표 기간 설정")).toBeInTheDocument();
    expect(screen.getByText(/ACTIVE|UPCOMING|ENDED/)).toBeInTheDocument();
  });

  it("submits updated period", async () => {
    mutateAsyncMock.mockResolvedValueOnce({});
    render(<VotePeriodCard month="2026-02" />);

    // Wait for useEffect to populate dates from mocked epochToKstDateString
    await waitFor(() => {
      expect(screen.getByLabelText("종료일")).toHaveValue("2024-03-01");
    });

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

    // Wait for useEffect to populate valid dates before clicking save
    await waitFor(() => {
      expect(screen.getByLabelText("종료일")).toHaveValue("2024-03-01");
    });

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" }),
      );
    });
  });
});
