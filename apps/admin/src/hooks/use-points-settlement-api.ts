"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "./use-api-base";

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
