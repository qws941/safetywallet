import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CandidatesCard } from "../candidates-card";
import {
  useAddVoteCandidate,
  useDeleteVoteCandidate,
  useVoteCandidates,
} from "@/hooks/use-votes";
import { useMembers } from "@/hooks/use-api";

const toastMock = vi.fn();
const addAsyncMock = vi.fn();
const deleteAsyncMock = vi.fn();

vi.mock("@/stores/auth", () => ({
  useAuthStore: (selector: (s: { currentSiteId: string }) => string) =>
    selector({ currentSiteId: "site-1" }),
}));

vi.mock("@/hooks/use-votes", () => ({
  useVoteCandidates: vi.fn(),
  useAddVoteCandidate: vi.fn(),
  useDeleteVoteCandidate: vi.fn(),
}));

vi.mock("@/hooks/use-api", () => ({
  useMembers: vi.fn(),
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: ReactNode }) => (
    <thead>{children}</thead>
  ),
  TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
  TableBody: ({ children }: { children: ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
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
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  buttonVariants: () => "",
  useToast: () => ({ toast: toastMock }),
}));

const mockUseVoteCandidates = vi.mocked(useVoteCandidates);
const mockUseMembers = vi.mocked(useMembers);
const mockUseAddVoteCandidate = vi.mocked(useAddVoteCandidate);
const mockUseDeleteVoteCandidate = vi.mocked(useDeleteVoteCandidate);

describe("candidates card", () => {
  beforeEach(() => {
    toastMock.mockReset();
    addAsyncMock.mockReset();
    deleteAsyncMock.mockReset();

    mockUseVoteCandidates.mockReturnValue({
      data: [
        {
          id: "cand-1",
          source: "ADMIN",
          createdAt: "2026-02-01T00:00:00.000Z",
          user: { nameMasked: "홍길동", companyName: "안전건설" },
        },
      ],
      isLoading: false,
    } as ReturnType<typeof useVoteCandidates>);
    mockUseMembers.mockReturnValue({
      data: [{ id: "m1", user: { id: "u1", name: "김철수" } }],
    } as ReturnType<typeof useMembers>);
    mockUseAddVoteCandidate.mockReturnValue({
      mutateAsync: addAsyncMock,
    } as ReturnType<typeof useAddVoteCandidate>);
    mockUseDeleteVoteCandidate.mockReturnValue({
      mutateAsync: deleteAsyncMock,
    } as ReturnType<typeof useDeleteVoteCandidate>);
  });

  it("renders candidate table and add dialog trigger", () => {
    render(<CandidatesCard month="2026-02" />);
    expect(screen.getByText("후보자 관리")).toBeInTheDocument();
    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "후보자 추가" }),
    ).toBeInTheDocument();
  });

  it("adds candidate and clears search", async () => {
    render(<CandidatesCard month="2026-02" />);
    fireEvent.click(screen.getByRole("button", { name: "후보자 추가" }));
    fireEvent.change(screen.getByPlaceholderText("이름 또는 전화번호 검색"), {
      target: { value: "김" },
    });
    fireEvent.click(screen.getByRole("button", { name: "선택" }));

    await waitFor(() => {
      expect(addAsyncMock).toHaveBeenCalledWith({
        userId: "u1",
        month: "2026-02",
      });
    });
  });

  it("shows destructive toast when add fails", async () => {
    addAsyncMock.mockRejectedValueOnce(new Error("추가 실패"));
    render(<CandidatesCard month="2026-02" />);

    fireEvent.click(screen.getByRole("button", { name: "후보자 추가" }));
    fireEvent.click(screen.getByRole("button", { name: "선택" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" }),
      );
    });
  });
});
