import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useAwardPoints,
  useCreatePolicy,
  useDeletePolicy,
  usePointsLedger,
  usePolicies,
  useUpdatePolicy,
} from "@/hooks/use-points-api";
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

  it("loads policies by explicit site id and by current site id", async () => {
    mockApiFetch
      .mockResolvedValueOnce({ policies: [{ id: "p1" }] })
      .mockResolvedValueOnce({ policies: [{ id: "p2" }] });
    const { wrapper } = createWrapper();

    const withArg = renderHook(() => usePolicies("site-99"), { wrapper });
    const withStore = renderHook(() => usePolicies(), { wrapper });

    await waitFor(() => expect(withArg.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(withStore.result.current.isSuccess).toBe(true));

    expect(mockApiFetch).toHaveBeenCalledWith("/policies/site/site-99");
    expect(mockApiFetch).toHaveBeenCalledWith("/policies/site/site-1");
  });

  it("disables policies query and throws when creating policy without site id", async () => {
    currentSiteId = null;
    const { wrapper } = createWrapper();

    const policies = renderHook(() => usePolicies(), { wrapper });
    expect(policies.result.current.fetchStatus).toBe("idle");

    const createPolicy = renderHook(() => useCreatePolicy(), { wrapper });
    await expect(
      createPolicy.result.current.mutateAsync({
        reasonCode: "R1",
        name: "정책",
        defaultAmount: 10,
      }),
    ).rejects.toThrow("Site ID is required");
  });

  it("creates policy and invalidates target site policies", async () => {
    mockApiFetch.mockResolvedValue({
      policy: { id: "policy-1", siteId: "site-2" },
    });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreatePolicy(), { wrapper });

    await result.current.mutateAsync({
      siteId: "site-2",
      reasonCode: "SAFE",
      name: "안전정책",
      defaultAmount: 30,
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/policies",
      expect.objectContaining({ method: "POST" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "policies", "site-2"],
    });
  });

  it("creates policy using currentSiteId fallback when variables.siteId is absent", async () => {
    mockApiFetch.mockResolvedValue({
      policy: { id: "policy-2", siteId: "site-1" },
    });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreatePolicy(), { wrapper });

    await result.current.mutateAsync({
      reasonCode: "SAFE",
      name: "기본정책",
      defaultAmount: 20,
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "policies", "site-1"],
    });
  });

  it("updates policy and invalidates policy and related policy lists", async () => {
    mockApiFetch.mockResolvedValue({
      policy: { id: "policy-1", siteId: "site-9" },
    });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdatePolicy(), { wrapper });

    await result.current.mutateAsync({
      id: "policy-1",
      data: { name: "수정" },
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/policies/policy-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "policy", "policy-1"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "policies", "site-9"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "policies", "site-1"],
    });
  });

  it("updates policy without invalidating current site when siteId is null", async () => {
    currentSiteId = null;
    mockApiFetch.mockResolvedValue({
      policy: { id: "policy-2", siteId: "site-5" },
    });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdatePolicy(), { wrapper });

    await result.current.mutateAsync({
      id: "policy-2",
      data: { name: "테스트" },
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "policy", "policy-2"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "policies", "site-5"],
    });
    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it("deletes policy and invalidates current site policies when available", async () => {
    mockApiFetch.mockResolvedValue({ ok: true });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useDeletePolicy(), { wrapper });

    await result.current.mutateAsync("policy-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/policies/policy-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "policies", "site-1"],
    });

    currentSiteId = null;
    const withoutSite = renderHook(() => useDeletePolicy(), { wrapper });
    await withoutSite.result.current.mutateAsync("policy-2");
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });
});
