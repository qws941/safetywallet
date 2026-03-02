"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "./use-api-base";

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
