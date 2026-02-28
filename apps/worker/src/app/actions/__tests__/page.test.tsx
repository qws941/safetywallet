import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActionsPage from "@/app/actions/page";
import { useMyActions } from "@/hooks/use-api";

vi.mock("@/hooks/use-api", () => ({ useMyActions: vi.fn() }));
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));
vi.mock("@/components/header", () => ({ Header: () => <div>header</div> }));
vi.mock("@/components/bottom-nav", () => ({
  BottomNav: () => <div>bottom-nav</div>,
}));

describe("app/actions/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state", () => {
    vi.mocked(useMyActions).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    render(<ActionsPage />);
    expect(screen.getByText("actions.list.myList")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    vi.mocked(useMyActions).mockReturnValue({
      data: { data: [] },
      isLoading: false,
    });
    render(<ActionsPage />);
    expect(screen.getByText("actions.list.empty")).toBeInTheDocument();
  });

  it("renders action cards and pushes detail route", () => {
    vi.mocked(useMyActions).mockReturnValue({
      data: {
        data: [
          {
            id: "a1",
            actionStatus: "ASSIGNED",
            priority: "HIGH",
            description: "안전 점검",
            dueDate: "2099-01-01",
            post: { title: "연관 제보" },
          },
        ],
      },
      isLoading: false,
    });

    render(<ActionsPage />);
    fireEvent.click(screen.getByText("안전 점검"));

    expect(screen.getByText(/actions.view.relatedReport/)).toBeInTheDocument();
  });
});
