import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActionViewPage from "@/app/actions/view/page";
import {
  useAction,
  useDeleteActionImage,
  useUpdateActionStatus,
  useUploadActionImage,
} from "@/hooks/use-api";
import { setMockSearchParams, getMockRouter } from "@/__tests__/mocks";

vi.mock("@/hooks/use-api", () => ({
  useAction: vi.fn(),
  useUpdateActionStatus: vi.fn(),
  useUploadActionImage: vi.fn(),
  useDeleteActionImage: vi.fn(),
}));
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));
vi.mock("@/components/header", () => ({ Header: () => <div>header</div> }));
vi.mock("@/components/bottom-nav", () => ({
  BottomNav: () => <div>bottom-nav</div>,
}));
vi.mock("@/lib/image-compress", () => ({
  compressImage: vi.fn(async (file: File) => file),
}));

describe("app/actions/view/page", () => {
  beforeEach(() => {
    setMockSearchParams({ id: "a1" });
    vi.mocked(useUpdateActionStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    vi.mocked(useUploadActionImage).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    vi.mocked(useDeleteActionImage).mockReturnValue({ mutate: vi.fn() });
  });

  it("renders not found state", () => {
    vi.mocked(useAction).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("x"),
    });
    render(<ActionViewPage />);
    fireEvent.click(screen.getByRole("button", { name: "actions.view.back" }));
    expect(getMockRouter().back).toHaveBeenCalled();
  });

  it("updates status from assigned to in-progress", async () => {
    const mutate = vi.fn();
    vi.mocked(useUpdateActionStatus).mockReturnValue({
      mutate,
      isPending: false,
    });
    vi.mocked(useAction).mockReturnValue({
      data: {
        data: {
          id: "a1",
          actionStatus: "ASSIGNED",
          priority: "HIGH",
          description: "조치 필요",
          dueDate: null,
          assignee: null,
          images: [],
          post: null,
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ActionViewPage />);
    fireEvent.click(
      screen.getByRole("button", { name: "actions.view.startProgress" }),
    );

    await waitFor(() => {
      expect(mutate).toHaveBeenCalled();
    });
  });
});
