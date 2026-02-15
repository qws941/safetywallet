import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAddVoteCandidate, useVoteCandidates } from "@/hooks/use-votes";
import { createWrapper } from "@/hooks/__tests__/test-utils";

const mockApiFetch = vi.fn();
let currentSiteId: string | null = "site-1";

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));
vi.mock("@/stores/auth", () => ({
  useAuthStore: Object.assign(
    (selector: (state: { currentSiteId: string | null }) => unknown) =>
      selector({ currentSiteId }),
    {
      getState: () => ({ tokens: { accessToken: "token" } }),
    },
  ),
}));

describe("use-votes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSiteId = "site-1";
  });

  it("fetches vote candidates with month query key", async () => {
    mockApiFetch.mockResolvedValue({ candidates: [{ id: "c1" }] });
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useVoteCandidates("2026-02"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "c1" }]);
    expect(
      queryClient
        .getQueryCache()
        .find({ queryKey: ["admin", "vote-candidates", "site-1", "2026-02"] }),
    ).toBeDefined();
  });

  it("adds vote candidate and invalidates month-specific cache", async () => {
    mockApiFetch.mockResolvedValue({ ok: true });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useAddVoteCandidate(), { wrapper });

    await result.current.mutateAsync({ userId: "u1", month: "2026-02" });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/admin/votes/candidates",
      expect.any(Object),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "vote-candidates", "site-1", "2026-02"],
    });
  });
});
