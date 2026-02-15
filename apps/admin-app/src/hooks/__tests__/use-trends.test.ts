import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePostsTrend } from "@/hooks/use-trends";
import { createWrapper } from "@/hooks/__tests__/test-utils";

const mockApiFetch = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

describe("use-trends", () => {
  it("builds trend query and returns trend data", async () => {
    mockApiFetch.mockResolvedValue({
      data: { trend: [{ date: "2026-02-14", value: 2 }] },
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePostsTrend("2026-02-01", "2026-02-28", "site-1"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/admin/trends/posts?startDate=2026-02-01&endDate=2026-02-28&siteId=site-1",
    );
    expect(result.current.data).toEqual([{ date: "2026-02-14", value: 2 }]);
  });
});
