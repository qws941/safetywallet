import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAttendanceLogs, useUnmatchedWorkers } from "@/hooks/use-attendance";
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

describe("use-attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSiteId = "site-1";
  });

  it("fetches attendance logs with pagination filters", async () => {
    mockApiFetch.mockResolvedValue({ data: { items: [], pagination: {} } });
    const { wrapper } = createWrapper();

    renderHook(
      () => useAttendanceLogs(2, 10, { date: "2026-02-14", search: "홍길동" }),
      {
        wrapper,
      },
    );

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/admin/attendance-logs?siteId=site-1&page=2&limit=10&date=2026-02-14&search=%ED%99%8D%EA%B8%B8%EB%8F%99",
      ),
    );
  });

  it("normalizes unmatched worker response shape", async () => {
    mockApiFetch.mockResolvedValue({
      records: [{ id: "w1" }],
      pagination: { page: 1 },
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUnmatchedWorkers(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      records: [{ id: "w1" }],
      pagination: { page: 1 },
    });
  });
});
