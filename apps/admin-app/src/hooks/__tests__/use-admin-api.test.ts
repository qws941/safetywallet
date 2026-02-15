import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useApproveManualRequest,
  useDashboardStats,
  useMembers,
} from "@/hooks/use-admin-api";
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

describe("use-admin-api hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSiteId = "site-1";
  });

  it("uses dashboard query key and calls stats endpoint", async () => {
    mockApiFetch.mockResolvedValue({ pendingReviews: 1 });
    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useDashboardStats(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ pendingReviews: 1 });
    expect(
      queryClient
        .getQueryCache()
        .find({ queryKey: ["dashboard", "stats", "site-1"] }),
    ).toBeDefined();
    expect(mockApiFetch).toHaveBeenCalledWith("/sites/site-1/stats");
  });

  it("disables members query when siteId is missing", () => {
    currentSiteId = null;
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMembers(), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("invalidates manual approvals on approve mutation success", async () => {
    mockApiFetch.mockResolvedValue({ ok: true });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useApproveManualRequest(), { wrapper });
    await result.current.mutateAsync("approval-1");

    expect(mockApiFetch).toHaveBeenCalledWith("/approvals/approval-1/approve", {
      method: "POST",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "manual-approvals"],
    });
  });
});
