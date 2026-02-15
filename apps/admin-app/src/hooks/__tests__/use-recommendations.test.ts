import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useRecommendationStats,
  useRecommendations,
} from "@/hooks/use-recommendations";
import { createWrapper } from "@/hooks/__tests__/test-utils";

const mockApiFetch = vi.fn();
let currentSiteId: string | null = "site-1";

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));
vi.mock("@/stores/auth", () => ({
  useAuthStore: (
    selector: (state: {
      currentSiteId: string | null;
      tokens: { accessToken: string } | null;
    }) => unknown,
  ) => selector({ currentSiteId, tokens: { accessToken: "token" } }),
}));

describe("use-recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSiteId = "site-1";
  });

  it("fetches recommendation list with query params", async () => {
    mockApiFetch.mockResolvedValue({
      data: { items: [], pagination: { page: 1 } },
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useRecommendations(1, 20, "2026-02-01", "2026-02-15"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/admin/recommendations?siteId=site-1&page=1&limit=20&startDate=2026-02-01&endDate=2026-02-15",
      ),
    );
  });

  it("fetches recommendation stats", async () => {
    mockApiFetch.mockResolvedValue({ data: { totalRecommendations: 5 } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useRecommendationStats("2026-02-01", "2026-02-28"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ totalRecommendations: 5 });
  });
});
