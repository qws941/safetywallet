import { renderHook, waitFor } from "@testing-library/react";
import { ReviewAction, ReviewStatus } from "@safetywallet/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminPosts, useReviewPost } from "@/hooks/use-posts-api";
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
