import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAwardPoints, usePointsLedger } from "@/hooks/use-points-api";
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

describe("use-points-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSiteId = "site-1";
  });

  it("loads points ledger with current site id", async () => {
    mockApiFetch.mockResolvedValue([{ id: "p1" }]);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePointsLedger(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith("/points/history?siteId=site-1");
  });

  it("awards points and invalidates points/member queries", async () => {
    mockApiFetch.mockResolvedValue({ ok: true });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useAwardPoints(), { wrapper });

    await result.current.mutateAsync({
      memberId: "m1",
      amount: 100,
      reason: "안전수칙 준수",
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/points/award",
      expect.objectContaining({ method: "POST" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "points"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "members"],
    });
  });
});
