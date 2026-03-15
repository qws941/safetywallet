"use client";

import { useState } from "react";
import { Bot, FileText, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  useToast,
} from "@safetywallet/ui";
import { useTbmRecord } from "@/hooks/use-api";
import { DataTable, type Column } from "@/components/data-table";
import { getErrorMessage, formatUnixDate } from "../../education-helpers";
import type { TbmRecordItem, TbmDetail } from "../education-types";
import { TbmAiAnalysis } from "./tbm-ai-analysis";
import { TbmMeetingMinutes } from "./tbm-meeting-minutes";

const TBM_TOPIC_CATEGORY_LABELS: Record<string, string> = {
  FALL_PREVENTION: "추락방지",
  SCAFFOLD_SAFETY: "비계안전",
  EXCAVATION: "굴착작업",
  CRANE_OPERATION: "크레인",
  ELECTRICAL: "전기작업",
  FIRE_PREVENTION: "화재예방",
  PPE: "보호구",
  CHEMICAL_HANDLING: "화학물질",
  CONFINED_SPACE: "밀폐공간",
  TRAFFIC: "교통안전",
  WEATHER: "기상관련",
  GENERAL: "일반",
};

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
  const [aiTbmId, setAiTbmId] = useState<string | null>(null);
  const [minutesTbmId, setMinutesTbmId] = useState<string | null>(null);

  const aiTbm = aiTbmId ? tbmRecords.find((r) => r.tbm.id === aiTbmId) : null;
  const minutesTbm = minutesTbmId
    ? tbmRecords.find((r) => r.tbm.id === minutesTbmId)
    : null;

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

  const columns: Column<TbmRecordItem>[] = [
    {
      key: "tbm.date",
      header: "일자",
      sortable: true,
      render: (item) => <span>{formatUnixDate(item.tbm.date)}</span>,
    },
    {
      key: "tbm.topic",
      header: "주제",
      sortable: true,
      render: (item) => (
        <span className="font-medium break-words">{item.tbm.topic}</span>
      ),
    },
    {
      key: "tbm.topicCategory",
      header: "분류",
      sortable: true,
      render: (item) => (
        <span>
          {TBM_TOPIC_CATEGORY_LABELS[item.tbm.topicCategory as string] ||
            item.tbm.topicCategory ||
            "-"}
        </span>
      ),
    },
    {
      key: "leaderName",
      header: "인솔자",
      sortable: true,
      render: (item) => <span>{item.leaderName || "-"}</span>,
    },
    {
      key: "_attendeeCount",
      header: "참석자수",
      render: (item) => {
        const count = item.attendeeCount ?? 0;
        return count > 0 ? (
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedTbmId(item.tbm.id);
            }}
          >
            {count}명
          </button>
        ) : (
          <span className="text-muted-foreground">0명</span>
        );
      },
    },
    {
      key: "tbm.weatherCondition",
      header: "날씨",
      render: (item) => <span>{item.tbm.weatherCondition || "-"}</span>,
    },
    {
      key: "_ai",
      header: "AI 분석",
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            setAiTbmId(item.tbm.id);
          }}
        >
          <Bot className="h-3.5 w-3.5" />
          AI 분석
        </Button>
      ),
    },
    {
      key: "_minutes",
      header: "회의록",
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            setMinutesTbmId(item.tbm.id);
          }}
        >
          <FileText className="h-3.5 w-3.5" />
          회의록
        </Button>
      ),
    },
    {
      key: "_actions",
      header: "상세",
      render: (item) => {
        const isExpanded = expandedTbmId === item.tbm.id;
        return (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedTbmId(isExpanded ? null : item.tbm.id);
              }}
            >
              {isExpanded ? "접기" : "참석자 보기"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEditTbm(item);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTbmId(item.tbm.id);
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">로딩 중...</p>;
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={tbmRecords}
        searchable
        searchPlaceholder="TBM 검색..."
        emptyMessage="등록된 TBM이 없습니다."
      />

      <Dialog
        open={!!expandedTbmId}
        onOpenChange={(open) => !open && setExpandedTbmId(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              참석자 목록 ({typedTbmDetail?.attendeeCount ?? 0}명)
            </DialogTitle>
            <DialogDescription>TBM 참석자 상세 정보</DialogDescription>
          </DialogHeader>
          {!typedTbmDetail ? (
            <p className="text-sm text-muted-foreground py-4">로딩 중...</p>
          ) : typedTbmDetail.attendees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
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
                    {new Date(attendee.attendee.attendedAt).toLocaleString(
                      "ko-KR",
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!aiTbm} onOpenChange={(open) => !open && setAiTbmId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{aiTbm?.tbm.topic} - AI 분석</DialogTitle>
            <DialogDescription>
              AI가 TBM 회의 내용을 분석한 결과입니다.
            </DialogDescription>
          </DialogHeader>
          {aiTbm && <TbmAiAnalysis tbmId={aiTbm.tbm.id} />}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!minutesTbmId}
        onOpenChange={(open) => !open && setMinutesTbmId(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{minutesTbm?.tbm.topic} - 회의록</DialogTitle>
            <DialogDescription>AI가 생성한 TBM 회의록입니다.</DialogDescription>
          </DialogHeader>
          {minutesTbmId && <TbmMeetingMinutes tbmId={minutesTbmId} />}
        </DialogContent>
      </Dialog>

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
