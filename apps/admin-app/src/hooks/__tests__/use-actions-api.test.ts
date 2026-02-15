import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useActionItems, useCreateAction } from "@/hooks/use-actions-api";
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

describe("use-actions-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSiteId = "site-1";
  });

  it("fetches action items by current site", async () => {
    mockApiFetch.mockResolvedValue([{ id: "a1" }]);
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useActionItems(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith("/actions?siteId=site-1");
    expect(
      queryClient
        .getQueryCache()
        .find({ queryKey: ["admin", "actions", "site-1"] }),
    ).toBeDefined();
  });

  it("creates action and invalidates post queries", async () => {
    mockApiFetch.mockResolvedValue({ ok: true });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateAction(), { wrapper });
    await result.current.mutateAsync({
      postId: "post-1",
      assigneeId: "member-1",
      dueDate: "2026-02-16",
      description: "즉시 조치",
      priority: "HIGH",
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/actions",
      expect.objectContaining({ method: "POST" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "posts"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["admin", "post"] });
  });
});
