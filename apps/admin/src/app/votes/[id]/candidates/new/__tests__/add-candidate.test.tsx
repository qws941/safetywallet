import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddCandidatePage from "../add-candidate";

const pushMock = vi.fn();
const backMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const mutateMock = vi.fn();
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
  useParams: () => ({ id: "2026-02" }),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: (
    selector: (s: { currentSiteId: string | null }) => string | null,
  ) => selector({ currentSiteId: "site-1" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}));

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

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
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

describe("add candidate page", () => {
  beforeEach(() => {
    pushMock.mockReset();
    backMock.mockReset();
    invalidateQueriesMock.mockReset();
    mutateMock.mockReset();

    useQueryMock.mockReturnValue({
      data: {
        users: [
          {
            id: "u1",
            name: "홍길동",
            nameMasked: "홍길동",
            companyName: "안전건설",
            tradeType: "전기",
            role: "WORKER",
          },
        ],
        total: 1,
      },
      isLoading: false,
    });
    useMutationMock.mockImplementation(
      ({ onSuccess }: { onSuccess?: () => void }) => ({
        mutate: (_id: string) => {
          mutateMock();
          onSuccess?.();
        },
        isPending: false,
      }),
    );
  });

  it("renders users and navigates back", () => {
    render(<AddCandidatePage />);
    expect(screen.getByText("후보자 등록")).toBeInTheDocument();
    expect(screen.getByText("홍길동")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(backMock).toHaveBeenCalled();
  });

  it("registers candidate and redirects", async () => {
    render(<AddCandidatePage />);

    fireEvent.click(screen.getByRole("button", { name: "등록" }));

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalled();
    });
    expect(invalidateQueriesMock).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/votes/2026-02");
  });
});
