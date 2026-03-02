"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
  Input,
  Button,
  useToast,
} from "@safetywallet/ui";
import {
  useCreateTbmRecord,
  useUpdateTbmRecord,
  useDeleteTbmRecord,
  useTbmRecord,
  useTbmRecords,
  type CreateTbmRecordInput,
} from "@/hooks/use-api";
import { useAuthStore } from "@/stores/auth";
import { getErrorMessage } from "../education-helpers";
import type { TbmDetail, TbmFormState, TbmRecordItem } from "./education-types";

const INITIAL_FORM: TbmFormState = {
  date: "",
  topic: "",
  content: "",
  weatherCondition: "",
  specialNotes: "",
};

export function TbmTab() {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const { toast } = useToast();

  const [tbmForm, setTbmForm] = useState<TbmFormState>(INITIAL_FORM);
  const [expandedTbmId, setExpandedTbmId] = useState<string | null>(null);
  const [editingTbmId, setEditingTbmId] = useState<string | null>(null);
  const [deleteTbmId, setDeleteTbmId] = useState<string | null>(null);

  const { data: tbmData, isLoading } = useTbmRecords();
  const { data: tbmDetail } = useTbmRecord(expandedTbmId || "");
  const createMutation = useCreateTbmRecord();
  const updateMutation = useUpdateTbmRecord();
  const deleteMutation = useDeleteTbmRecord();

  const tbmRecords: TbmRecordItem[] = tbmData?.records ?? [];
  const typedTbmDetail: TbmDetail | undefined = tbmDetail;

  const onEditTbm = (item: TbmRecordItem) => {
    setEditingTbmId(item.tbm.id);
    setTbmForm({
      date: item.tbm.date,
      topic: item.tbm.topic,
      content: "",
      weatherCondition: item.tbm.weatherCondition || "",
      specialNotes: "",
    });
  };

  const onCreateTbm = async () => {
    if (!currentSiteId || !tbmForm.date || !tbmForm.topic) return;

    const payload: CreateTbmRecordInput = {
      siteId: currentSiteId,
      date: tbmForm.date,
      topic: tbmForm.topic,
      content: tbmForm.content || undefined,
      weatherCondition: tbmForm.weatherCondition || undefined,
      specialNotes: tbmForm.specialNotes || undefined,
    };

    try {
      if (editingTbmId) {
        await updateMutation.mutateAsync({
          id: editingTbmId,
          data: {
            date: payload.date,
            topic: payload.topic,
            content: payload.content,
            weatherCondition: payload.weatherCondition,
            specialNotes: payload.specialNotes,
          },
        });
        toast({ description: "TBM 기록이 수정되었습니다." });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ description: "TBM 기록이 등록되었습니다." });
      }
      setEditingTbmId(null);
      setTbmForm(INITIAL_FORM);
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
  };

  const onDeleteTbm = async () => {
    if (!deleteTbmId) return;
    try {
      await deleteMutation.mutateAsync(deleteTbmId);
      toast({ description: "TBM 기록이 삭제되었습니다." });
      if (expandedTbmId === deleteTbmId) {
        setExpandedTbmId(null);
      }
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
    setDeleteTbmId(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{editingTbmId ? "TBM 기록 수정" : "TBM 등록"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              type="date"
              value={tbmForm.date}
              onChange={(e) =>
                setTbmForm((prev) => ({ ...prev, date: e.target.value }))
              }
            />
            <Input
              placeholder="주제"
              value={tbmForm.topic}
              onChange={(e) =>
                setTbmForm((prev) => ({ ...prev, topic: e.target.value }))
              }
            />
          </div>
          <textarea
            className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="내용"
            value={tbmForm.content}
            onChange={(e) =>
              setTbmForm((prev) => ({ ...prev, content: e.target.value }))
            }
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="날씨"
              value={tbmForm.weatherCondition}
              onChange={(e) =>
                setTbmForm((prev) => ({
                  ...prev,
                  weatherCondition: e.target.value,
                }))
              }
            />
            <Input
              placeholder="특이사항"
              value={tbmForm.specialNotes}
              onChange={(e) =>
                setTbmForm((prev) => ({
                  ...prev,
                  specialNotes: e.target.value,
                }))
              }
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={onCreateTbm}
              disabled={
                !currentSiteId ||
                !tbmForm.date ||
                !tbmForm.topic ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              {editingTbmId ? "TBM 수정" : "TBM 등록"}
            </Button>
            {editingTbmId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingTbmId(null);
                  setTbmForm(INITIAL_FORM);
                }}
              >
                취소
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>TBM 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          ) : tbmRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              등록된 TBM이 없습니다.
            </p>
          ) : (
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
                          <td className="px-2 py-2">
                            {item.leaderName || "-"}
                          </td>
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
          )}
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
            <AlertDialogAction onClick={onDeleteTbm}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
