"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./use-api-base";

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  performer: {
    id: string;
    name: string;
  } | null;
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ["admin", "audit"],
    queryFn: async () => {
      const res = await apiFetch<{ logs: AuditLog[] }>(
        "/admin/audit-logs?limit=100",
      );
      return res.logs;
    },
  });
}
