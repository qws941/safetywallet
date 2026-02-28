import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuizzesTab } from "../quizzes-tab";
import {
  useCreateQuiz,
  useCreateQuizQuestion,
  useDeleteQuizQuestion,
  useQuiz,
  useQuizzes,
  useUpdateQuizQuestion,
} from "@/hooks/use-api";

const toastMock = vi.fn();
const createQuizAsyncMock = vi.fn();
const createQuestionAsyncMock = vi.fn();
const updateQuestionAsyncMock = vi.fn();
const deleteQuestionAsyncMock = vi.fn();

vi.mock("@/stores/auth", () => ({
  useAuthStore: (selector: (s: { currentSiteId: string }) => string) =>
    selector({ currentSiteId: "site-1" }),
}));

vi.mock("@/hooks/use-api", () => ({
  useCreateQuiz: vi.fn(),
  useCreateQuizQuestion: vi.fn(),
  useDeleteQuizQuestion: vi.fn(),
  useQuiz: vi.fn(),
  useQuizzes: vi.fn(),
  useUpdateQuizQuestion: vi.fn(),
}));

vi.mock("@safetywallet/ui", () => ({
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
  useToast: () => ({ toast: toastMock }),
}));

const mockUseQuizzes = vi.mocked(useQuizzes);
const mockUseQuiz = vi.mocked(useQuiz);
const mockUseCreateQuiz = vi.mocked(useCreateQuiz);
const mockUseCreateQuizQuestion = vi.mocked(useCreateQuizQuestion);
const mockUseUpdateQuizQuestion = vi.mocked(useUpdateQuizQuestion);
const mockUseDeleteQuizQuestion = vi.mocked(useDeleteQuizQuestion);

describe("quizzes tab", () => {
  beforeEach(() => {
    toastMock.mockReset();
    createQuizAsyncMock.mockReset();
    createQuestionAsyncMock.mockReset();
    updateQuestionAsyncMock.mockReset();
    deleteQuestionAsyncMock.mockReset();

    mockUseQuizzes.mockReturnValue({
      data: {
        quizzes: [
          {
            id: "q1",
            title: "안전 퀴즈",
            status: "DRAFT",
            passingScore: 70,
            timeLimitMinutes: 10,
            createdAt: "2026-02-01T00:00:00.000Z",
          },
        ],
      },
      isLoading: false,
    } as ReturnType<typeof useQuizzes>);
    mockUseQuiz.mockReturnValue({
      data: {
        title: "안전 퀴즈",
        questions: [],
      },
    } as ReturnType<typeof useQuiz>);
    mockUseCreateQuiz.mockReturnValue({
      mutateAsync: createQuizAsyncMock,
      isPending: false,
    } as ReturnType<typeof useCreateQuiz>);
    mockUseCreateQuizQuestion.mockReturnValue({
      mutateAsync: createQuestionAsyncMock,
    } as ReturnType<typeof useCreateQuizQuestion>);
    mockUseUpdateQuizQuestion.mockReturnValue({
      mutateAsync: updateQuestionAsyncMock,
    } as ReturnType<typeof useUpdateQuizQuestion>);
    mockUseDeleteQuizQuestion.mockReturnValue({
      mutateAsync: deleteQuestionAsyncMock,
    } as ReturnType<typeof useDeleteQuizQuestion>);
  });

  it("creates quiz and shows quiz list", async () => {
    render(<QuizzesTab />);
    expect(screen.getByText("퀴즈 목록")).toBeInTheDocument();
    expect(screen.getByText("안전 퀴즈")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("퀴즈 제목"), {
      target: { value: "신규 퀴즈" },
    });
    fireEvent.click(screen.getByRole("button", { name: "퀴즈 등록" }));

    await waitFor(() => {
      expect(createQuizAsyncMock).toHaveBeenCalled();
    });
  });

  it("validates question options and shows error toast", async () => {
    render(<QuizzesTab />);
    fireEvent.click(screen.getByRole("button", { name: "문항 관리" }));
    fireEvent.change(screen.getByPlaceholderText("문항"), {
      target: { value: "문항1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "문항 추가" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive" }),
      );
    });
    expect(createQuestionAsyncMock).not.toHaveBeenCalled();
  });
});
