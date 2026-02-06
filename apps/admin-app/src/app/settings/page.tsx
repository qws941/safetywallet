"use client";

import { useEffect, useState } from "react";
import { Copy, RefreshCw, Save, Loader2 } from "lucide-react";
import { Button, Card, Input } from "@safetywallet/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@safetywallet/ui";
import { useAuthStore } from "@/stores/auth";
import { useSite, useUpdateSite, useReissueJoinCode } from "@/hooks/use-api";

export default function SettingsPage() {
  const siteId = useAuthStore((s) => s.currentSiteId);
  const { data: site, isLoading, error } = useSite(siteId || undefined);
  const updateSite = useUpdateSite();
  const reissueJoinCode = useReissueJoinCode();

  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isReissueDialogOpen, setIsReissueDialogOpen] = useState(false);

  useEffect(() => {
    if (site) {
      setName(site.name);
      setActive(site.active);
      setIsDirty(false);
    }
  }, [site]);

  const handleSave = async () => {
    if (!siteId) return;
    try {
      await updateSite.mutateAsync({
        siteId,
        data: { name, active },
      });
      setIsDirty(false);
    } catch {}
  };

  const handleCopyCode = async () => {
    if (!site?.joinCode) return;
    await navigator.clipboard.writeText(site.joinCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleRegenerateCode = async () => {
    if (!siteId) return;
    try {
      await reissueJoinCode.mutateAsync(siteId);
      setIsReissueDialogOpen(false);
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        현장 정보를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">설정</h1>
        <Button
          onClick={handleSave}
          disabled={!isDirty || updateSite.isPending}
        >
          {updateSite.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          저장
        </Button>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">현장 정보</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">현장 이름</label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setIsDirty(true);
              }}
              placeholder="현장 이름을 입력하세요"
              className="max-w-md"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={active}
              onChange={(e) => {
                setActive(e.target.checked);
                setIsDirty(true);
              }}
              className="h-5 w-5"
            />
            <label htmlFor="active" className="text-sm">
              <span className="font-medium">현장 활성화</span>
              <p className="text-muted-foreground">
                비활성화 시 새 멤버 가입이 불가합니다.
              </p>
            </label>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">현장 참여 코드</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          근로자들이 앱에서 이 코드를 입력하면 현장에 참여할 수 있습니다.
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={site.joinCode}
            readOnly
            className="max-w-xs font-mono text-lg"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopyCode}
            title="코드 복사"
          >
            {copySuccess ? (
              <span className="text-xs">복사됨</span>
            ) : (
              <Copy size={16} />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsReissueDialogOpen(true)}
            disabled={reissueJoinCode.isPending}
            title="코드 재발급"
          >
            {reissueJoinCode.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
          </Button>
        </div>
        {reissueJoinCode.isError && (
          <p className="mt-2 text-sm text-red-600">
            코드 재발급에 실패했습니다.
          </p>
        )}
      </Card>

      {updateSite.isSuccess && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          설정이 저장되었습니다.
        </div>
      )}

      {updateSite.isError && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          설정 저장에 실패했습니다.
        </div>
      )}

      <AlertDialog
        open={isReissueDialogOpen}
        onOpenChange={setIsReissueDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>참여 코드 재발급</AlertDialogTitle>
            <AlertDialogDescription>
              참여 코드를 재발급하시겠습니까? 기존 코드는 무효화되어 더 이상
              사용할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegenerateCode}
              disabled={reissueJoinCode.isPending}
            >
              {reissueJoinCode.isPending ? "재발급 중..." : "재발급"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
