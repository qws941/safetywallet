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
import { RefreshCw, Link2 } from "lucide-react";
import { useAcetimeSync, useAcetimeCrossMatch } from "@/hooks/use-fas-sync";

export function ManualSyncCard() {
  const acetimeSync = useAcetimeSync();
  const crossMatch = useAcetimeCrossMatch();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          수동 동기화
        </CardTitle>
        <CardDescription>
          AceTime R2 데이터 동기화 및 FAS 크로스매칭을 수동으로 실행합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={acetimeSync.isPending}
          onClick={() =>
            acetimeSync.mutate(undefined, {
              onSuccess: (data) => {
                toast({
                  description: `AceTime 동기화 완료: ${data.sync.created}건 생성, ${data.sync.updated}건 갱신, FAS 매칭 ${data.fasCrossMatch.matched}건`,
                });
              },
              onError: () => {
                toast({
                  variant: "destructive",
                  description: "AceTime 동기화 실패",
                });
              },
            })
          }
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${acetimeSync.isPending ? "animate-spin" : ""}`}
          />
          {acetimeSync.isPending ? "동기화 중..." : "AceTime R2 동기화"}
        </Button>
        <Button
          variant="outline"
          disabled={crossMatch.isPending}
          onClick={() =>
            crossMatch.mutate(100, {
              onSuccess: (data) => {
                toast({
                  description: `FAS 크로스매칭 완료: ${data.results.matched}건 매칭${data.hasMore ? " (추가 데이터 있음)" : ""}`,
                });
              },
              onError: () => {
                toast({
                  variant: "destructive",
                  description: "FAS 크로스매칭 실패",
                });
              },
            })
          }
        >
          <Link2
            className={`h-4 w-4 mr-2 ${crossMatch.isPending ? "animate-spin" : ""}`}
          />
          {crossMatch.isPending ? "매칭 중..." : "FAS 크로스매칭"}
        </Button>
      </CardContent>
    </Card>
  );
}
