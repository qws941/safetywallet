"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "./use-api-base";

export interface SiteMembership {
  id: string;
  siteId: string;
  siteName: string;
  status: string;
  role: string;
  joinedAt: string;
}

export function useMySites() {
  const userRole = useAuthStore((s) => s.user?.role);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  return useQuery({
    queryKey: ["admin", "my-sites", userRole],
    queryFn: async () => {
      const res = await apiFetch<{
        memberships: Array<{
          id: string;
          role: string;
          status: string;
          joinedAt: string;
          site: { id: string; name: string; active: boolean };
        }>;
      }>("/users/me/memberships");
      const memberships = res.memberships.map((m) => ({
        id: m.id,
        siteId: m.site.id,
        siteName: m.site.name,
        status: m.status,
        role: m.role,
        joinedAt: m.joinedAt,
      }));

      if (memberships.length > 0) {
        return memberships;
      }

      if (userRole === "SUPER_ADMIN") {
        const sitesRes = await apiFetch<{
          data: Array<{ id: string; name: string }>;
        }>("/sites");
        return sitesRes.data.map((site) => ({
          id: `super-admin-${site.id}`,
          siteId: site.id,
          siteName: site.name,
          status: "ACTIVE",
          role: "SUPER_ADMIN",
          joinedAt: new Date(0).toISOString(),
        }));
      }

      return memberships;
    },
    enabled: hasHydrated && isAdmin,
  });
}
