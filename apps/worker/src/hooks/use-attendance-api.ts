"use client";

import { useQuery, apiFetch, type ApiResponse } from "./use-api-base";

interface AttendanceStatus {
  attended: boolean;
  checkinAt: string | null;
}

export function useAttendanceToday(siteId: string | null) {
  return useQuery<AttendanceStatus>({
    queryKey: ["attendance", "today", siteId],
    queryFn: async () => {
      const res = await apiFetch<
        ApiResponse<{
          hasAttendance: boolean;
          records: Array<{ checkinAt: string | null }>;
        }>
      >(`/attendance/today?siteId=${siteId}`);
      const raw = res.data;
      return {
        attended: raw.hasAttendance,
        checkinAt: raw.records?.[0]?.checkinAt ?? null,
      };
    },
    enabled: !!siteId,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
}
