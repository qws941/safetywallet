import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import QuizTakePage from "@/app/education/quiz-take/page";
import {
  useMyQuizAttempts,
  useQuiz,
  useSubmitQuizAttempt,
} from "@/hooks/use-api";
import { setMockSearchParams, getMockRouter } from "@/__tests__/mocks";

vi.mock("@/hooks/use-api", () => ({
  useQuiz: vi.fn(),
  useSubmitQuizAttempt: vi.fn(),
  useMyQuizAttempts: vi.fn(),
}));
vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => (key: string) => key,
}));
vi.mock("@/components/header", () => ({ Header: () => <div>header</div> }));
vi.mock("@/components/bottom-nav", () => ({
  BottomNav: () => <div>bottom-nav</div>,
}));

describe("app/education/quiz-take/page", () => {
  it("renders not found fallback", () => {
    setMockSearchParams({ id: "q1" });
    vi.mocked(useQuiz).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as never);
    vi.mocked(useMyQuizAttempts).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useSubmitQuizAttempt).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);

    render(<QuizTakePage />);
    fireEvent.click(screen.getByRole("button", { name: "common.back" }));
    expect(getMockRouter().back).toHaveBeenCalled();
  });

  it("submits quiz and shows result", async () => {
    setMockSearchParams({ id: "q1" });
    const mutate = vi.fn(
      (_payload: unknown, options: { onSuccess: (v: unknown) => void }) =>
        options.onSuccess({
          attempt: { score: 100, passed: true, answers: [0] },
        }),
    );
    vi.mocked(useSubmitQuizAttempt).mockReturnValue({
      mutate,
      isPending: false,
    } as never);
    vi.mocked(useMyQuizAttempts).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useQuiz).mockReturnValue({
      data: {
        id: "q1",
        title: "안전 퀴즈",
        passingScore: 60,
        maxAttempts: 3,
        questions: [
          {
            id: "qq1",
            question: "정답은?",
            questionType: "SINGLE_CHOICE",
            options: ["1", "2"],
            correctAnswer: 0,
            explanation: null,
            displayOrder: 1,
          },
        ],
      },
      isLoading: false,
    } as never);

    render(<QuizTakePage />);
    fireEvent.click(screen.getByText("1"));
    fireEvent.click(
      screen.getByRole("button", { name: "education.quiz.submitButton" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("education.quiz.status.pass"),
      ).toBeInTheDocument();
    });
  });

  it("shows previous answers when revisiting a quiz", async () => {
    setMockSearchParams({ id: "q1" });
    vi.mocked(useSubmitQuizAttempt).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useQuiz).mockReturnValue({
      data: {
        id: "q1",
        title: "안전 퀴즈",
        passingScore: 60,
        maxAttempts: 3,
        questions: [
          {
            id: "qq1",
            question: "정답은?",
            questionType: "SINGLE_CHOICE",
            options: ["사과", "배"],
            correctAnswer: 0,
            explanation: null,
            displayOrder: 1,
          },
        ],
      },
      isLoading: false,
    } as never);
    vi.mocked(useMyQuizAttempts).mockReturnValue({
      data: [
        {
          id: "a1",
          score: 90,
          passed: true,
          totalQuestions: 1,
          correctCount: 1,
          createdAt: "2024-01-01",
          answers: [1],
        },
      ],
      isLoading: false,
    } as never);

    render(<QuizTakePage />);

    await waitFor(() => {
      expect(
        screen.getByText("education.quiz.answersHeading"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("education.quiz.status.pass")).toBeInTheDocument();
    expect(screen.getByText("배")).toBeInTheDocument();
  });
});
