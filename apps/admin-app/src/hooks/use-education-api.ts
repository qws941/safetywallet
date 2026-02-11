"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "./use-api-base";

export interface EducationContent {
  id: string;
  siteId: string;
  title: string;
  description: string | null;
  contentType: "VIDEO" | "IMAGE" | "TEXT" | "DOCUMENT";
  contentUrl: string | null;
  thumbnailUrl: string | null;
  durationMinutes: number | null;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface EducationContentsResponse {
  contents: EducationContent[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateEducationContentInput {
  siteId: string;
  title: string;
  contentType: "VIDEO" | "IMAGE" | "TEXT" | "DOCUMENT";
  description?: string;
  contentUrl?: string;
  thumbnailUrl?: string;
  durationMinutes?: number;
}

export interface Quiz {
  id: string;
  siteId: string;
  contentId: string | null;
  title: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  pointsReward: number;
  passingScore: number;
  timeLimitMinutes: number | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizWithQuestions extends Quiz {
  questions: QuizQuestion[];
}

export interface QuizzesResponse {
  quizzes: Quiz[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateQuizInput {
  siteId: string;
  title: string;
  contentId?: string;
  description?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  pointsReward?: number;
  passingScore?: number;
  timeLimitMinutes?: number;
}

export interface CreateQuizQuestionInput {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  orderIndex?: number;
}

export interface UpdateQuizQuestionInput {
  question?: string;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
  orderIndex?: number;
}

export interface StatutoryTraining {
  id: string;
  siteId: string;
  userId: string;
  trainingType: "NEW_WORKER" | "SPECIAL" | "REGULAR" | "CHANGE_OF_WORK";
  trainingName: string;
  trainingDate: string;
  expirationDate: string | null;
  provider: string | null;
  certificateUrl: string | null;
  hoursCompleted: number;
  status: "SCHEDULED" | "COMPLETED" | "EXPIRED";
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatutoryTrainingRow {
  training: StatutoryTraining;
  userName: string | null;
}

export interface StatutoryTrainingsResponse {
  trainings: StatutoryTrainingRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateStatutoryTrainingInput {
  siteId: string;
  userId: string;
  trainingType: "NEW_WORKER" | "SPECIAL" | "REGULAR" | "CHANGE_OF_WORK";
  trainingName: string;
  trainingDate: string;
  expirationDate?: string;
  provider?: string;
  certificateUrl?: string;
  hoursCompleted?: number;
  status?: "SCHEDULED" | "COMPLETED" | "EXPIRED";
  notes?: string;
}

export interface UpdateStatutoryTrainingInput {
  trainingType?: "NEW_WORKER" | "SPECIAL" | "REGULAR" | "CHANGE_OF_WORK";
  trainingName?: string;
  trainingDate?: string;
  expirationDate?: string;
  provider?: string;
  certificateUrl?: string;
  hoursCompleted?: number;
  status?: "SCHEDULED" | "COMPLETED" | "EXPIRED";
  notes?: string;
}

export interface TbmRecord {
  id: string;
  siteId: string;
  date: string;
  topic: string;
  content: string | null;
  leaderId: string;
  weatherCondition: string | null;
  specialNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TbmRecordRow {
  tbm: TbmRecord;
  leaderName: string | null;
}

export interface TbmRecordsResponse {
  records: TbmRecordRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface TbmAttendee {
  attendee: {
    id: string;
    tbmRecordId: string;
    userId: string;
    attendedAt: string;
  };
  userName: string | null;
}

export interface TbmRecordDetail extends TbmRecord {
  leaderName: string | null;
  attendees: TbmAttendee[];
  attendeeCount: number;
}

export interface CreateTbmRecordInput {
  siteId: string;
  date: string;
  topic: string;
  content?: string;
  leaderId?: string;
  weatherCondition?: string;
  specialNotes?: string;
}

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
      if (filters?.limit !== undefined) {
        params.set("limit", String(filters.limit));
      }
      if (filters?.offset !== undefined) {
        params.set("offset", String(filters.offset));
      }

      return apiFetch<EducationContentsResponse>(
        `/education/contents?${params.toString()}`,
      );
    },
    enabled: !!siteId,
  });
}

export function useEducationContent(id: string) {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "education-content", siteId, id],
    queryFn: () => apiFetch<EducationContent>(`/education/contents/${id}`),
    enabled: !!siteId && !!id,
  });
}

export function useCreateEducationContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEducationContentInput) =>
      apiFetch<EducationContent>("/education/contents", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "education-contents"],
      });
    },
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

      return apiFetch<QuizzesResponse>(
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
    queryFn: () => apiFetch<QuizWithQuestions>(`/education/quizzes/${id}`),
    enabled: !!siteId && !!id,
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuizInput) =>
      apiFetch<Quiz>("/education/quizzes", {
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
      data: CreateQuizQuestionInput;
    }) =>
      apiFetch<QuizQuestion>(`/education/quizzes/${quizId}/questions`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
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
      data: UpdateQuizQuestionInput;
    }) =>
      apiFetch<QuizQuestion>(
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

      return apiFetch<StatutoryTrainingsResponse>(
        `/education/statutory?${params.toString()}`,
      );
    },
    enabled: !!siteId,
  });
}

export function useCreateStatutoryTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStatutoryTrainingInput) =>
      apiFetch<StatutoryTraining>("/education/statutory", {
        method: "POST",
        body: JSON.stringify(data),
      }),
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
      data: UpdateStatutoryTrainingInput;
    }) =>
      apiFetch<StatutoryTraining>(`/education/statutory/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
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

      return apiFetch<TbmRecordsResponse>(
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
    queryFn: () => apiFetch<TbmRecordDetail>(`/education/tbm/${id}`),
    enabled: !!siteId && !!id,
  });
}

export function useCreateTbmRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTbmRecordInput) =>
      apiFetch<TbmRecord>("/education/tbm", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tbm-records"] });
    },
  });
}
