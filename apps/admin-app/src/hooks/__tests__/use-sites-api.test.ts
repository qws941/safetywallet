import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSite, useUpdateSite } from "@/hooks/use-sites-api";
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

describe("use-sites-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSiteId = "site-1";
  });

  it("fetches current site details", async () => {
    mockApiFetch.mockResolvedValue({
      site: { id: "site-1", name: "서울", active: true },
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSite(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      id: "site-1",
      name: "서울",
      active: true,
    });
  });

  it("updates site and invalidates site and my-sites cache", async () => {
    mockApiFetch.mockResolvedValue({
      site: { id: "site-1", name: "서울", active: true },
    });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdateSite(), { wrapper });

    await result.current.mutateAsync({
      siteId: "site-1",
      data: { name: "서울-신규" },
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/sites/site-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["site", "site-1"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "my-sites"],
    });
  });
});
