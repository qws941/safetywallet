import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMonitoringSummary } from "@/hooks/use-monitoring-api";
import { createWrapper } from "@/hooks/__tests__/test-utils";

const mockApiFetch = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

describe("use-monitoring-api", () => {
  it("fetches monitoring summary and unwraps data", async () => {
    mockApiFetch.mockResolvedValue({ data: { totalRequests: 10 } });
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useMonitoringSummary(30), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ totalRequests: 10 });
    expect(
      queryClient
        .getQueryCache()
        .find({ queryKey: ["monitoring", "summary", 30] }),
    ).toBeDefined();
  });
});
