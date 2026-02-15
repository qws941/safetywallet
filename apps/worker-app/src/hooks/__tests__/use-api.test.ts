import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { ActionStatus, Category } from "@safetywallet/types";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  useAction,
  useAnnouncements,
  useAttendanceToday,
  useCreatePost,
  useEducationContent,
  useEducationContents,
  useMyActions,
  usePoints,
  usePost,
  usePosts,
  useProfile,
  useRecommendationHistory,
  useSiteInfo,
  useSubmitRecommendation,
  useTodayRecommendation,
  useUpdateActionStatus,
} from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

describe("use-api hooks", () => {
  it("usePosts fetches post list for site", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ items: [], total: 0 });
    const { wrapper } = createWrapper();

    renderHook(() => usePosts("site-1"), { wrapper });

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/posts?siteId=site-1");
    });
  });

  it("usePosts does not fetch without site id", () => {
    const { wrapper } = createWrapper();
    renderHook(() => usePosts(""), { wrapper });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("usePost fetches single post by id", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ data: { id: "post-1" } });
    const { wrapper } = createWrapper();

    renderHook(() => usePost("post-1"), { wrapper });

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/posts/post-1");
    });
  });

  it("useCreatePost posts payload and invalidates posts query", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ data: { post: { id: "p1" } } });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreatePost(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        siteId: "site-2",
        category: Category.HAZARD,
        content: "테스트 게시글",
      });
    });

    expect(apiFetch).toHaveBeenCalledWith("/posts", {
      method: "POST",
      body: JSON.stringify({
        siteId: "site-2",
        category: Category.HAZARD,
        content: "테스트 게시글",
      }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["posts", "site-2"],
    });
  });

  it("useSiteInfo and useProfile call expected endpoints", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        data: {
          site: { id: "s1", name: "현장", address: null, memberCount: 3 },
        },
      })
      .mockResolvedValueOnce({ data: { id: "u1" } });

    const { wrapper } = createWrapper();
    renderHook(() => useSiteInfo("s1"), { wrapper });
    renderHook(() => useProfile(), { wrapper });

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/sites/s1");
      expect(apiFetch).toHaveBeenCalledWith("/users/me");
    });
  });

  it("usePoints and useAnnouncements fetch with site id", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ data: { balance: 100, history: [] } })
      .mockResolvedValueOnce({ items: [], total: 0 });
    const { wrapper } = createWrapper();

    renderHook(() => usePoints("site-3"), { wrapper });
    renderHook(() => useAnnouncements("site-3"), { wrapper });

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/points?siteId=site-3");
      expect(apiFetch).toHaveBeenCalledWith("/announcements?siteId=site-3");
    });
  });

  it("useEducationContents and useEducationContent return transformed payload", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        contents: [
          {
            id: "c1",
            siteId: "s",
            title: "t",
            content: "c",
            contentType: "TEXT",
            category: "GEN",
            isRequired: false,
            displayOrder: 1,
            createdAt: "2026-01-01",
          },
        ],
      })
      .mockResolvedValueOnce({
        content: {
          id: "c2",
          title: "제목",
          content: "본문",
          contentType: "TEXT",
          category: "GEN",
          isRequired: false,
          createdAt: "2026-01-01",
        },
      });

    const { wrapper } = createWrapper();
    const list = renderHook(() => useEducationContents("site-7"), { wrapper });
    const item = renderHook(() => useEducationContent("c2"), { wrapper });

    await waitFor(() => {
      expect(list.result.current.data?.[0]?.id).toBe("c1");
      expect(item.result.current.data?.id).toBe("c2");
    });
  });

  it("useAttendanceToday respects enabled flag and endpoint", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ attended: true, checkinAt: null });
    const { wrapper } = createWrapper();

    renderHook(() => useAttendanceToday(null), { wrapper });
    expect(apiFetch).not.toHaveBeenCalled();

    renderHook(() => useAttendanceToday("site-10"), { wrapper });
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/attendance/today?siteId=site-10");
    });
  });

  it("useMyActions builds query string from params", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ items: [], total: 0 });
    const { wrapper } = createWrapper();

    renderHook(
      () => useMyActions({ status: "IN_PROGRESS", limit: 20, offset: 40 }),
      { wrapper },
    );

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/actions/my?status=IN_PROGRESS&limit=20&offset=40",
      );
    });
  });

  it("useAction does not fetch when actionId is null", () => {
    const { wrapper } = createWrapper();
    renderHook(() => useAction(null), { wrapper });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("useUpdateActionStatus patches action and invalidates action queries", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ data: { id: "a1" } });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateActionStatus(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        actionId: "a1",
        data: { actionStatus: ActionStatus.IN_PROGRESS },
      });
    });

    expect(apiFetch).toHaveBeenCalledWith("/actions/a1", {
      method: "PATCH",
      body: JSON.stringify({ actionStatus: ActionStatus.IN_PROGRESS }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["actions"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["actions", "a1"] });
  });

  it("recommendation hooks use current site id from auth store", async () => {
    useAuthStore.setState({ currentSiteId: "site-r" });
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        data: { hasRecommendedToday: false, recommendation: null },
      })
      .mockResolvedValueOnce({ data: { items: [] } });

    const { wrapper } = createWrapper();

    renderHook(() => useTodayRecommendation(), { wrapper });
    renderHook(() => useRecommendationHistory(), { wrapper });

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/recommendations/today?siteId=site-r",
      );
      expect(apiFetch).toHaveBeenCalledWith(
        "/recommendations/history?siteId=site-r",
      );
    });
  });

  it("useSubmitRecommendation posts payload and invalidates recommendations", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ data: { id: "rec-1" } });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useSubmitRecommendation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        recommendedName: "홍길동",
        tradeType: "전기",
        reason: "안전 수칙 준수 우수",
        siteId: "site-r",
      });
    });

    expect(apiFetch).toHaveBeenCalledWith("/recommendations", {
      method: "POST",
      body: JSON.stringify({
        recommendedName: "홍길동",
        tradeType: "전기",
        reason: "안전 수칙 준수 우수",
        siteId: "site-r",
      }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["recommendations"],
    });
  });
});
