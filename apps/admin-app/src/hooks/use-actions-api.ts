"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "./use-api-base";

interface ActionItem {
  id: string;
  postId: string;
  description: string;
  status: string;
  assignee?: {
    nameMasked: string;
  };
  dueDate?: string;
  createdAt: string;
}

export function useCreateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      assigneeId,
      dueDate,
      description,
      priority,
    }: {
      postId: string;
      assigneeId: string;
      dueDate: string;
      description?: string;
      priority?: string;
    }) =>
      apiFetch(`/actions`, {
        method: "POST",
        body: JSON.stringify({
          postId,
          assigneeType: "USER",
          assigneeId,
          dueDate,
          description,
          priority,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "post"] });
    },
  });
}

export function useActionItems() {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "actions", siteId],
    queryFn: () => apiFetch<ActionItem[]>(`/actions?siteId=${siteId}`),
    enabled: !!siteId,
  });
}

export function useUpdateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/actions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "actions"] });
    },
  });
}
