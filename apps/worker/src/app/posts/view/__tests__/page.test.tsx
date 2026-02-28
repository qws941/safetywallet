import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PostViewPage from "@/app/posts/view/page";
import { usePost, useResubmitPost } from "@/hooks/use-api";
import { setMockSearchParams, getMockRouter } from "@/__tests__/mocks";

const toastMock = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  usePost: vi.fn(),
  useResubmitPost: vi.fn(),
}));
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));
vi.mock("@/components/header", () => ({ Header: () => <div>header</div> }));
vi.mock("@/components/bottom-nav", () => ({
  BottomNav: () => <div>bottom-nav</div>,
}));
vi.mock("@safetywallet/ui", async () => {
  const actual = await vi.importActual("@safetywallet/ui");
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

describe("app/posts/view/page", () => {
  it("renders not found state", () => {
    setMockSearchParams({ id: "p1" });
    vi.mocked(usePost).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("x"),
    } as never);
    vi.mocked(useResubmitPost).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);

    render(<PostViewPage />);
    fireEvent.click(screen.getByRole("button", { name: "posts.view.back" }));
    expect(getMockRouter().back).toHaveBeenCalled();
  });

  it("renders detail and resubmits need-info post", async () => {
    setMockSearchParams({ id: "p1" });
    const mutate = vi.fn(
      (_payload: unknown, options: { onSuccess: () => void }) =>
        options.onSuccess(),
    );
    vi.mocked(useResubmitPost).mockReturnValue({
      mutate,
      isPending: false,
    } as never);
    vi.mocked(usePost).mockReturnValue({
      data: {
        data: {
          id: "p1",
          category: "HAZARD",
          reviewStatus: "NEED_INFO",
          isUrgent: false,
          content: "상세 내용",
          createdAt: "2026-02-28T00:00:00Z",
          locationFloor: "3층",
          locationZone: "A",
          images: [],
          reviews: [
            { createdAt: "2026-02-28T01:00:00Z", comment: "추가 설명 필요" },
          ],
        },
      },
      isLoading: false,
      error: null,
    } as never);

    render(<PostViewPage />);
    fireEvent.click(
      screen.getByRole("button", { name: "posts.view.resubmitButton" }),
    );
    fireEvent.change(
      screen.getByPlaceholderText("posts.view.resubmitPlaceholder"),
      {
        target: { value: "보완 내용" },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "posts.view.resubmitSubmit" }),
    );

    await waitFor(() => {
      expect(mutate).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalled();
    });
  });
});
