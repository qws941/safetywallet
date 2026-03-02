"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "./use-api-base";

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
