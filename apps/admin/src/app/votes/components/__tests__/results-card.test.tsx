import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResultsCard } from "../results-card";
import { useVoteResults } from "@/hooks/use-votes";
import { exportResultsCsv } from "../../votes-helpers";

const toastMock = vi.fn();

vi.mock("@/hooks/use-votes", () => ({
  useVoteResults: vi.fn(),
}));

vi.mock("../../votes-helpers", () => ({
  exportResultsCsv: vi.fn(),
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
    <button type="button" {...props}>
      {children}
    </button>
  ),
  useToast: () => ({ toast: toastMock }),
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

const mockUseVoteResults = vi.mocked(useVoteResults);
const mockExportResultsCsv = vi.mocked(exportResultsCsv);

describe("results card", () => {
  beforeEach(() => {
    toastMock.mockReset();
    mockExportResultsCsv.mockReset();
    mockUseVoteResults.mockReturnValue({
      data: [
        {
          candidateId: "c1",
          voteCount: 3,
          user: { nameMasked: "김철수", companyName: "안전건설" },
        },
      ],
      isLoading: false,
    } as never);
  });

  it("renders results rows", () => {
    render(<ResultsCard month="2026-02" />);
    expect(screen.getByText("투표 결과")).toBeInTheDocument();
    expect(screen.getByText("김철수")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("exports csv when results exist", () => {
    render(<ResultsCard month="2026-02" />);
    fireEvent.click(screen.getByRole("button", { name: "내보내기" }));
    expect(mockExportResultsCsv).toHaveBeenCalledWith(
      expect.any(Array),
      "2026-02",
    );
  });

  it("shows error toast when export fails", async () => {
    mockExportResultsCsv.mockImplementationOnce(() => {
      throw new Error("fail");
    });
    render(<ResultsCard month="2026-02" />);
    fireEvent.click(screen.getByRole("button", { name: "내보내기" }));
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" }),
      );
    });
  });

  it("shows empty and loading states", () => {
    mockUseVoteResults.mockReturnValueOnce({
      data: [],
      isLoading: true,
    } as never);
    const { rerender } = render(<ResultsCard month="2026-02" />);
    expect(screen.getByText("로딩 중...")).toBeInTheDocument();

    mockUseVoteResults.mockReturnValueOnce({
      data: [],
      isLoading: false,
    } as never);
    rerender(<ResultsCard month="2026-02" />);
    expect(screen.getByText("투표 결과가 없습니다")).toBeInTheDocument();
  });
});
