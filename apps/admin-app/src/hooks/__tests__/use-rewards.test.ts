import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useAllTimeRankings,
  useMonthlyRankings,
  usePointsHistory,
  useRevokePoints,
} from "@/hooks/use-rewards";
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

describe("use-rewards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSiteId = "site-1";
  });

  it("fetches monthly leaderboard for active site", async () => {
    mockApiFetch.mockResolvedValue({ leaderboard: [{ rank: 1 }], myRank: 1 });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMonthlyRankings(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/points/leaderboard/site-1?type=monthly&limit=50",
    );
    expect(result.current.data).toEqual({
      leaderboard: [{ rank: 1 }],
      myRank: 1,
    });
  });

  it("posts negative amount when revoking points", async () => {
    mockApiFetch.mockResolvedValue({ ok: true });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRevokePoints(), { wrapper });

    await result.current.mutateAsync({
      memberId: "m1",
      amount: 20,
      reason: "오지급 회수",
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/points/award",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          siteId: "site-1",
          memberId: "m1",
          amount: -20,
          reason: "오지급 회수",
        }),
      }),
    );
  });

  it("loads all-time rankings and points history with defaults", async () => {
    mockApiFetch
      .mockResolvedValueOnce({ leaderboard: [{ rank: 2 }], myRank: 2 })
      .mockResolvedValueOnce({ entries: [], total: 0, limit: 20, offset: 0 });

    const { wrapper } = createWrapper();
    const allTime = renderHook(() => useAllTimeRankings(), { wrapper });
    const history = renderHook(() => usePointsHistory({}), { wrapper });

    await waitFor(() => expect(allTime.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(history.result.current.isSuccess).toBe(true));

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/points/leaderboard/site-1?limit=50",
    );
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/points/history?siteId=site-1&limit=20&offset=0",
    );
  });

  it("uses provided site id in points history and disables without site", async () => {
    mockApiFetch.mockResolvedValue({
      entries: [],
      total: 0,
      limit: 5,
      offset: 3,
    });
    const { wrapper } = createWrapper();

    const customHistory = renderHook(
      () => usePointsHistory({ siteId: "site-22", limit: 5, offset: 3 }),
      { wrapper },
    );
    await waitFor(() =>
      expect(customHistory.result.current.isSuccess).toBe(true),
    );

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/points/history?siteId=site-22&limit=5&offset=3",
    );

    currentSiteId = null;
    const disabled = renderHook(() => useAllTimeRankings(), { wrapper });
    expect(disabled.result.current.fetchStatus).toBe("idle");
  });

  it("invalidates all related caches after revocation", async () => {
    mockApiFetch.mockResolvedValue({ ok: true });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const revoke = renderHook(() => useRevokePoints(), { wrapper });

    await revoke.result.current.mutateAsync({
      memberId: "m2",
      amount: -50,
      reason: "수정",
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "points"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "points-history"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "leaderboard"],
    });
  });
});
