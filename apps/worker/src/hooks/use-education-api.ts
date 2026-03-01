"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  apiFetch,
  type ApiResponse,
} from "./use-api-base";

export function useEducationContents(siteId: string) {
  return useQuery({
    queryKey: ["education-contents", siteId],
    queryFn: () =>
      apiFetch<
        ApiResponse<{
          contents: Array<{
            id: string;
            siteId: string;
            title: string;
            content: string;
            contentType: string;
            category: string;
            isRequired: boolean;
            displayOrder: number;
            createdAt: string;
            contentUrl?: string;
            thumbnailUrl?: string;
            description?: string;
          }>;
        }>
      >(`/education/contents?siteId=${siteId}`).then((r) => r.data.contents),
    enabled: !!siteId,
  });
}

export function useEducationContent(id: string) {
  return useQuery({
    queryKey: ["education-content", id],
    queryFn: () =>
      apiFetch<
        ApiResponse<{
          id: string;
          title: string;
          content: string;
          contentType: string;
          category: string;
          isRequired: boolean;
          createdAt: string;
          contentUrl?: string;
          sourceUrl?: string;
          thumbnailUrl?: string;
          description?: string;
        }>
      >(`/education/contents/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useQuizzes(siteId: string) {
  return useQuery({
    queryKey: ["quizzes", siteId],
    queryFn: () =>
      apiFetch<
        ApiResponse<{
          quizzes: Array<{
            id: string;
            title: string;
            description: string | null;
            passingScore: number;
            timeLimitMinutes: number | null;
            maxAttempts: number;
            isActive: boolean;
            createdAt: string;
            questions?: Array<{
              id: string;
              question: string;
              questionType?:
                | "SINGLE_CHOICE"
                | "OX"
                | "MULTI_CHOICE"
                | "SHORT_ANSWER";
              options: string | string[];
              correctAnswer: number;
              correctAnswerText?: string | null;
              explanation: string | null;
              displayOrder: number;
            }>;
          }>;
        }>
      >(`/education/quizzes?siteId=${siteId}&status=PUBLISHED`).then(
        (r) => r.data.quizzes,
      ),
    enabled: !!siteId,
  });
}

export function useQuiz(id: string) {
  return useQuery({
    queryKey: ["quiz", id],
    queryFn: () =>
      apiFetch<
        ApiResponse<{
          id: string;
          title: string;
          description: string | null;
          passingScore: number;
          timeLimitMinutes: number | null;
          maxAttempts: number;
          questions: Array<{
            id: string;
            question: string;
            questionType?:
              | "SINGLE_CHOICE"
              | "OX"
              | "MULTI_CHOICE"
              | "SHORT_ANSWER";
            options: string | string[];
            correctAnswer: number;
            correctAnswerText?: string | null;
            explanation: string | null;
            displayOrder: number;
          }>;
        }>
      >(`/education/quizzes/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useSubmitQuizAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      quizId,
      answers,
      questionOrder,
    }: {
      quizId: string;
      answers: Record<string, number | number[] | string>;
      questionOrder?: string[];
    }) =>
      apiFetch<
        ApiResponse<{
          attempt: {
            id: string;
            score: number;
            passed: boolean;
            totalQuestions: number;
            correctCount: number;
          };
        }>
      >(`/education/quizzes/${quizId}/attempt`, {
        method: "POST",
        body: JSON.stringify({
          answers: questionOrder
            ? questionOrder.map(
                (questionId: string) => answers[questionId] ?? "",
              )
            : answers,
        }),
        offlineQueue: true,
      }).then((r) => r.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["quiz-attempts", variables.quizId],
      });
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
  });
}

export function useMyQuizAttempts(quizId: string) {
  return useQuery({
    queryKey: ["quiz-attempts", quizId],
    queryFn: () =>
      apiFetch<
        ApiResponse<{
          attempts: Array<{
            id: string;
            score: number;
            passed: boolean;
            totalQuestions: number;
            correctCount: number;
            createdAt: string;
          }>;
        }>
      >(`/education/quizzes/${quizId}/my-attempts`).then(
        (r) => r.data.attempts,
      ),
    enabled: !!quizId,
  });
}

export function useTbmRecords(siteId: string) {
  return useQuery({
    queryKey: ["tbm-records", siteId],
    queryFn: () =>
      apiFetch<
        ApiResponse<{
          records: Array<{
            tbm: {
              id: string;
              siteId: string;
              date: number;
              topic: string;
              content: string | null;
              leaderId: string;
              createdAt: string;
              updatedAt: string;
            };
            leaderName: string;
          }>;
        }>
      >(`/education/tbm?siteId=${siteId}`).then((r) =>
        r.data.records.map((rec) => ({
          id: rec.tbm.id,
          title: rec.tbm.topic,
          date: new Date(rec.tbm.date * 1000).toLocaleDateString("ko-KR"),
          location: null as string | null,
          content: rec.tbm.content,
          safetyTopic: rec.tbm.topic,
          leader: rec.leaderName ? { nameMasked: rec.leaderName } : undefined,
          _count: { attendees: 0 },
        })),
      ),
    enabled: !!siteId,
  });
}

export function useAttendTbm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tbmId: string) =>
      apiFetch(`/education/tbm/${tbmId}/attend`, {
        method: "POST",
        body: JSON.stringify({ tbmRecordId: tbmId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tbm-records"] });
    },
  });
}
