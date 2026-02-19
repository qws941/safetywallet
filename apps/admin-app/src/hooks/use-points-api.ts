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

export interface PointPolicy {
  id: string;
  siteId: string;
  reasonCode: string;
  name: string;
  description: string | null;
  defaultAmount: number;
  minAmount: number | null;
  maxAmount: number | null;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyBody {
  siteId: string;
  reasonCode: string;
  name: string;
  description?: string;
  defaultAmount: number;
  minAmount?: number;
  maxAmount?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
}

export interface UpdatePolicyBody {
  name?: string;
  description?: string;
  defaultAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  isActive?: boolean;
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

export function usePolicies(siteId?: string) {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const targetSiteId = siteId || currentSiteId;

  return useQuery({
    queryKey: ["admin", "policies", targetSiteId],
    queryFn: () =>
      apiFetch<{ policies: PointPolicy[] }>(
        `/policies/site/${targetSiteId}`,
      ).then((res) => res.policies),
    enabled: !!targetSiteId,
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();
  const currentSiteId = useAuthStore((s) => s.currentSiteId);

  return useMutation({
    mutationFn: (
      data: Omit<CreatePolicyBody, "siteId"> & { siteId?: string },
    ) => {
      const siteId = data.siteId || currentSiteId;
      if (!siteId) throw new Error("Site ID is required");

      return apiFetch<{ policy: PointPolicy }>("/policies", {
        method: "POST",
        body: JSON.stringify({ ...data, siteId }),
      });
    },
    onSuccess: (_, variables) => {
      const siteId = variables.siteId || currentSiteId;
      queryClient.invalidateQueries({
        queryKey: ["admin", "policies", siteId],
      });
    },
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  const currentSiteId = useAuthStore((s) => s.currentSiteId);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePolicyBody }) =>
      apiFetch<{ policy: PointPolicy }>(`/policies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "policy", data.policy.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "policies", data.policy.siteId],
      });
      if (currentSiteId) {
        queryClient.invalidateQueries({
          queryKey: ["admin", "policies", currentSiteId],
        });
      }
    },
  });
}

export function useDeletePolicy() {
  const queryClient = useQueryClient();
  const currentSiteId = useAuthStore((s) => s.currentSiteId);

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/policies/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      if (currentSiteId) {
        queryClient.invalidateQueries({
          queryKey: ["admin", "policies", currentSiteId],
        });
      }
    },
  });
}
