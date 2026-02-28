import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnnouncementsPage from "../page";
import {
  useAdminAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useUpdateAnnouncement,
} from "@/hooks/use-api";

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));
const createMutateMock = vi.fn();
const updateMutateMock = vi.fn();
const deleteMutateMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/announcements",
}));

vi.mock("@/hooks/use-api", () => ({
  useAdminAnnouncements: vi.fn(),
  useCreateAnnouncement: vi.fn(),
  useUpdateAnnouncement: vi.fn(),
  useDeleteAnnouncement: vi.fn(),
}));

vi.mock("@/components/rich-text-editor", () => ({
  RichTextEditor: ({
    content,
    onChange,
    placeholder,
  }: {
    content: string;
    onChange: (value: string) => void;
    placeholder: string;
  }) => (
    <textarea
      aria-label={placeholder}
      value={content}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("@safetywallet/ui", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    size,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit";
    size?: string;
  }) => (
    <button
      type={type ?? "button"}
      disabled={disabled}
      data-size={size}
      onClick={onClick}
    >
      {children}
    </button>
  ),
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Input: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
    placeholder?: string;
  }) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.({ target: { value: e.target.value } })}
    />
  ),
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: ReactNode }) => (
    <h3>{children}</h3>
  ),
  toast: toastMock,
}));

const mockUseAdminAnnouncements = vi.mocked(useAdminAnnouncements);
const mockUseCreateAnnouncement = vi.mocked(useCreateAnnouncement);
const mockUseUpdateAnnouncement = vi.mocked(useUpdateAnnouncement);
const mockUseDeleteAnnouncement = vi.mocked(useDeleteAnnouncement);

const toAnnouncementsResult = (
  value: unknown,
): ReturnType<typeof useAdminAnnouncements> => value as never;

describe("AnnouncementsPage", () => {
  beforeEach(() => {
    toastMock.mockReset();
    createMutateMock.mockReset();
    updateMutateMock.mockReset();
    deleteMutateMock.mockReset();

    mockUseAdminAnnouncements.mockReturnValue(
      toAnnouncementsResult({ data: [], isLoading: false }),
    );
    mockUseCreateAnnouncement.mockReturnValue({
      mutate: createMutateMock,
      isPending: false,
    } as never);
    mockUseUpdateAnnouncement.mockReturnValue({
      mutate: updateMutateMock,
      isPending: false,
    } as never);
    mockUseDeleteAnnouncement.mockReturnValue({
      mutate: deleteMutateMock,
      isPending: false,
    } as never);
  });

  it("renders loading and empty states", () => {
    mockUseAdminAnnouncements.mockReturnValueOnce(
      toAnnouncementsResult({ data: [], isLoading: true }),
    );
    const { rerender } = render(<AnnouncementsPage />);
    expect(screen.getByText("로딩 중...")).toBeInTheDocument();

    mockUseAdminAnnouncements.mockReturnValue(
      toAnnouncementsResult({ data: [], isLoading: false }),
    );
    rerender(<AnnouncementsPage />);
    expect(screen.getByText("공지사항이 없습니다")).toBeInTheDocument();
  });

  it("creates announcement and resets form on success", async () => {
    createMutateMock.mockImplementation(
      (_payload, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      },
    );

    render(<AnnouncementsPage />);

    fireEvent.click(screen.getByRole("button", { name: /새 공지/ }));
    fireEvent.change(screen.getByPlaceholderText("제목"), {
      target: { value: "안전 공지" },
    });
    fireEvent.change(screen.getByLabelText("내용"), {
      target: { value: "헬멧 착용 필수" },
    });
    fireEvent.click(screen.getByRole("button", { name: "등록" }));

    await waitFor(() => {
      expect(createMutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "안전 공지",
          content: "헬멧 착용 필수",
          isPinned: false,
        }),
        expect.any(Object),
      );
    });
  });

  it("edits announcement and submits update", async () => {
    updateMutateMock.mockImplementation(
      (_payload, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      },
    );
    mockUseAdminAnnouncements.mockReturnValueOnce(
      toAnnouncementsResult({
        isLoading: false,
        data: [
          {
            id: "ann-1",
            title: "기존 공지",
            content: "<p>본문</p>",
            isPinned: true,
            scheduledAt: null,
            status: "PUBLISHED",
            createdAt: "2026-02-28T00:00:00.000Z",
          },
        ],
      }),
    );

    render(<AnnouncementsPage />);

    fireEvent.click(screen.getAllByRole("button", { name: "" })[0]);
    fireEvent.change(screen.getByPlaceholderText("제목"), {
      target: { value: "수정 공지" },
    });
    fireEvent.change(screen.getByLabelText("내용"), {
      target: { value: "수정 내용" },
    });
    fireEvent.click(screen.getByRole("button", { name: "수정" }));

    await waitFor(() => {
      expect(updateMutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "ann-1",
          title: "수정 공지",
          content: "수정 내용",
        }),
        expect.any(Object),
      );
    });
  });

  it("confirms delete and handles success/error toasts", async () => {
    mockUseAdminAnnouncements.mockReturnValue(
      toAnnouncementsResult({
        isLoading: false,
        data: [
          {
            id: "ann-1",
            title: "공지",
            content: "<p>본문</p>",
            isPinned: false,
            scheduledAt: null,
            status: "PUBLISHED",
            createdAt: "2026-02-28T00:00:00.000Z",
          },
        ],
      }),
    );
    deleteMutateMock.mockImplementationOnce(
      (_id, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
      },
    );
    deleteMutateMock.mockImplementationOnce(
      (_id, options: { onError?: (e: Error) => void }) => {
        options.onError?.(new Error("삭제 실패"));
      },
    );

    render(<AnnouncementsPage />);

    fireEvent.click(screen.getAllByRole("button", { name: "" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => {
      expect(deleteMutateMock).toHaveBeenCalledWith(
        "ann-1",
        expect.any(Object),
      );
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: "삭제되었습니다." }),
      );
    });

    fireEvent.click(screen.getAllByRole("button", { name: "" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          description: expect.stringContaining("삭제 실패"),
        }),
      );
    });
  });
});
