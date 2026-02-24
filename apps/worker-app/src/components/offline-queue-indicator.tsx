"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button } from "@safetywallet/ui";
import { flushOfflineQueue, getOfflineQueueLength } from "@/lib/api";

export function OfflineQueueIndicator() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshState = useCallback(() => {
    if (typeof window === "undefined") return;
    setPendingCount(getOfflineQueueLength());
    setIsOnline(navigator.onLine);
  }, []);

  useEffect(() => {
    refreshState();

    const interval = window.setInterval(refreshState, 2000);
    const handleOnlineChange = () => refreshState();
    const handleStorage = () => refreshState();

    window.addEventListener("online", handleOnlineChange);
    window.addEventListener("offline", handleOnlineChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", handleOnlineChange);
      window.removeEventListener("offline", handleOnlineChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshState]);

  const handleSyncNow = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await flushOfflineQueue();
      refreshState();
    } finally {
      setIsSyncing(false);
    }
  };

  if (pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">오프라인 대기</span>
        <Badge variant="secondary">{pendingCount}건</Badge>
      </div>
      <div className="mt-2">
        <Button
          size="sm"
          className="w-full"
          disabled={!isOnline || isSyncing}
          onClick={handleSyncNow}
        >
          {isSyncing ? "동기화 중..." : isOnline ? "지금 동기화" : "오프라인"}
        </Button>
      </div>
    </div>
  );
}
