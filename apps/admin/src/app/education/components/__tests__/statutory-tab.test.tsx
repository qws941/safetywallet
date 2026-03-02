import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatutoryTab } from "../statutory-tab";
import {
  useCreateStatutoryTraining,
  useDeleteStatutoryTraining,
  useStatutoryTrainings,
  useUpdateStatutoryTraining,
} from "@/hooks/use-api";

const toastMock = vi.fn();
const createAsyncMock = vi.fn();
const updateAsyncMock = vi.fn();
const deleteAsyncMock = vi.fn();

vi.mock("@/stores/auth", () => ({
  useAuthStore: (selector: (s: { currentSiteId: string }) => string) =>
    selector({ currentSiteId: "site-1" }),
}));

vi.mock("@/hooks/use-api", () => ({
  useCreateStatutoryTraining: vi.fn(),
  useDeleteStatutoryTraining: vi.fn(),
  useStatutoryTrainings: vi.fn(),
  useUpdateStatutoryTraining: vi.fn(),
}));

vi.mock("@safetywallet/ui", () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({ children }: { children: ReactNode }) => (
    <button>{children}</button>
  ),
  AlertDialogAction: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={props.type ?? "button"} {...props}>
      {children}
    </button>
  ),
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
  useToast: () => ({ toast: toastMock }),
}));

const mockUseStatutoryTrainings = vi.mocked(useStatutoryTrainings);
const mockUseCreateStatutoryTraining = vi.mocked(useCreateStatutoryTraining);
const mockUseUpdateStatutoryTraining = vi.mocked(useUpdateStatutoryTraining);
const mockUseDeleteStatutoryTraining = vi.mocked(useDeleteStatutoryTraining);

describe("statutory tab", () => {
  beforeEach(() => {
    toastMock.mockReset();
    createAsyncMock.mockReset();
    updateAsyncMock.mockReset();
    deleteAsyncMock.mockReset();

    mockUseStatutoryTrainings.mockReturnValue({
      data: {
        trainings: [
          {
            training: {
              id: "t1",
              userId: "u1",
              trainingType: "NEW_WORKER",
              trainingName: "신규자 교육",
              trainingDate: "2026-02-01",
              expirationDate: null,
              provider: null,
              hoursCompleted: 2,
              status: "SCHEDULED",
              notes: null,
            },
            userName: "홍길동",
          },
        ],
      },
      isLoading: false,
    } as never);
    mockUseCreateStatutoryTraining.mockReturnValue({
      mutateAsync: createAsyncMock,
    } as never);
    mockUseUpdateStatutoryTraining.mockReturnValue({
      mutateAsync: updateAsyncMock,
    } as never);
    mockUseDeleteStatutoryTraining.mockReturnValue({
      mutateAsync: deleteAsyncMock,
      isPending: false,
    } as never);
  });

  it("creates statutory training", async () => {
    render(<StatutoryTab />);
    fireEvent.change(screen.getByPlaceholderText("대상자 사용자 ID"), {
      target: { value: "u1" },
    });
    fireEvent.change(screen.getByPlaceholderText("교육명"), {
      target: { value: "정기 안전교육" },
    });
    fireEvent.change(screen.getAllByDisplayValue("")[0], {
      target: { value: "2026-02-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: "법정교육 등록" }));
    await waitFor(() => {
      expect(createAsyncMock).toHaveBeenCalled();
    });
  });

  it("loads list and enters edit mode", () => {
    render(<StatutoryTab />);
    expect(screen.getByText("신규자 교육")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    expect(
      screen.getByRole("button", { name: "수정 저장" }),
    ).toBeInTheDocument();
  });
});
