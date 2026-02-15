import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useAddVoteCandidate,
  useDeleteVoteCandidate,
  useExportVoteResultsCsv,
  useUpdateVotePeriod,
  useVoteCandidates,
  useVotePeriod,
  useVoteResults,
} from "@/hooks/use-votes";
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
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
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

  it("deletes candidate and invalidates candidate list", async () => {
    mockApiFetch.mockResolvedValue({ ok: true });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useDeleteVoteCandidate(), { wrapper });

    await result.current.mutateAsync("candidate-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/admin/votes/candidates/candidate-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "vote-candidates"],
    });
  });

  it("fetches vote results and period when site and month exist", async () => {
    mockApiFetch
      .mockResolvedValueOnce({ results: [{ id: "r1" }] })
      .mockResolvedValueOnce({ period: { id: "p1" } });
    const { wrapper } = createWrapper();

    const results = renderHook(() => useVoteResults("2026-02"), { wrapper });
    const period = renderHook(() => useVotePeriod("2026-02"), { wrapper });

    await waitFor(() => expect(results.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(period.result.current.isSuccess).toBe(true));

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/admin/votes/results?siteId=site-1&month=2026-02",
    );
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/admin/votes/period/site-1/2026-02",
    );
  });

  it("updates vote period and invalidates month-specific period cache", async () => {
    mockApiFetch.mockResolvedValue({ period: { id: "p1" } });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdateVotePeriod(), { wrapper });

    await result.current.mutateAsync({
      month: "2026-02",
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/admin/votes/period/site-1/2026-02",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "vote-period", "site-1", "2026-02"],
    });
  });

  it("disables month-based vote queries without required inputs", () => {
    currentSiteId = null;
    const { wrapper } = createWrapper();

    const candidates = renderHook(() => useVoteCandidates("2026-02"), {
      wrapper,
    });
    const results = renderHook(() => useVoteResults(""), { wrapper });
    const period = renderHook(() => useVotePeriod("2026-02"), { wrapper });

    expect(candidates.result.current.fetchStatus).toBe("idle");
    expect(results.result.current.fetchStatus).toBe("idle");
    expect(period.result.current.fetchStatus).toBe("idle");
  });

  it("exports vote results as csv and handles failed response", async () => {
    const blob = new Blob(["a,b"], { type: "text/csv" });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    fetchSpy.mockResolvedValueOnce(
      new Response(blob, {
        status: 200,
      }),
    );

    const { result } = renderHook(() => useExportVoteResultsCsv());
    await result.current("2026-02");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "/admin/votes/results?siteId=site-1&month=2026-02&format=csv",
      ),
      expect.objectContaining({
        headers: { Authorization: "Bearer token" },
      }),
    );
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:url");
    expect(anchorClickSpy).toHaveBeenCalled();

    fetchSpy.mockResolvedValueOnce(new Response("error", { status: 500 }));
    await expect(result.current("2026-03")).rejects.toThrow("Export failed");
  });
});
