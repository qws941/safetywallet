"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "./use-api-base";

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
