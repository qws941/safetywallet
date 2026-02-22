import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Category, ReviewStatus } from "@safetywallet/types";
import PostsPage from "./page";
import { useAdminPosts, useMySites } from "@/hooks/use-api";

const pushMock = vi.fn();

type TableRow = { id: string };

interface MockDataTableProps {
  columns: unknown[];
  data: TableRow[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (item: TableRow) => void;
  emptyMessage?: string;
}

let latestTableProps: MockDataTableProps | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/components/data-table", () => ({
  DataTable: (props: MockDataTableProps) => {
    latestTableProps = props;
    return (
      <div>
        <p>{props.emptyMessage}</p>
        <button
          type="button"
          onClick={() => {
            if (props.data.length > 0) {
              props.onRowClick?.(props.data[0]);
            }
          }}
        >
          row-click
        </button>
      </div>
    );
  },
}));

vi.mock("@safetywallet/ui", () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder ?? ""}</span>
  ),
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

vi.mock("@/hooks/use-api", () => ({
  useAdminPosts: vi.fn(),
  useMySites: vi.fn(),
}));

const mockUseAdminPosts = vi.mocked(useAdminPosts);
const mockUseMySites = vi.mocked(useMySites);

const toAdminPostsResult = (value: unknown): ReturnType<typeof useAdminPosts> =>
  value as ReturnType<typeof useAdminPosts>;

const toMySitesResult = (value: unknown): ReturnType<typeof useMySites> =>
  value as ReturnType<typeof useMySites>;

describe("PostsPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    latestTableProps = null;

    mockUseMySites.mockReturnValue(
      toMySitesResult({
        data: [
          {
            id: "membership-1",
            siteId: "site-1",
            siteName: "현장 A",
            status: "ACTIVE",
            role: "MANAGER",
            joinedAt: "2026-02-22T00:00:00.000Z",
          },
        ],
        isLoading: false,
      }),
    );

    mockUseAdminPosts.mockReturnValue(
      toAdminPostsResult({
        data: [],
        isLoading: false,
      }),
    );
  });

  it("renders posts page heading and empty-state message", () => {
    render(<PostsPage />);

    expect(screen.getByText("제보 관리")).toBeInTheDocument();
    expect(screen.getByText("필터 초기화")).toBeInTheDocument();
    expect(screen.getByText("조건에 맞는 제보가 없습니다")).toBeInTheDocument();
    expect(latestTableProps?.searchable).toBe(true);
  });

  it("navigates to post detail when row is clicked", () => {
    mockUseAdminPosts.mockReturnValueOnce(
      toAdminPostsResult({
        data: [
          {
            id: "post-1",
            category: Category.HAZARD,
            content: "난간이 느슨합니다",
            status: ReviewStatus.PENDING,
            isUrgent: true,
            createdAt: "2026-02-22T00:00:00.000Z",
            author: { id: "user-1", nameMasked: "김*수" },
          },
        ],
        isLoading: false,
      }),
    );

    render(<PostsPage />);

    fireEvent.click(screen.getByRole("button", { name: "row-click" }));
    expect(pushMock).toHaveBeenCalledWith("/posts/post-1");
  });
});
