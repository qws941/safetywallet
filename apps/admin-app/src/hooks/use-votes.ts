"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export interface VoteCandidate {
  id: string;
  month: string;
  source: "ADMIN" | "AUTO";
  createdAt: string;
  user: {
    id: string;
    name: string;
    nameMasked: string;
    companyName: string;
    tradeType: string;
  };
}

export function useVoteCandidates(month: string) {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "vote-candidates", siteId, month],
    queryFn: () =>
      apiFetch<{ candidates: VoteCandidate[] }>(
        `/admin/votes/candidates?siteId=${siteId}&month=${month}`,
      ).then((res) => res.candidates),
    enabled: !!siteId && !!month,
  });
}

export function useAddVoteCandidate() {
  const queryClient = useQueryClient();
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useMutation({
    mutationFn: ({ userId, month }: { userId: string; month: string }) =>
      apiFetch(`/admin/votes/candidates`, {
        method: "POST",
        body: JSON.stringify({ userId, siteId, month }),
      }),
    onSuccess: (_, { month }) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "vote-candidates", siteId, month],
      });
    },
  });
}

export function useDeleteVoteCandidate() {
  const queryClient = useQueryClient();
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiFetch(`/admin/votes/candidates/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "vote-candidates"],
      });
    },
  });
}
