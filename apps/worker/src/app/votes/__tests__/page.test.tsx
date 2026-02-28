import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VotesPage from "@/app/votes/page";
import { useAuth } from "@/hooks/use-auth";
import {
  useMyRecommendationHistory,
  useSubmitRecommendation,
  useTodayRecommendation,
} from "@/hooks/use-api";
import { getMockRouter } from "@/__tests__/mocks";

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/use-api", () => ({
  useMyRecommendationHistory: vi.fn(),
  useSubmitRecommendation: vi.fn(),
  useTodayRecommendation: vi.fn(),
}));
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));

describe("app/votes/page", () => {
  beforeEach(() => {
    vi.mocked(useTodayRecommendation).mockReturnValue({
      data: { data: { hasRecommendedToday: false } },
      isLoading: false,
    } as never);
    vi.mocked(useMyRecommendationHistory).mockReturnValue({
      data: { data: [] },
    } as never);
    vi.mocked(useSubmitRecommendation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    } as never);
  });

  it("shows site-required state when no site is selected", () => {
    vi.mocked(useAuth).mockReturnValue({
      currentSiteId: null,
      isAuthenticated: true,
      _hasHydrated: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });

    render(<VotesPage />);
    fireEvent.click(screen.getByRole("button", { name: "votes.backHome" }));

    expect(getMockRouter().push).toHaveBeenCalledWith("/home");
  });

  it("submits recommendation when form is complete", async () => {
    const mutate = vi.fn(
      (_payload: unknown, options: { onSuccess: () => void }) =>
        options.onSuccess(),
    );
    vi.mocked(useSubmitRecommendation).mockReturnValue({
      mutate,
      isPending: false,
      error: null,
    } as never);
    vi.mocked(useAuth).mockReturnValue({
      currentSiteId: "site-1",
      isAuthenticated: true,
      _hasHydrated: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });

    render(<VotesPage />);

    fireEvent.change(screen.getByLabelText("votes.tradeType"), {
      target: { value: "철근" },
    });
    fireEvent.change(screen.getByLabelText("votes.workerName"), {
      target: { value: "홍길동" },
    });
    fireEvent.change(screen.getByLabelText("votes.recommendationReason"), {
      target: { value: "성실함" },
    });
    fireEvent.click(screen.getByRole("button", { name: "votes.recommend" }));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalled();
    });
  });

  it("shows today's recommendation card", () => {
    vi.mocked(useAuth).mockReturnValue({
      currentSiteId: "site-1",
      isAuthenticated: true,
      _hasHydrated: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });
    vi.mocked(useTodayRecommendation).mockReturnValue({
      data: {
        data: {
          hasRecommendedToday: true,
          recommendation: {
            recommendedName: "김근로",
            tradeType: "전기",
            reason: "안전 수칙 준수",
          },
        },
      },
      isLoading: false,
    } as never);

    render(<VotesPage />);

    expect(screen.getByText("votes.recommendedToday")).toBeInTheDocument();
    expect(screen.getByText("김근로")).toBeInTheDocument();
  });
});
