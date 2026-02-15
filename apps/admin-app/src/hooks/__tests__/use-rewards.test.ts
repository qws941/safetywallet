import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMonthlyRankings, useRevokePoints } from "@/hooks/use-rewards";
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
});
