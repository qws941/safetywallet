import type { BadgeProps } from "@safetywallet/ui";

export function formatKstDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  } catch {
    return dateStr;
  }
}

export const ACTION_LABELS: Record<string, string> = {
  FAS_SYNC_COMPLETED: "동기화 완료",
  FAS_SYNC_FAILED: "동기화 실패",
  FAS_WORKERS_SYNCED: "수동 동기화",
};

export const ACTION_BADGES: Record<string, BadgeProps["variant"]> = {
  FAS_SYNC_COMPLETED: "default",
  FAS_SYNC_FAILED: "destructive",
  FAS_WORKERS_SYNCED: "secondary",
};
