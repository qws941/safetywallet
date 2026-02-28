import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useSyncErrors,
  useUpdateSyncErrorStatus,
} from "@/hooks/use-sync-errors";
import { createWrapper } from "@/hooks/__tests__/test-utils";

const mockApiFetch = vi.fn();
let currentSiteId: string | null = "site-1";

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));
vi.mock("@/stores/auth", () => ({
  useAuthStore: (
    selector: (state: { currentSiteId: string | null }) => unknown,
  ) => selector({ currentSiteId }),
}));

describe("use-sync-errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSiteId = "site-1";
  });

  it("fetches sync errors with default pagination and site", async () => {
    mockApiFetch.mockResolvedValue({ errors: [], total: 0 });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSyncErrors(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/admin/sync-errors?siteId=site-1&limit=50&offset=0",
    );
  });

  it("includes status and syncType in sync errors query", async () => {
    mockApiFetch.mockResolvedValue({ errors: [], total: 0 });
    const { wrapper } = createWrapper();
    renderHook(
      () => useSyncErrors({ status: "OPEN", syncType: "FAS_ATTENDANCE" }),
      { wrapper },
    );

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("status=OPEN"),
    );
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("syncType=FAS_ATTENDANCE"),
    );
  });

  it("excludes siteId when currentSiteId is null", async () => {
    currentSiteId = null;
    mockApiFetch.mockResolvedValue({ errors: [], total: 0 });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSyncErrors(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/admin/sync-errors?limit=50&offset=0",
    );
  });

  it("updates sync error status and invalidates sync error cache", async () => {
    mockApiFetch.mockResolvedValue({ error: { id: "err-1" } });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdateSyncErrorStatus(), {
      wrapper,
    });

    await result.current.mutateAsync({ id: "err-1", status: "RESOLVED" });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/admin/sync-errors/err-1/status",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "sync-errors"],
    });
  });
});
