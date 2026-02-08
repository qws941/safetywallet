"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { VoteCandidate, VoteResult } from "@/types/vote";

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

  return useMutation({
    mutationFn: (id: string) =>
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

export function useVoteResults(month: string) {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "vote-results", siteId, month],
    queryFn: () =>
      apiFetch<{ results: VoteResult[] }>(
        `/admin/votes/results?siteId=${siteId}&month=${month}`,
      ).then((res) => res.results),
    enabled: !!siteId && !!month,
  });
}
