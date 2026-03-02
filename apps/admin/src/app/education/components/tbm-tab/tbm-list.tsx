"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  useToast,
} from "@safetywallet/ui";
import { useTbmRecord, useDeleteTbmRecord } from "@/hooks/use-api";
import { getErrorMessage } from "../../education-helpers";
import type { TbmRecordItem, TbmDetail } from "../education-types";

interface Props {
  tbmRecords: TbmRecordItem[];
  isLoading: boolean;
  onEditTbm: (item: TbmRecordItem) => void;
  onDeleteTbm: (tbmId: string) => Promise<void>;
  deleteMutation: {
    isPending: boolean;
  };
}

export function TbmList({
  tbmRecords,
  isLoading,
  onEditTbm,
  onDeleteTbm,
  deleteMutation,
}: Props) {
  const { toast } = useToast();
  const [expandedTbmId, setExpandedTbmId] = useState<string | null>(null);
  const [deleteTbmId, setDeleteTbmId] = useState<string | null>(null);

  const { data: tbmDetail } = useTbmRecord(expandedTbmId || "");
  const typedTbmDetail: TbmDetail | undefined = tbmDetail;

  const handleDeleteTbm = async () => {
    if (!deleteTbmId) return;
    try {
      await onDeleteTbm(deleteTbmId);
      toast({ description: "TBM 기록이 삭제되었습니다." });
      if (expandedTbmId === deleteTbmId) {
        setExpandedTbmId(null);
      }
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
    setDeleteTbmId(null);
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">로딩 중...</p>;
  }

  if (tbmRecords.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">등록된 TBM이 없습니다.</p>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>TBM 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-2">일자</th>
                    <th className="px-2 py-2">주제</th>
                    <th className="px-2 py-2">인솔자</th>
                    <th className="px-2 py-2">참석자수</th>
                    <th className="px-2 py-2">날씨</th>
                    <th className="px-2 py-2">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {tbmRecords.map((item) => {
                    const isExpanded = expandedTbmId === item.tbm.id;
                    return (
                      <tr key={item.tbm.id} className="border-b">
                        <td className="px-2 py-2">{item.tbm.date}</td>
                        <td className="px-2 py-2 font-medium">
                          {item.tbm.topic}
                        </td>
                        <td className="px-2 py-2">{item.leaderName || "-"}</td>
                        <td className="px-2 py-2">-</td>
                        <td className="px-2 py-2">
                          {item.tbm.weatherCondition || "-"}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setExpandedTbmId(
                                  isExpanded ? null : item.tbm.id,
                                )
                              }
                            >
                              {isExpanded ? "접기" : "참석자 보기"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onEditTbm(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTbmId(item.tbm.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {expandedTbmId && typedTbmDetail && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">
                    참석자 목록 ({typedTbmDetail.attendeeCount}명)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {typedTbmDetail.attendees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      참석자가 없습니다.
                    </p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {typedTbmDetail.attendees.map((attendee) => (
                        <li
                          key={attendee.attendee.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2"
                        >
                          <span>{attendee.userName || "이름 없음"}</span>
                          <span className="text-muted-foreground">
                            {new Date(
                              attendee.attendee.attendedAt,
                            ).toLocaleString("ko-KR")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteTbmId}
        onOpenChange={(open) => !open && setDeleteTbmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>TBM 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              TBM 기록을 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTbm}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
