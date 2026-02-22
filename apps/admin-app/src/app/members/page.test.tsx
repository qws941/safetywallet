import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MembersPage from "./page";
import { useMembers } from "@/hooks/use-api";
import { useAuthStore } from "@/stores/auth";

const pushMock = vi.fn();

type TableRow = { id: string };

interface MockDataTableProps {
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
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/hooks/use-api", () => ({
  useMembers: vi.fn(),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn(),
}));

const mockUseMembers = vi.mocked(useMembers);
const mockUseAuthStore = vi.mocked(useAuthStore);

const toMembersResult = (value: unknown): ReturnType<typeof useMembers> =>
  value as ReturnType<typeof useMembers>;

describe("MembersPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    latestTableProps = null;

    mockUseMembers.mockReturnValue(
      toMembersResult({
        data: [],
        isLoading: false,
      }),
    );

    mockUseAuthStore.mockImplementation((selector) =>
      selector({
        currentSiteId: "site-1",
        _hasHydrated: true,
      } as Parameters<typeof selector>[0]),
    );
  });

  it("renders heading and empty state when no members", () => {
    render(<MembersPage />);

    expect(screen.getByText("회원 관리")).toBeInTheDocument();
    expect(screen.getByText("회원이 없습니다")).toBeInTheDocument();
    expect(latestTableProps?.searchable).toBe(true);
    expect(latestTableProps?.searchPlaceholder).toBe("이름 검색...");
  });

  it("shows hydration/site preparation message when auth context is not ready", () => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({
        currentSiteId: null,
        _hasHydrated: false,
      } as Parameters<typeof selector>[0]),
    );

    render(<MembersPage />);

    expect(
      screen.getByText("현장 정보를 준비하는 중입니다..."),
    ).toBeInTheDocument();
  });

  it("navigates to member detail on row click", () => {
    mockUseMembers.mockReturnValueOnce(
      toMembersResult({
        data: [
          {
            id: "member-1",
            user: { id: "user-1", name: "홍길동" },
            status: "ACTIVE",
            role: "MANAGER",
            joinedAt: "2026-02-22T00:00:00.000Z",
          },
        ],
        isLoading: false,
      }),
    );

    render(<MembersPage />);

    fireEvent.click(screen.getByRole("button", { name: "row-click" }));
    expect(pushMock).toHaveBeenCalledWith("/members/member-1");
  });
});
