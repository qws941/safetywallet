import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PostsPage from "@/app/posts/page";
import { useAuth } from "@/hooks/use-auth";
import { useInfiniteQuery } from "@tanstack/react-query";

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useInfiniteQuery: vi.fn() }));
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));
vi.mock("@/components/header", () => ({ Header: () => <div>header</div> }));
vi.mock("@/components/bottom-nav", () => ({
  BottomNav: () => <div>bottom-nav</div>,
}));
vi.mock("@/components/post-card", () => ({
  PostCard: ({ post }: { post: { id: string } }) => <div>post:{post.id}</div>,
}));

describe("app/posts/page", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      currentSiteId: "site-1",
      isAuthenticated: true,
      _hasHydrated: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });
  });

  it("renders loading skeletons", () => {
    vi.mocked(useInfiniteQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as never);

    const { container } = render(<PostsPage />);

    expect(
      screen.getByText("posts.pageList.myReportsList"),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
  });

  it("renders empty state and filter switching", () => {
    vi.mocked(useInfiniteQuery).mockReturnValue({
      data: { pages: [{ data: { items: [] } }] },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as never);

    render(<PostsPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "posts.pageList.urgent" }),
    );
    expect(screen.getByText("posts.pageList.noReportsYet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "posts.pageList.newReport" }),
    ).toHaveAttribute("href", "/posts/new");
  });

  it("renders post list", () => {
    vi.mocked(useInfiniteQuery).mockReturnValue({
      data: {
        pages: [{ data: { items: [{ id: "p1" }, { id: "p2" }] } }],
      },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isFetchingNextPage: true,
    } as never);

    render(<PostsPage />);

    expect(screen.getByText("post:p1")).toBeInTheDocument();
    expect(screen.getByText("post:p2")).toBeInTheDocument();
  });
});
