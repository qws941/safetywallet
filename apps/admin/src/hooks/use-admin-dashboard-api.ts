"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./use-api-base";
import { useAuthStore } from "@/stores/auth";

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
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const res = await apiFetch<{ stats: DashboardStats }>("/admin/stats");
      return res.stats;
    },
    enabled: hasHydrated && isAdmin,
    refetchInterval: 30_000,
  });
}
