import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewPostPage from "@/app/posts/new/page";
import { useAuth } from "@/hooks/use-auth";
import { useCreatePost } from "@/hooks/use-api";
import { getMockRouter } from "@/__tests__/mocks";

const toastMock = vi.fn();

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/use-api", () => ({ useCreatePost: vi.fn() }));
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));
vi.mock("@/components/header", () => ({ Header: () => <div>header</div> }));
vi.mock("@/components/unsafe-warning-modal", () => ({
  UnsafeWarningModal: ({
    open,
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    open ? (
      <div>
        <button onClick={onConfirm}>warning-confirm</button>
        <button onClick={onCancel}>warning-cancel</button>
      </div>
    ) : null,
}));
vi.mock("@/lib/image-compress", () => ({
  compressImages: vi.fn(async (files: File[]) => files),
}));
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@safetywallet/ui", async () => {
  const actual = await vi.importActual("@safetywallet/ui");
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

describe("app/posts/new/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      currentSiteId: "site-1",
      isAuthenticated: true,
      _hasHydrated: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentSite: vi.fn(),
    });
    vi.mocked(useCreatePost).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ data: { post: { id: "p1" } } }),
    } as never);
  });

  it("renders category options and hides location for inconvenience", () => {
    render(<NewPostPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /posts.category.inconvenience/ }),
    );
    expect(
      screen.queryByPlaceholderText("posts.new.zone"),
    ).not.toBeInTheDocument();
  });

  it("opens unsafe warning modal before submit", () => {
    render(<NewPostPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /posts.category.unsafeBehavior/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "posts.submit" }));

    expect(
      screen.getByRole("button", { name: "warning-confirm" }),
    ).toBeInTheDocument();
  });

  it("submits post and redirects to list", async () => {
    const mutateAsync = vi
      .fn()
      .mockResolvedValue({ data: { post: { id: "p1" } } });
    vi.mocked(useCreatePost).mockReturnValue({ mutateAsync } as never);

    render(<NewPostPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /posts.category.hazard/ }),
    );
    fireEvent.change(screen.getByPlaceholderText("posts.description"), {
      target: { value: "위험 요소 발견" },
    });
    fireEvent.click(screen.getByRole("button", { name: "posts.submit" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
      expect(getMockRouter().replace).toHaveBeenCalledWith("/posts");
    });
  });
});
