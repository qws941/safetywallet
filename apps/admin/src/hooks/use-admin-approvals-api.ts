"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "./use-api-base";

export interface ManualApproval {
  id: string;
  userId: string;
  siteId: string;
  approvedById?: string;
  reason: string;
  validDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  approvedAt?: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    companyName: string | null;
    tradeType: string | null;
  };
  approvedBy?: {
    id: string;
    name: string | null;
  };
}

export function useManualApprovals(
  siteId?: string,
  date?: string,
  status?: string,
) {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const targetSiteId = siteId || currentSiteId;

  const params = new URLSearchParams();
  if (targetSiteId) params.set("siteId", targetSiteId);
  if (date) params.set("date", date);
  if (status) params.set("status", status);

  return useQuery({
    queryKey: ["admin", "manual-approvals", targetSiteId, date, status],
    queryFn: async () => {
      const res = await apiFetch<{
        data: ManualApproval[];
        pagination: unknown;
      }>(`/approvals?${params.toString()}`);
      return res.data;
    },
    enabled: !!targetSiteId,
  });
}

export function useApproveManualRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/approvals/${id}/approve`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "manual-approvals"],
      });
    },
  });
}

export function useRejectManualRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch(`/approvals/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "manual-approvals"],
      });
    },
  });
}

export function useCreateManualApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      userId: string;
      siteId: string;
      reason: string;
      validDate: string;
    }) =>
      apiFetch("/admin/manual-approval", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "manual-approvals", variables.siteId],
      });
    },
  });
}
