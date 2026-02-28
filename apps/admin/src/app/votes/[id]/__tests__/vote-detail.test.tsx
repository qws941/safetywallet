import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VoteDetailPage from "../vote-detail";

const pushMock = vi.fn();
const toastMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const mutateMock = vi.fn();

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: "2026-02" }),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: (selector: (s: { currentSiteId: string }) => string) =>
    selector({ currentSiteId: "site-1" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
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
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: { children: ReactNode }) => (
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
  AlertDialogCancel: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  AlertDialogAction: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  useToast: () => ({ toast: toastMock }),
}));

const baseData = {
  period: { id: "p1" },
  results: [
    {
      candidateId: "c1",
      voteCount: 5,
      user: {
        nameMasked: "홍길동",
        name: "홍길동",
        companyName: "안전건설",
        tradeType: "전기",
      },
    },
  ],
};

describe("vote detail page", () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastMock.mockReset();
    invalidateQueriesMock.mockReset();
    mutateMock.mockReset();

    useQueryMock.mockReturnValue({ data: baseData, isLoading: false });
    useMutationMock.mockImplementation(
      ({ onSuccess }: { onSuccess?: () => void }) => ({
        mutate: (_id: string) => {
          mutateMock();
          onSuccess?.();
        },
      }),
    );

    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string) => {
        const element = document.createElementNS(
          "http://www.w3.org/1999/xhtml",
          tagName,
        );
        if (tagName === "a") {
          Object.defineProperty(element, "click", {
            value: vi.fn(),
          });
        }
        return element;
      },
    );
  });

  it("shows loading state", () => {
    useQueryMock.mockReturnValueOnce({ data: undefined, isLoading: true });
    render(<VoteDetailPage />);
    expect(screen.getByText("로딩 중...")).toBeInTheDocument();
  });

  it("renders details and handles navigation and csv export", () => {
    render(<VoteDetailPage />);

    expect(screen.getByText("2026-02 투표 현황")).toBeInTheDocument();
    expect(screen.getByText("총 5명 참여")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(pushMock).toHaveBeenCalledWith("/votes");

    fireEvent.click(screen.getByRole("button", { name: "결과 내보내기" }));
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "CSV 파일이 다운로드되었습니다." }),
    );

    fireEvent.click(screen.getByRole("button", { name: "후보 등록" }));
    expect(pushMock).toHaveBeenCalledWith("/votes/2026-02/candidates/new");
  });

  it("deletes candidate and invalidates query", async () => {
    render(<VoteDetailPage />);

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalled();
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["votes", "results", "site-1", "2026-02"],
      }),
    );
  });

  it("disables export when no results", () => {
    useQueryMock.mockReturnValueOnce({
      data: { ...baseData, results: [] },
      isLoading: false,
    });

    render(<VoteDetailPage />);
    expect(
      screen.getByRole("button", { name: "결과 내보내기" }),
    ).toBeDisabled();
    expect(screen.getByText("등록된 후보자가 없습니다.")).toBeInTheDocument();
  });
});
