"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button } from "@safetywallet/ui";
import { useTranslation } from "@/hooks/use-translation";
import { flushOfflineQueue, getOfflineQueueLength } from "@/lib/api";

export function OfflineQueueIndicator() {
  const t = useTranslation();
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
        <span className="font-medium">
          {t("components.offlineQueue.pending")}
        </span>
        <Badge variant="secondary">
          {pendingCount}
          {t("components.offlineQueue.countUnit")}
        </Badge>
      </div>
      <div className="mt-2">
        <Button
          size="sm"
          className="w-full"
          disabled={!isOnline || isSyncing}
          onClick={handleSyncNow}
        >
          {isSyncing
            ? t("components.offlineQueue.syncing")
            : isOnline
              ? t("components.offlineQueue.syncNow")
              : t("components.offlineQueue.offline")}
        </Button>
      </div>
    </div>
  );
}
