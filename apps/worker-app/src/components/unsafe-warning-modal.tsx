"use client";

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

interface UnsafeWarningModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UnsafeWarningModal({
  open,
  onConfirm,
  onCancel,
}: UnsafeWarningModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ 불안전행동 제보 안내</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              불안전행동 제보는 <strong>개인 처벌이 아닌 개선 목적</strong>으로
              활용됩니다.
            </p>
            <p>
              제보 시 <strong>얼굴이나 개인정보가 노출되지 않도록</strong>{" "}
              주의해 주세요.
            </p>
            <p className="text-sm text-muted-foreground">
              이 제보는 관리자만 확인할 수 있습니다.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            확인하고 제출
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
