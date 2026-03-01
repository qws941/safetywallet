"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@safetywallet/ui";
import { getQuizStatusLabel } from "../../education-helpers";
import type { QuizItem } from "../education-types";

interface Props {
  isLoading: boolean;
  quizzes: QuizItem[];
  expandedQuizId: string | null;
  onToggleExpand: (id: string | null) => void;
}

export function QuizList({
  isLoading,
  quizzes,
  expandedQuizId,
  onToggleExpand,
}: Props) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">로딩 중...</p>;
  }

  if (quizzes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">등록된 퀴즈가 없습니다.</p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>퀴즈 목록</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-2 py-2">제목</th>
                <th className="px-2 py-2">상태</th>
                <th className="px-2 py-2">통과점수</th>
                <th className="px-2 py-2">제한시간</th>
                <th className="px-2 py-2">등록일</th>
                <th className="px-2 py-2">문항</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((quiz) => {
                const isExpanded = expandedQuizId === quiz.id;
                return (
                  <tr key={quiz.id} className="border-b">
                    <td className="px-2 py-2 font-medium">{quiz.title}</td>
                    <td className="px-2 py-2">
                      <Badge variant="secondary">
                        {getQuizStatusLabel(quiz.status ?? "DRAFT")}
                      </Badge>
                    </td>
                    <td className="px-2 py-2">{quiz.passingScore}</td>
                    <td className="px-2 py-2">
                      {quiz.timeLimitMinutes
                        ? `${quiz.timeLimitMinutes}분`
                        : "-"}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {new Date(quiz.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-2 py-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onToggleExpand(isExpanded ? null : quiz.id);
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
