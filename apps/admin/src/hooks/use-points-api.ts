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

export interface SettlementDispute {
  id: string;
  type: string;
  status: string;
  title: string;
  createdAt: string;
  userName: string | null;
}

export interface SettlementMonthHistory {
  month: string;
  totalAmount: number;
  entryCount: number;
  lastOccurredAt: string;
}

export interface SettlementStatus {
  month: string;
  snapshotTaken: boolean;
  finalized: boolean;
  disputeOpenCount: number;
  disputes: SettlementDispute[];
  history: SettlementMonthHistory[];
}

interface SettlementHistoryEntry {
  id: string;
  settleMonth?: string;
  amount: number;
  occurredAt?: string;
  createdAt: string;
}

export function useSettlementStatus(month: string) {
  const siteId = useAuthStore((s) => s.currentSiteId);

  return useQuery({
    queryKey: ["admin", "points", "settlement", "status", siteId, month],
    queryFn: async (): Promise<SettlementStatus> => {
      if (!siteId) {
        throw new Error("현장 정보가 없습니다");
      }

      const [historyRes, disputeRes] = await Promise.all([
        apiFetch<{ entries: SettlementHistoryEntry[] }>(
          `/points/history?siteId=${siteId}&limit=500&offset=0`,
        ),
        apiFetch<{ data: SettlementDispute[] }>(
          `/disputes/site/${siteId}?status=OPEN&limit=50&offset=0`,
        ),
      ]);

      const monthlyMap = new Map<string, SettlementMonthHistory>();
      for (const entry of historyRes.entries) {
        const key =
          entry.settleMonth ||
          new Date(entry.occurredAt || entry.createdAt)
            .toISOString()
            .slice(0, 7);
        const previous = monthlyMap.get(key);
        const lastOccurredAt = entry.occurredAt || entry.createdAt;

        if (!previous) {
          monthlyMap.set(key, {
            month: key,
            totalAmount: entry.amount,
            entryCount: 1,
            lastOccurredAt,
          });
          continue;
        }

        monthlyMap.set(key, {
          month: key,
          totalAmount: previous.totalAmount + entry.amount,
          entryCount: previous.entryCount + 1,
          lastOccurredAt:
            new Date(previous.lastOccurredAt) > new Date(lastOccurredAt)
              ? previous.lastOccurredAt
              : lastOccurredAt,
        });
      }

      const history = Array.from(monthlyMap.values()).sort((a, b) =>
        b.month.localeCompare(a.month),
      );
      const current = monthlyMap.get(month);

      return {
        month,
        snapshotTaken: !!current,
        finalized: false,
        disputeOpenCount: disputeRes.data.length,
        disputes: disputeRes.data,
        history,
      };
    },
    enabled: !!siteId,
  });
}

export function useCreateSettlementSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch("/admin/settlements/snapshot", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "points", "settlement"],
      });
    },
  });
}

export function useFinalizeSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch("/admin/settlements/finalize", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "points", "settlement"],
      });
    },
  });
}
