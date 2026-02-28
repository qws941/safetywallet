import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EducationPage from "@/app/education/page";
import {
  useAttendTbm,
  useEducationContents,
  useQuizzes,
  useTbmRecords,
} from "@/hooks/use-api";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    currentSiteId: "site-1",
    isAuthenticated: true,
    _hasHydrated: true,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    setCurrentSite: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-api", () => ({
  useEducationContents: vi.fn(),
  useQuizzes: vi.fn(),
  useTbmRecords: vi.fn(),
  useAttendTbm: vi.fn(),
}));
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));
vi.mock("@/components/header", () => ({ Header: () => <div>header</div> }));
vi.mock("@/components/bottom-nav", () => ({
  BottomNav: () => <div>bottom-nav</div>,
}));

describe("app/education/page", () => {
  beforeEach(() => {
    vi.mocked(useEducationContents).mockReturnValue({
      data: [],
      isLoading: false,
    });
    vi.mocked(useQuizzes).mockReturnValue({ data: [], isLoading: false });
    vi.mocked(useTbmRecords).mockReturnValue({ data: [], isLoading: false });
    vi.mocked(useAttendTbm).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("renders empty contents tab", () => {
    render(<EducationPage />);
    expect(screen.getByText("education.noMaterials")).toBeInTheDocument();
  });

  it("switches to quizzes and tbm tabs", () => {
    render(<EducationPage />);
    fireEvent.click(screen.getByRole("button", { name: "education.quizzes" }));
    expect(screen.getByText("education.noQuizzes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "education.tbm" }));
    expect(screen.getByText("education.noRecords")).toBeInTheDocument();
  });

  it("handles TBM attend action", async () => {
    const mutate = vi.fn((_id, options: { onSuccess: () => void }) =>
      options.onSuccess(),
    );
    vi.mocked(useAttendTbm).mockReturnValue({ mutate, isPending: false });
    vi.mocked(useTbmRecords).mockReturnValue({
      data: [
        {
          id: "tbm1",
          title: "안전 미팅",
          date: "2026-02-28",
          location: "A동",
          leader: { nameMasked: "관리자" },
          _count: { attendees: 3 },
        },
      ],
      isLoading: false,
    });

    render(<EducationPage />);
    fireEvent.click(screen.getByRole("button", { name: "education.tbm" }));
    fireEvent.click(
      screen.getByRole("button", { name: "education.attendanceConfirm" }),
    );

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith("tbm1", expect.any(Object));
    });
  });
});
