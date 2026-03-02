"use client";

import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@safetywallet/ui";
import type { TrainingItem } from "../education-types";
import {
  getTrainingStatusLabel,
  getTrainingTypeLabel,
} from "../../education-helpers";

interface TrainingListProps {
  isLoading: boolean;
  trainings: TrainingItem[];
  deleteMutation: { isPending: boolean };
  onEditTraining: (item: TrainingItem) => void;
  onDeleteTraining: (id: string) => void;
  deleteTrainingId: string | null;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

export function TrainingList({
  isLoading,
  trainings,
  deleteMutation,
  onEditTraining,
  onDeleteTraining,
  deleteTrainingId,
  onDeleteConfirm,
  onDeleteCancel,
}: TrainingListProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>법정교육 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          ) : trainings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              등록된 법정교육이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-2">교육명</th>
                    <th className="px-2 py-2">교육유형</th>
                    <th className="px-2 py-2">대상자</th>
                    <th className="px-2 py-2">교육일</th>
                    <th className="px-2 py-2">상태</th>
                    <th className="px-2 py-2">유효기간</th>
                    <th className="px-2 py-2">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {trainings.map((item) => (
                    <tr key={item.training.id} className="border-b">
                      <td className="px-2 py-2 font-medium">
                        {item.training.trainingName}
                      </td>
                      <td className="px-2 py-2">
                        <Badge variant="outline">
                          {getTrainingTypeLabel(item.training.trainingType)}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">{item.userName || "-"}</td>
                      <td className="px-2 py-2">
                        {item.training.trainingDate}
                      </td>
                      <td className="px-2 py-2">
                        <Badge variant="secondary">
                          {getTrainingStatusLabel(
                            item.training.status ?? "SCHEDULED",
                          )}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">
                        {item.training.expirationDate || "-"}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onEditTraining(item)}
                          >
                            수정
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => onDeleteTraining(item.training.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteTrainingId}
        onOpenChange={(open) => !open && onDeleteCancel()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>법정교육 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              법정교육 기록을 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteConfirm}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
