"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "./use-api-base";

interface PointsEntry {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  member: {
    user: {
      nameMasked: string;
    };
  };
}

export function usePointsLedger() {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "points", siteId],
    queryFn: () =>
      apiFetch<{
        entries: PointsEntry[];
        total: number;
        limit: number;
        offset: number;
      }>(`/points/history?siteId=${siteId}`).then((res) => res.entries),
    enabled: !!siteId,
  });
}

export function useAwardPoints() {
  const queryClient = useQueryClient();
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useMutation({
    mutationFn: ({
      memberId,
      amount,
      reason,
    }: {
      memberId: string;
      amount: number;
      reason: string;
    }) =>
      apiFetch(`/points/award`, {
        method: "POST",
        body: JSON.stringify({ siteId, memberId, amount, reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "points"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
    },
  });
}
