import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EducationViewPage from "@/app/education/view/page";
import { useEducationContent } from "@/hooks/use-api";
import { setMockSearchParams, getMockRouter } from "@/__tests__/mocks";

vi.mock("@/hooks/use-api", () => ({ useEducationContent: vi.fn() }));
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));
vi.mock("@/components/header", () => ({ Header: () => <div>header</div> }));
vi.mock("@/components/bottom-nav", () => ({
  BottomNav: () => <div>bottom-nav</div>,
}));

describe("app/education/view/page", () => {
  it("renders not found state", () => {
    setMockSearchParams({ id: "e1" });
    vi.mocked(useEducationContent).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("x"),
    } as never);

    render(<EducationViewPage />);
    fireEvent.click(screen.getByRole("button", { name: "common.back" }));

    expect(getMockRouter().back).toHaveBeenCalled();
  });

  it("renders content detail and back button", () => {
    setMockSearchParams({ id: "e1" });
    vi.mocked(useEducationContent).mockReturnValue({
      data: {
        id: "e1",
        title: "교육 자료",
        contentType: "TEXT",
        category: "SAFETY",
        isRequired: true,
        createdAt: "2026-02-28T00:00:00Z",
        content: "교육 상세",
        description: "요약",
      },
      isLoading: false,
      error: null,
    } as never);

    render(<EducationViewPage />);

    expect(screen.getByText("교육 자료")).toBeInTheDocument();
    expect(screen.getByText("education.requiredEducation")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "education.backToList" }),
    );
    expect(getMockRouter().back).toHaveBeenCalled();
  });
});
