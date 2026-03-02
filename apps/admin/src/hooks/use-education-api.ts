"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "./use-api-base";

export * from "./use-education-api-types";

export function useEducationContents(filters?: {
  limit?: number;
  offset?: number;
}) {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "education-contents", siteId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (siteId) params.set("siteId", siteId);
      params.set("includeInactive", "true");
      if (filters?.limit !== undefined) {
        params.set("limit", String(filters.limit));
      }
      if (filters?.offset !== undefined) {
        params.set("offset", String(filters.offset));
      }

      return apiFetch<
        import("./use-education-api-types").EducationContentsResponse
      >(`/education/contents?${params.toString()}`);
    },
    enabled: !!siteId,
  });
}

export function useEducationContent(id: string) {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "education-content", siteId, id],
    queryFn: () =>
      apiFetch<import("./use-education-api-types").EducationContent>(
        `/education/contents/${id}`,
      ),
    enabled: !!siteId && !!id,
  });
}

export function useCreateEducationContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: import("./use-education-api-types").CreateEducationContentInput,
    ) =>
      apiFetch<import("./use-education-api-types").EducationContent>(
        "/education/contents",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "education-contents"],
      });
    },
  });
}

export function useYouTubeOembed() {
  return useMutation({
    mutationFn: (url: string) =>
      apiFetch<import("./use-education-api-types").YouTubeOembedResponse>(
        `/education/youtube-oembed?url=${encodeURIComponent(url)}`,
      ),
  });
}

export function useDeleteEducationContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/education/contents/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "education-contents"],
      });
    },
  });
}

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

export function useStatutoryTrainings(filters?: {
  userId?: string;
  trainingType?: "NEW_WORKER" | "SPECIAL" | "REGULAR" | "CHANGE_OF_WORK";
  status?: "SCHEDULED" | "COMPLETED" | "EXPIRED";
  limit?: number;
  offset?: number;
}) {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "statutory-trainings", siteId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (siteId) params.set("siteId", siteId);
      if (filters?.userId) params.set("userId", filters.userId);
      if (filters?.trainingType) {
        params.set("trainingType", filters.trainingType);
      }
      if (filters?.status) params.set("status", filters.status);
      if (filters?.limit !== undefined) {
        params.set("limit", String(filters.limit));
      }
      if (filters?.offset !== undefined) {
        params.set("offset", String(filters.offset));
      }

      return apiFetch<
        import("./use-education-api-types").StatutoryTrainingsResponse
      >(`/education/statutory?${params.toString()}`);
    },
    enabled: !!siteId,
  });
}

export function useCreateStatutoryTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: import("./use-education-api-types").CreateStatutoryTrainingInput,
    ) =>
      apiFetch<import("./use-education-api-types").StatutoryTraining>(
        "/education/statutory",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "statutory-trainings"],
      });
    },
  });
}

export function useUpdateStatutoryTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: import("./use-education-api-types").UpdateStatutoryTrainingInput;
    }) =>
      apiFetch<import("./use-education-api-types").StatutoryTraining>(
        `/education/statutory/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "statutory-trainings"],
      });
    },
  });
}

export function useTbmRecords(filters?: {
  date?: string;
  limit?: number;
  offset?: number;
}) {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "tbm-records", siteId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (siteId) params.set("siteId", siteId);
      if (filters?.date) params.set("date", filters.date);
      if (filters?.limit !== undefined) {
        params.set("limit", String(filters.limit));
      }
      if (filters?.offset !== undefined) {
        params.set("offset", String(filters.offset));
      }

      return apiFetch<import("./use-education-api-types").TbmRecordsResponse>(
        `/education/tbm?${params.toString()}`,
      );
    },
    enabled: !!siteId,
  });
}

export function useTbmRecord(id: string) {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "tbm-record", siteId, id],
    queryFn: () =>
      apiFetch<import("./use-education-api-types").TbmRecordDetail>(
        `/education/tbm/${id}`,
      ),
    enabled: !!siteId && !!id,
  });
}

export function useCreateTbmRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: import("./use-education-api-types").CreateTbmRecordInput,
    ) =>
      apiFetch<import("./use-education-api-types").TbmRecord>(
        "/education/tbm",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tbm-records"] });
    },
  });
}

export function useUpdateEducationContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: import("./use-education-api-types").UpdateEducationContentInput;
    }) =>
      apiFetch<import("./use-education-api-types").EducationContent>(
        `/education/contents/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "education-contents"],
      });
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

export function useDeleteStatutoryTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/education/statutory/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "statutory-trainings"],
      });
    },
  });
}

export function useUpdateTbmRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: import("./use-education-api-types").UpdateTbmRecordInput;
    }) =>
      apiFetch<import("./use-education-api-types").TbmRecord>(
        `/education/tbm/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tbm-records"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tbm-record"] });
    },
  });
}

export function useDeleteTbmRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/education/tbm/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tbm-records"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tbm-record"] });
    },
  });
}
