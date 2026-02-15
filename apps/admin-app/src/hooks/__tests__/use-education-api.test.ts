import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateQuiz, useEducationContents } from "@/hooks/use-education-api";
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

describe("use-education-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSiteId = "site-1";
  });

  it("loads education contents by site and pagination filters", async () => {
    mockApiFetch.mockResolvedValue({
      contents: [],
      total: 0,
      limit: 10,
      offset: 0,
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useEducationContents({ limit: 10, offset: 0 }),
      {
        wrapper,
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/education/contents?siteId=site-1&limit=10&offset=0",
    );
  });

  it("creates quiz and invalidates quiz list", async () => {
    mockApiFetch.mockResolvedValue({ id: "quiz-1" });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateQuiz(), { wrapper });

    await result.current.mutateAsync({
      siteId: "site-1",
      title: "기본 안전교육",
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/education/quizzes",
      expect.objectContaining({ method: "POST" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "quizzes"],
    });
  });
});
