"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  toast,
} from "@safetywallet/ui";
import { RefreshCw } from "lucide-react";
import { useHyperdriveSync } from "@/hooks/use-fas-sync";

export function ManualSyncCard() {
  const hyperdriveSync = useHyperdriveSync();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          수동 동기화
        </CardTitle>
        <CardDescription>
          FAS Hyperdrive 데이터를 D1에 수동으로 동기화합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={hyperdriveSync.isPending}
          onClick={() =>
            hyperdriveSync.mutate(undefined, {
              onSuccess: (data) => {
                toast({
                  description: `Hyperdrive 동기화 완료: ${data.sync.created}건 생성, ${data.sync.updated}건 갱신, ${data.deactivated}건 비활성화`,
                });
              },
              onError: () => {
                toast({
                  variant: "destructive",
                  description: "Hyperdrive 동기화 실패",
                });
              },
            })
          }
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${hyperdriveSync.isPending ? "animate-spin" : ""}`}
          />
          {hyperdriveSync.isPending ? "동기화 중..." : "Hyperdrive 동기화"}
        </Button>
      </CardContent>
    </Card>
  );
}
