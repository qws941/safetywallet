"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./use-api-base";

interface DashboardStats {
  totalUsers: number;
  totalSites: number;
  totalPosts: number;
  activeUsersToday: number;
  pendingCount: number;
  urgentCount: number;
  avgProcessingHours: number;
  categoryDistribution: Record<string, number>;
  todayPostsCount: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const res = await apiFetch<{ stats: DashboardStats }>("/admin/stats");
      return res.stats;
    },
    refetchInterval: 30_000,
  });
}
