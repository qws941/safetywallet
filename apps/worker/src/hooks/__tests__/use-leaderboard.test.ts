import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

describe("useLeaderboard", () => {
  it("does not fetch when siteId is null", () => {
    const { wrapper } = createWrapper();
    renderHook(() => useLeaderboard(null), { wrapper });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("fetches cumulative leaderboard by default", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      data: {
        leaderboard: [],
        myRank: 4,
      },
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLeaderboard("site-1"), { wrapper });

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/points/leaderboard/site-1");
      expect(result.current.data).toEqual({ leaderboard: [], myRank: 4 });
    });
  });

  it("fetches monthly leaderboard with query param", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      data: {
        leaderboard: [],
        myRank: null,
      },
    });
    const { wrapper } = createWrapper();

    renderHook(() => useLeaderboard("site-9", "monthly"), { wrapper });

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/points/leaderboard/site-9?type=monthly",
      );
    });
  });
});
