"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";

export interface FasSyncUserStats {
  total: number;
  fasLinked: number;
  missingPhone: number;
  deleted: number;
}

export interface FasSyncErrorCounts {
  open: number;
  resolved: number;
  ignored: number;
}

export interface FasSyncLogEntry {
  id: string;
  action: string;
  reason: string | null;
  createdAt: string | null;
}

export interface FasSyncStatusResponse {
  fasStatus: string | null;
  lastFullSync: string | null;
  userStats: FasSyncUserStats;
  syncErrorCounts: FasSyncErrorCounts;
  recentSyncLogs: FasSyncLogEntry[];
}

export function useFasSyncStatus() {
  return useQuery({
    queryKey: ["admin", "fas-sync-status"],
    queryFn: async () => {
      try {
        return await apiFetch<FasSyncStatusResponse>(`/admin/fas/sync-status`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return apiFetch<FasSyncStatusResponse>(`/admin/sync-status`);
        }
        throw err;
      }
    },
    refetchInterval: 30_000,
  });
}

export interface HyperdriveSyncResponse {
  message: string;
  runId: string;
  source: string;
  batch: {
    offset: number;
    limit: number;
    fetched: number;
    total: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
  sync: {
    created: number;
    updated: number;
    skipped: number;
    errors: Array<{ emplCd: string; error: string }>;
  };
  deactivated: number;
}

export function useHyperdriveSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<HyperdriveSyncResponse>("/admin/fas/sync-hyperdrive", {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "fas-sync-status"] });
    },
  });
}

export interface FasSearchResult {
  emplCd: string;
  name: string;
  partCd: string;
  companyName: string;
  phone: string;
  socialNo: string;
  gojoCd: string;
  jijoCd: string;
  careCd: string;
  roleCd: string;
  stateFlag: string;
  entrDay: string;
  retrDay: string;
  rfid: string;
  violCnt: number;
  updatedAt: string;
  isActive: boolean;
}

export interface FasSearchResponse {
  query: { name?: string; phone?: string };
  count: number;
  results: FasSearchResult[];
}

export function useSearchFasMariadb(params: { name?: string; phone?: string }) {
  const searchParams = new URLSearchParams();
  if (params.name) searchParams.set("name", params.name);
  if (params.phone) searchParams.set("phone", params.phone);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ["admin", "fas-search", params.name, params.phone],
    queryFn: () =>
      apiFetch<FasSearchResponse>(`/admin/fas/search-mariadb?${qs}`),
    enabled: !!(params.name || params.phone),
  });
}

export function useRealtimeAttendanceView(params: {
  accsDay: string;
  siteCd?: string;
}) {
  const trimmedSiteCd = params.siteCd?.trim() || "";
  const searchParams = new URLSearchParams();
  searchParams.set("date", params.accsDay);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: [
      "admin",
      "fas-realtime-attendance",
      params.accsDay,
      trimmedSiteCd || "all",
    ],
    queryFn: () => apiFetch(`/attendance/realtime?${qs}`),
    enabled: /^\d{8}$/.test(params.accsDay),
    refetchInterval: 15_000,
  });
}
