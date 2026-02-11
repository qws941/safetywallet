"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "./use-api-base";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AttendanceLogsParams {
  date?: string;
  result?: "SUCCESS" | "FAIL";
  page?: number;
  limit?: number;
}

export interface AttendanceLogItem {
  id: string;
  siteId: string;
  userId: string | null;
  externalWorkerId: string | null;
  checkinAt: string;
  result: "SUCCESS" | "FAIL";
  source: "FAS" | "MANUAL";
  createdAt: string;
  userName: string | null;
}

export interface AttendanceLogsResponse {
  logs: AttendanceLogItem[];
  pagination: PaginationMeta;
}

export interface UnmatchedWorkersParams {
  date?: string;
  page?: number;
  limit?: number;
}

export interface UnmatchedWorkerItem {
  id: string;
  externalWorkerId: string | null;
  siteId: string;
  siteName: string | null;
  checkinAt: string;
  source: "FAS" | "MANUAL";
  createdAt: string;
}

export interface UnmatchedWorkersResponse {
  records: UnmatchedWorkerItem[];
  pagination: PaginationMeta;
}

export function useAttendanceLogs(
  siteId?: string,
  params?: AttendanceLogsParams,
) {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const targetSiteId = siteId || currentSiteId;

  return useQuery({
    queryKey: ["admin", "attendance-logs", targetSiteId, params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (targetSiteId) query.set("siteId", targetSiteId);
      if (params?.date) query.set("date", params.date);
      if (params?.result) query.set("result", params.result);
      if (params?.page !== undefined) query.set("page", String(params.page));
      if (params?.limit !== undefined) {
        query.set("limit", String(params.limit));
      }

      const response = await apiFetch<
        AttendanceLogsResponse | { data: AttendanceLogsResponse }
      >(`/admin/attendance-logs?${query.toString()}`);

      return "data" in response ? response.data : response;
    },
    enabled: !!targetSiteId,
  });
}

export function useUnmatchedWorkers(
  siteId?: string,
  params?: UnmatchedWorkersParams,
) {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const targetSiteId = siteId || currentSiteId;

  return useQuery({
    queryKey: ["admin", "attendance-unmatched", targetSiteId, params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (targetSiteId) query.set("siteId", targetSiteId);
      if (params?.date) query.set("date", params.date);
      if (params?.page !== undefined) query.set("page", String(params.page));
      if (params?.limit !== undefined) {
        query.set("limit", String(params.limit));
      }

      const response = await apiFetch<
        UnmatchedWorkersResponse | { data: UnmatchedWorkersResponse }
      >(`/admin/attendance/unmatched?${query.toString()}`);

      return "data" in response ? response.data : response;
    },
    enabled: !!targetSiteId,
  });
}
