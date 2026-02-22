import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import {
  useAcetimeCrossMatch,
  useAcetimeSync,
  useFasSyncStatus,
  useRealtimeAttendanceView,
  useSearchFasMariadb,
} from "@/hooks/use-fas-sync";

const mockApiFetch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public status: number,
      public code?: string,
    ) {
      super(message);
      this.name = "ApiError";
    }
  },
}));

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("use-fas-sync", () => {
  let queryClient: QueryClient;
  let wrapper: ({
    children,
  }: {
    children: ReactNode;
  }) => ReturnType<typeof createElement>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
  });

  describe("useFasSyncStatus", () => {
    it("starts in loading state and resolves success", async () => {
      const deferred = createDeferred<{ fasStatus: string }>();
      mockApiFetch.mockReturnValueOnce(deferred.promise);

      const { result } = renderHook(() => useFasSyncStatus(), { wrapper });

      expect(result.current.isPending).toBe(true);

      deferred.resolve({ fasStatus: "healthy" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ fasStatus: "healthy" });
      expect(mockApiFetch).toHaveBeenCalledWith("/admin/fas/sync-status");
    });

    it("handles query errors", async () => {
      mockApiFetch.mockRejectedValueOnce(new Error("status failed"));

      const { result } = renderHook(() => useFasSyncStatus(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
      expect(mockApiFetch).toHaveBeenCalledWith("/admin/fas/sync-status");
    });

    it("falls back to /admin/sync-status on 404", async () => {
      mockApiFetch
        .mockRejectedValueOnce(new ApiError("not found", 404))
        .mockResolvedValueOnce({ fasStatus: "fallback-ok" });

      const { result } = renderHook(() => useFasSyncStatus(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ fasStatus: "fallback-ok" });
      expect(mockApiFetch).toHaveBeenNthCalledWith(1, "/admin/fas/sync-status");
      expect(mockApiFetch).toHaveBeenNthCalledWith(2, "/admin/sync-status");
    });

    it("sets refetchInterval to 30000", async () => {
      mockApiFetch.mockResolvedValueOnce({ fasStatus: "ok" });

      renderHook(() => useFasSyncStatus(), { wrapper });

      await waitFor(() =>
        expect(
          queryClient
            .getQueryCache()
            .find({ queryKey: ["admin", "fas-sync-status"] }),
        ).toBeDefined(),
      );

      const query = queryClient
        .getQueryCache()
        .find({ queryKey: ["admin", "fas-sync-status"] });
      const options = query?.options as { refetchInterval?: number };
      expect(options.refetchInterval).toBe(30000);
    });
  });

  describe("useAcetimeSync", () => {
    it("posts to /acetime/sync-db and invalidates fas sync status", async () => {
      mockApiFetch.mockResolvedValueOnce({
        source: {},
        sync: {},
        fasCrossMatch: {},
      });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useAcetimeSync(), { wrapper });

      await result.current.mutateAsync(undefined);

      expect(mockApiFetch).toHaveBeenCalledWith("/acetime/sync-db", {
        method: "POST",
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["admin", "fas-sync-status"],
      });
    });
  });

  describe("useAcetimeCrossMatch", () => {
    it("posts to /acetime/fas-cross-match and invalidates status", async () => {
      mockApiFetch.mockResolvedValueOnce({
        batch: {},
        results: {},
        matchedNames: [],
        hasMore: false,
      });
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useAcetimeCrossMatch(), { wrapper });

      await result.current.mutateAsync(undefined);

      expect(mockApiFetch).toHaveBeenCalledWith("/acetime/fas-cross-match", {
        method: "POST",
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["admin", "fas-sync-status"],
      });
    });

    it("passes limit as query param", async () => {
      mockApiFetch.mockResolvedValueOnce({
        batch: {},
        results: {},
        matchedNames: [],
        hasMore: false,
      });
      const { result } = renderHook(() => useAcetimeCrossMatch(), { wrapper });

      await result.current.mutateAsync(250);

      expect(mockApiFetch).toHaveBeenCalledWith(
        "/acetime/fas-cross-match?limit=250",
        { method: "POST" },
      );
    });
  });

  describe("useSearchFasMariadb", () => {
    it("starts in loading state and resolves success", async () => {
      const deferred = createDeferred<{ count: number }>();
      mockApiFetch.mockReturnValueOnce(deferred.promise);

      const { result } = renderHook(
        () => useSearchFasMariadb({ name: "홍길동", phone: "01012345678" }),
        { wrapper },
      );

      expect(result.current.isPending).toBe(true);

      deferred.resolve({ count: 1 });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiFetch).toHaveBeenCalledWith(
        "/admin/fas/search-mariadb?name=%ED%99%8D%EA%B8%B8%EB%8F%99&phone=01012345678",
      );
    });

    it("handles query errors", async () => {
      mockApiFetch.mockRejectedValueOnce(new Error("search failed"));

      const { result } = renderHook(
        () => useSearchFasMariadb({ name: "홍길동" }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it("is disabled when both name and phone are missing", async () => {
      const { result } = renderHook(
        () => useSearchFasMariadb({ name: "", phone: "" }),
        { wrapper },
      );

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockApiFetch).not.toHaveBeenCalled();
    });
  });

  describe("useRealtimeAttendanceView", () => {
    it("starts in loading state and resolves success", async () => {
      const deferred = createDeferred<{ accsDay: string }>();
      mockApiFetch.mockReturnValueOnce(deferred.promise);

      const { result } = renderHook(
        () =>
          useRealtimeAttendanceView({ accsDay: "20260222", siteCd: " S001 " }),
        { wrapper },
      );

      expect(result.current.isPending).toBe(true);

      deferred.resolve({ accsDay: "20260222" });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/debug/fas-counts?accsDay=20260222&siteCd=S001",
      );
    });

    it("handles query errors", async () => {
      mockApiFetch.mockRejectedValueOnce(new Error("realtime failed"));

      const { result } = renderHook(
        () => useRealtimeAttendanceView({ accsDay: "20260222" }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it("is disabled when accsDay is not 8 digits", async () => {
      const { result } = renderHook(
        () => useRealtimeAttendanceView({ accsDay: "2026-02-22" }),
        { wrapper },
      );

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("sets refetchInterval to 15000", async () => {
      mockApiFetch.mockResolvedValueOnce({ accsDay: "20260222" });

      renderHook(() => useRealtimeAttendanceView({ accsDay: "20260222" }), {
        wrapper,
      });

      await waitFor(() =>
        expect(
          queryClient.getQueryCache().find({
            queryKey: ["admin", "fas-realtime-attendance", "20260222", "all"],
          }),
        ).toBeDefined(),
      );

      const query = queryClient.getQueryCache().find({
        queryKey: ["admin", "fas-realtime-attendance", "20260222", "all"],
      });
      const options = query?.options as { refetchInterval?: number };
      expect(options.refetchInterval).toBe(15000);
    });
  });
});
