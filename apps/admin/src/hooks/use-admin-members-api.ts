"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "./use-api-base";

export interface Member {
  id: string;
  user: {
    id: string;
    name: string;
  };
  status: string;
  role: string;
  joinedAt: string;
}

export function useMembers(siteId?: string) {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const targetSiteId = siteId || currentSiteId;

  return useQuery({
    queryKey: ["admin", "members", targetSiteId],
    queryFn: async () => {
      const res = await apiFetch<{ data: Member[]; pagination: unknown }>(
        `/sites/${targetSiteId}/members`,
      );
      return res.data;
    },
    enabled: !!targetSiteId,
  });
}

export function useMember(memberId: string) {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "member", siteId, memberId],
    queryFn: async () => {
      const res = await apiFetch<{ member: Member }>(
        `/sites/${siteId}/members/${memberId}`,
      );
      return res.member;
    },
    enabled: !!siteId && !!memberId,
  });
}

export function useSetMemberActiveStatus() {
  return useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      apiFetch(`/admin/users/${userId}/${active ? "unlock" : "lock"}`, {
        method: "POST",
      }),
    onSuccess: () => {
      // Invalidation handled by caller or context
    },
  });
}
