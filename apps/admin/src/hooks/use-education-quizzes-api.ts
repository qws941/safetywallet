"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "./use-api-base";

export function useQuizzes(filters?: {
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  limit?: number;
  offset?: number;
}) {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "quizzes", siteId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (siteId) params.set("siteId", siteId);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.limit !== undefined) {
        params.set("limit", String(filters.limit));
      }
      if (filters?.offset !== undefined) {
        params.set("offset", String(filters.offset));
      }

      return apiFetch<import("./use-education-api-types").QuizzesResponse>(
        `/education/quizzes?${params.toString()}`,
      );
    },
    enabled: !!siteId,
  });
}

export function useQuiz(id: string) {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "quiz", siteId, id],
    queryFn: () =>
      apiFetch<import("./use-education-api-types").QuizWithQuestions>(
        `/education/quizzes/${id}`,
      ),
    enabled: !!siteId && !!id,
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: import("./use-education-api-types").CreateQuizInput) =>
      apiFetch<import("./use-education-api-types").Quiz>("/education/quizzes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "quizzes"] });
    },
  });
}

export function useCreateQuizQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quizId,
      data,
    }: {
      quizId: string;
      data: import("./use-education-api-types").CreateQuizQuestionInput;
    }) =>
      apiFetch<import("./use-education-api-types").QuizQuestion>(
        `/education/quizzes/${quizId}/questions`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "quiz"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "quizzes"] });
    },
  });
}

export function useUpdateQuizQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quizId,
      questionId,
      data,
    }: {
      quizId: string;
      questionId: string;
      data: import("./use-education-api-types").UpdateQuizQuestionInput;
    }) =>
      apiFetch<import("./use-education-api-types").QuizQuestion>(
        `/education/quizzes/${quizId}/questions/${questionId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "quiz"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "quizzes"] });
    },
  });
}

export function useDeleteQuizQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quizId,
      questionId,
    }: {
      quizId: string;
      questionId: string;
    }) =>
      apiFetch<{ deleted: boolean }>(
        `/education/quizzes/${quizId}/questions/${questionId}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "quiz"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "quizzes"] });
    },
  });
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: import("./use-education-api-types").UpdateQuizInput;
    }) =>
      apiFetch<import("./use-education-api-types").Quiz>(
        `/education/quizzes/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "quiz"] });
    },
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/education/quizzes/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "quiz"] });
    },
  });
}
