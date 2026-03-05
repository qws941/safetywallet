"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@safetywallet/ui";
import { useAdminQuizAttempts } from "@/hooks/use-education-quizzes-api";
import { DataTable, type Column } from "@/components/data-table";
import { getQuizStatusLabel } from "../../education-helpers";
import type { QuizItem } from "../education-types";

interface Props {
  isLoading: boolean;
  quizzes: QuizItem[];
  expandedQuizId: string | null;
  onToggleExpand: (id: string | null) => void;
  onEditQuiz: (quiz: QuizItem) => void;
  onDeleteQuiz: (quizId: string) => void;
}

export function QuizList({
  isLoading,
  quizzes,
  expandedQuizId,
  onToggleExpand,
  onEditQuiz,
  onDeleteQuiz,
}: Props) {
  const [deleteQuizId, setDeleteQuizId] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizItem | null>(null);
  const { data: attemptsData, isLoading: attemptsLoading } =
    useAdminQuizAttempts(selectedQuiz?.id);

  const columns: Column<QuizItem>[] = [
    {
      key: "title",
      header: "제목",
      sortable: true,
      render: (item) => (
        <span className="font-medium break-words">{item.title}</span>
      ),
    },
    {
      key: "status",
      header: "상태",
      sortable: true,
      render: (item) => (
        <Badge variant="secondary">
          {getQuizStatusLabel(item.status ?? "DRAFT")}
        </Badge>
      ),
    },
    {
      key: "timeLimitMinutes",
      header: "제한시간",
      render: (item) =>
        item.timeLimitMinutes ? `${item.timeLimitMinutes}분` : "-",
    },
    {
      key: "questionCount",
      header: "문항수",
      sortable: true,
      render: (item) => (
        <span className="text-muted-foreground">
          {item.questionCount ?? 0}개
        </span>
      ),
    },
    {
      key: "attemptCount",
      header: "응시수",
      sortable: true,
      render: (item) => {
        const count = item.attemptCount ?? 0;
        return count > 0 ? (
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedQuiz(item);
            }}
          >
            {count}회
          </button>
        ) : (
          <span className="text-muted-foreground">0회</span>
        );
      },
    },
    {
      key: "createdAt",
      header: "등록일",
      sortable: true,
      render: (item) => (
        <span className="text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString("ko-KR")}
        </span>
      ),
    },
    {
      key: "_actions",
      header: "관리",
      className: "text-right",
      render: (item) => {
        const isExpanded = expandedQuizId === item.id;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEditQuiz(item);
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
                setDeleteQuizId(item.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(isExpanded ? null : item.id);
              }}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="mr-1 h-4 w-4" />
                  접기
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-4 w-4" />
                  문항 관리
                </>
              )}
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
        data={quizzes}
        searchable
        searchPlaceholder="퀴즈 검색..."
        emptyMessage="등록된 퀴즈가 없습니다."
      />
      <Dialog
        open={!!selectedQuiz}
        onOpenChange={(open) => !open && setSelectedQuiz(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedQuiz?.title} - 응시자 목록</DialogTitle>
            <DialogDescription>
              총 {selectedQuiz?.attemptCount ?? 0}회 응시
            </DialogDescription>
          </DialogHeader>
          {attemptsLoading ? (
            <p className="text-sm text-muted-foreground py-4">로딩 중...</p>
          ) : attemptsData?.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              응시 기록이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">이름</th>
                    <th className="py-2 pr-4">점수</th>
                    <th className="py-2 pr-4">합격</th>
                    <th className="py-2">응시일시</th>
                  </tr>
                </thead>
                <tbody>
                  {attemptsData?.items.map((a) => (
                    <tr key={a.id} className="border-b">
                      <td className="py-2 pr-4">{a.userName || "-"}</td>
                      <td className="py-2 pr-4">{a.score}점</td>
                      <td className="py-2 pr-4">
                        <span
                          className={
                            a.passed ? "text-green-600" : "text-red-600"
                          }
                        >
                          {a.passed ? "합격" : "불합격"}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {a.completedAt
                          ? new Date(a.completedAt).toLocaleString("ko-KR")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleteQuizId}
        onOpenChange={(open) => !open && setDeleteQuizId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>퀴즈 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              퀴즈를 삭제하시겠습니까? 관련 문항도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteQuizId) {
                  onDeleteQuiz(deleteQuizId);
                  setDeleteQuizId(null);
                }
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
