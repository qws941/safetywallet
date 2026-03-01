"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  apiFetch,
  type ApiResponse,
  type UserProfileDto,
  type PointsHistoryItemDto,
  type AnnouncementDto,
} from "./use-api-base";

interface SystemNotice {
  type: "fas_down" | "maintenance" | "info";
  message: string;
  severity: "warning" | "critical" | "info";
}

interface SystemStatusResponse {
  success: boolean;
  data: { notices: SystemNotice[]; hasIssues: boolean };
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ["system-status"],
    queryFn: () =>
      apiFetch<SystemStatusResponse>("/system/status", { skipAuth: true }),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

export function useSiteInfo(siteId: string | null) {
  return useQuery({
    queryKey: ["site", siteId],
    queryFn: () =>
      apiFetch<
        ApiResponse<{
          site: {
            id: string;
            name: string;
            address: string | null;
            memberCount: number;
          };
        }>
      >(`/sites/${siteId}`),
    enabled: !!siteId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => apiFetch<ApiResponse<{ user: UserProfileDto }>>("/users/me"),
  });
}

export function usePoints(siteId: string) {
  return useQuery({
    queryKey: ["points", siteId],
    queryFn: () =>
      apiFetch<
        ApiResponse<{ balance: number; history: PointsHistoryItemDto[] }>
      >(`/points?siteId=${siteId}`),
    enabled: !!siteId,
  });
}

export function useAnnouncements(siteId: string) {
  return useQuery({
    queryKey: ["announcements", siteId],
    queryFn: () =>
      apiFetch<ApiResponse<{ data: AnnouncementDto[] }>>(
        `/announcements?siteId=${siteId}`,
      ).then((r) => r.data),
    enabled: !!siteId,
  });
}

export function useLeaveSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ siteId, reason }: { siteId: string; reason?: string }) =>
      apiFetch<ApiResponse<{ message: string }>>(`/sites/${siteId}/leave`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
