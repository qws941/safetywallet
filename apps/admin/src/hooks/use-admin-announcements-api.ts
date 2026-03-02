"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "./use-api-base";

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  scheduledAt: string | null;
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED";
  createdAt: string;
}

export function useAdminAnnouncements() {
  const siteId = useAuthStore((s) => s.currentSiteId);
  const params = siteId ? `?siteId=${siteId}` : "";

  return useQuery({
    queryKey: ["admin", "announcements", siteId],
    queryFn: async () => {
      const res = await apiFetch<{ data: Announcement[]; pagination: unknown }>(
        `/announcements${params}`,
      );
      return res.data;
    },
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useMutation({
    mutationFn: ({
      title,
      content,
      isPinned,
      scheduledAt,
    }: {
      title: string;
      content: string;
      isPinned?: boolean;
      scheduledAt?: string | null;
    }) =>
      apiFetch(`/announcements`, {
        method: "POST",
        body: JSON.stringify({ siteId, title, content, isPinned, scheduledAt }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      title,
      content,
      isPinned,
      scheduledAt,
    }: {
      id: string;
      title: string;
      content: string;
      isPinned?: boolean;
      scheduledAt?: string | null;
    }) =>
      apiFetch(`/announcements/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, content, isPinned, scheduledAt }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/announcements/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
  });
}
