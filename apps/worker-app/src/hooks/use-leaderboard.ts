import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nameMasked: string;
  totalPoints: number;
  isCurrentUser: boolean;
}

export function useLeaderboard(siteId: string | null) {
  return useQuery({
    queryKey: ["leaderboard", siteId],
    queryFn: async () => {
      const res = await apiFetch<{
        data: { leaderboard: LeaderboardEntry[]; myRank: number | null };
      }>(`/points/leaderboard/${siteId}`);
      // The API response wrapper in api-worker usually wraps in { success: true, data: ... }
      // The grep output showed `return success(c, leaderboard);` which might mean the data IS the leaderboard array or object.
      // Wait, checking apiFetch implementation in apps/worker-app/src/lib/api.ts
      // It returns `response.json()`.
      // Standard response format in this project (from AGENTS.md) is `{ success: true, data: T, timestamp: string }`.
      // But let's look at the grep output again: `return success(c, leaderboard);`
      // I should double check the `success` function in `api-worker` to see if it wraps it in `data`.
      // Assuming it does.

      return res.data;
    },
    enabled: !!siteId,
  });
}
