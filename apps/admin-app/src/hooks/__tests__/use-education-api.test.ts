import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useCreateEducationContent,
  useCreateQuiz,
  useCreateQuizQuestion,
  useCreateStatutoryTraining,
  useCreateTbmRecord,
  useDeleteEducationContent,
  useDeleteQuizQuestion,
  useEducationContent,
  useEducationContents,
  useQuiz,
  useQuizzes,
  useStatutoryTrainings,
  useTbmRecord,
  useTbmRecords,
  useUpdateQuizQuestion,
  useUpdateStatutoryTraining,
} from "@/hooks/use-education-api";
import { createWrapper } from "@/hooks/__tests__/test-utils";

const mockApiFetch = vi.fn();
let currentSiteId: string | null = "site-1";

vi.mock("@/hooks/use-api-base", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));
vi.mock("@/stores/auth", () => ({
  useAuthStore: (
    selector: (state: { currentSiteId: string | null }) => unknown,
  ) => selector({ currentSiteId }),
}));

describe("use-education-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSiteId = "site-1";
  });

  it("loads education contents by site and pagination filters", async () => {
    mockApiFetch.mockResolvedValue({
      contents: [],
      total: 0,
      limit: 10,
      offset: 0,
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useEducationContents({ limit: 10, offset: 0 }),
      {
        wrapper,
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/education/contents?siteId=site-1&limit=10&offset=0",
    );
  });

  it("creates quiz and invalidates quiz list", async () => {
    mockApiFetch.mockResolvedValue({ id: "quiz-1" });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateQuiz(), { wrapper });

    await result.current.mutateAsync({
      siteId: "site-1",
      title: "기본 안전교육",
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/education/quizzes",
      expect.objectContaining({ method: "POST" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "quizzes"],
    });
  });

  it("fetches single resources and disables query without ids", async () => {
    mockApiFetch
      .mockResolvedValueOnce({ id: "content-1" })
      .mockResolvedValueOnce({ id: "quiz-1", questions: [] })
      .mockResolvedValueOnce({ id: "tbm-1", attendees: [] });
    const { wrapper } = createWrapper();

    const content = renderHook(() => useEducationContent("content-1"), {
      wrapper,
    });
    await waitFor(() => expect(content.result.current.isSuccess).toBe(true));

    const quiz = renderHook(() => useQuiz("quiz-1"), { wrapper });
    await waitFor(() => expect(quiz.result.current.isSuccess).toBe(true));

    const tbm = renderHook(() => useTbmRecord("tbm-1"), { wrapper });
    await waitFor(() => expect(tbm.result.current.isSuccess).toBe(true));

    const disabled = renderHook(() => useEducationContent(""), { wrapper });
    expect(disabled.result.current.fetchStatus).toBe("idle");
  });

  it("builds query params for quizzes, statutory trainings and tbm records", async () => {
    mockApiFetch
      .mockResolvedValueOnce({ quizzes: [], total: 0, limit: 20, offset: 0 })
      .mockResolvedValueOnce({ trainings: [], total: 0, limit: 20, offset: 0 })
      .mockResolvedValueOnce({ records: [], total: 0, limit: 20, offset: 0 });
    const { wrapper } = createWrapper();

    renderHook(() => useQuizzes({ status: "PUBLISHED", limit: 5, offset: 2 }), {
      wrapper,
    });
    renderHook(
      () =>
        useStatutoryTrainings({
          userId: "u1",
          trainingType: "SPECIAL",
          status: "COMPLETED",
          limit: 1,
          offset: 3,
        }),
      { wrapper },
    );
    renderHook(
      () => useTbmRecords({ date: "2026-02-01", limit: 2, offset: 4 }),
      {
        wrapper,
      },
    );

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(3));
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/education/quizzes?siteId=site-1&status=PUBLISHED&limit=5&offset=2",
    );
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/education/statutory?siteId=site-1&userId=u1&trainingType=SPECIAL&status=COMPLETED&limit=1&offset=3",
    );
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/education/tbm?siteId=site-1&date=2026-02-01&limit=2&offset=4",
    );
  });

  it("invalidates education contents on create/delete", async () => {
    mockApiFetch.mockResolvedValue({ ok: true });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const create = renderHook(() => useCreateEducationContent(), { wrapper });
    await create.result.current.mutateAsync({
      siteId: "site-1",
      title: "교육자료",
      contentType: "TEXT",
    });

    const remove = renderHook(() => useDeleteEducationContent(), { wrapper });
    await remove.result.current.mutateAsync("content-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/education/contents",
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/education/contents/content-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "education-contents"],
    });
  });

  it("invalidates quiz caches on question create/update/delete", async () => {
    mockApiFetch.mockResolvedValue({ ok: true });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const createQuestion = renderHook(() => useCreateQuizQuestion(), {
      wrapper,
    });
    await createQuestion.result.current.mutateAsync({
      quizId: "quiz-1",
      data: { question: "q", options: ["a"], correctAnswer: 0 },
    });

    const updateQuestion = renderHook(() => useUpdateQuizQuestion(), {
      wrapper,
    });
    await updateQuestion.result.current.mutateAsync({
      quizId: "quiz-1",
      questionId: "question-1",
      data: { explanation: "exp" },
    });

    const deleteQuestion = renderHook(() => useDeleteQuizQuestion(), {
      wrapper,
    });
    await deleteQuestion.result.current.mutateAsync({
      quizId: "quiz-1",
      questionId: "question-1",
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/education/quizzes/quiz-1/questions",
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/education/quizzes/quiz-1/questions/question-1",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/education/quizzes/quiz-1/questions/question-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["admin", "quiz"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "quizzes"],
    });
  });

  it("invalidates statutory and tbm lists on create/update", async () => {
    mockApiFetch.mockResolvedValue({ ok: true });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const createTraining = renderHook(() => useCreateStatutoryTraining(), {
      wrapper,
    });
    await createTraining.result.current.mutateAsync({
      siteId: "site-1",
      userId: "u1",
      trainingType: "REGULAR",
      trainingName: "정기교육",
      trainingDate: "2026-02-14",
    });

    const updateTraining = renderHook(() => useUpdateStatutoryTraining(), {
      wrapper,
    });
    await updateTraining.result.current.mutateAsync({
      id: "training-1",
      data: { notes: "수정" },
    });

    const createTbm = renderHook(() => useCreateTbmRecord(), { wrapper });
    await createTbm.result.current.mutateAsync({
      siteId: "site-1",
      date: "2026-02-14",
      topic: "TBM",
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "statutory-trainings"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "tbm-records"],
    });
  });

  it("disables list queries when current site id is missing", () => {
    currentSiteId = null;
    const { wrapper } = createWrapper();

    const contents = renderHook(() => useEducationContents(), { wrapper });
    const quizzes = renderHook(() => useQuizzes(), { wrapper });

    expect(contents.result.current.fetchStatus).toBe("idle");
    expect(quizzes.result.current.fetchStatus).toBe("idle");
  });

  it("builds statutory training query without optional filters", async () => {
    mockApiFetch.mockResolvedValue({ trainings: [], total: 0 });
    const { wrapper } = createWrapper();
    renderHook(() => useStatutoryTrainings(), { wrapper });

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/education/statutory?siteId=site-1",
    );
  });

  it("builds tbm records query without optional filters", async () => {
    mockApiFetch.mockResolvedValue({ records: [], total: 0 });
    const { wrapper } = createWrapper();
    renderHook(() => useTbmRecords(), { wrapper });

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    expect(mockApiFetch).toHaveBeenCalledWith("/education/tbm?siteId=site-1");
  });

  it("builds education contents query without filters", async () => {
    mockApiFetch.mockResolvedValue({ contents: [], total: 0 });
    const { wrapper } = createWrapper();
    renderHook(() => useEducationContents(), { wrapper });

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/education/contents?siteId=site-1",
    );
  });

  it("builds quizzes query without optional filters", async () => {
    mockApiFetch.mockResolvedValue({ quizzes: [], total: 0 });
    const { wrapper } = createWrapper();
    renderHook(() => useQuizzes(), { wrapper });

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/education/quizzes?siteId=site-1",
    );
  });
});
