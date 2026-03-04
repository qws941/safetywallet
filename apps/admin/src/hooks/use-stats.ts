"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

interface StatsData {
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

export function useStats() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () =>
      apiFetch<{ stats: StatsData }>("/admin/stats").then((res) => res.stats),
    enabled: hasHydrated && isAdmin,
  });
}
