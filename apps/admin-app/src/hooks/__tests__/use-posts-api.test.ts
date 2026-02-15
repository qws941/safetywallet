import { renderHook, waitFor } from "@testing-library/react";
import { Category, ReviewAction, ReviewStatus } from "@safetywallet/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useAdminPost,
  useAdminPosts,
  useReviewPost,
} from "@/hooks/use-posts-api";
import { createWrapper } from "@/hooks/__tests__/test-utils";

const mockApiFetch = vi.fn();
let currentSiteId: string | null = "site-1";

vi.mock("@/hooks/use-api-base", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));
vi.mock("@/stores/auth", () => ({
  useAuthStore: (
    selector: (state: { currentSiteId: string | null }) => unknown,
  ) => selector({ currentSiteId }),
}));

describe("use-posts-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSiteId = "site-1";
  });

  it("builds posts query using site and filters", async () => {
    mockApiFetch.mockResolvedValue({ posts: [{ id: "post-1" }] });
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useAdminPosts({
          reviewStatus: ReviewStatus.IN_REVIEW,
          isUrgent: true,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        `/admin/posts?siteId=site-1&reviewStatus=${ReviewStatus.IN_REVIEW}&isUrgent=true`,
      ),
    );
  });

  it("includes date filters in posts query", async () => {
    mockApiFetch.mockResolvedValue({ posts: [] });
    const { wrapper } = createWrapper();
    renderHook(
      () =>
        useAdminPosts({
          startDate: new Date("2026-02-01"),
          endDate: new Date("2026-02-28"),
        }),
      { wrapper },
    );

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("startDate="),
    );
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("endDate="),
    );
  });

  it("fetches single post by id", async () => {
    mockApiFetch.mockResolvedValue({ id: "post-1", title: "위험 보고" });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAdminPost("post-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith("/admin/posts/post-1");
    expect(result.current.data).toEqual({ id: "post-1", title: "위험 보고" });
  });

  it("disables single post query when postId is empty", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAdminPost(""), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("includes category and riskLevel filters in posts query", async () => {
    mockApiFetch.mockResolvedValue({ posts: [] });
    const { wrapper } = createWrapper();
    renderHook(
      () =>
        useAdminPosts({
          category: Category.HAZARD,
          riskLevel: "HIGH",
          siteId: "site-override",
        }),
      { wrapper },
    );

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    const url = mockApiFetch.mock.calls[0][0] as string;
    expect(url).toContain("siteId=site-override");
    expect(url).toContain("category=HAZARD");
    expect(url).toContain("riskLevel=HIGH");
  });

  it("posts review action and invalidates list queries", async () => {
    mockApiFetch.mockResolvedValue({ ok: true });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useReviewPost(), { wrapper });
    await result.current.mutateAsync({
      postId: "post-1",
      action: ReviewAction.APPROVE,
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/reviews",
      expect.objectContaining({ method: "POST" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "posts"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });
});
