import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VoteCandidatesPage from "../page";
import { useDeleteVoteCandidate, useVoteCandidates } from "@/hooks/use-votes";

const deleteMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/hooks/use-votes", () => ({
  useVoteCandidates: vi.fn(),
  useDeleteVoteCandidate: vi.fn(),
}));

vi.mock("@/components/data-table", () => ({
  DataTable: ({ data }: { data: Array<{ user: { nameMasked: string } }> }) => (
    <div>
      {data.map((row) => (
        <div key={row.user.nameMasked}>{row.user.nameMasked}</div>
      ))}
      <button onClick={() => data[0] && data[0]}>noop</button>
    </div>
  ),
}));

vi.mock("@/components/votes/candidate-dialog", () => ({
  CandidateDialog: () => <div>candidate-dialog</div>,
}));

vi.mock("@safetywallet/ui", () => ({
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
  toast: toastMock,
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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
  AlertDialogCancel: ({ children }: { children: ReactNode }) => (
    <button>{children}</button>
  ),
  AlertDialogAction: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

const mockUseVoteCandidates = vi.mocked(useVoteCandidates);
const mockUseDeleteVoteCandidate = vi.mocked(useDeleteVoteCandidate);

describe("vote candidates page", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    toastMock.mockReset();

    mockUseVoteCandidates.mockReturnValue({
      data: [
        {
          id: "cand-1",
          source: "ADMIN",
          createdAt: "2026-02-01T00:00:00.000Z",
          user: {
            nameMasked: "홍길동",
            companyName: "안전건설",
            tradeType: "전기",
          },
        },
      ],
      isLoading: false,
    } as never);

    mockUseDeleteVoteCandidate.mockReturnValue({
      mutate: deleteMock,
    } as never);
  });

  it("renders candidate management page", () => {
    render(<VoteCandidatesPage />);
    expect(screen.getByText("투표 후보 관리")).toBeInTheDocument();
    expect(screen.getByText("candidate-dialog")).toBeInTheDocument();
    expect(screen.getByText("홍길동")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockUseVoteCandidates.mockReturnValueOnce({
      data: [],
      isLoading: true,
    } as never);

    render(<VoteCandidatesPage />);
    expect(screen.getByText("로딩 중...")).toBeInTheDocument();
  });

  it("calls delete mutation and closes dialog on success", async () => {
    deleteMock.mockImplementation(
      (_id: string, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      },
    );

    render(<VoteCandidatesPage />);

    fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalled();
    });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: "삭제되었습니다." }),
    );
  });
});
