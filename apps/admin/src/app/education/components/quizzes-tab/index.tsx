"use client";

import { useState } from "react";
import { useQuizzes, useQuiz } from "@/hooks/use-api";
import type { QuizDetail, QuizItem } from "../education-types";
import { QuizRegistration } from "./quiz-registration";
import { QuizList } from "./quiz-list";
import { QuestionManagement } from "./question-management";

export function QuizzesTab() {
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

  const { data: quizzesData, isLoading } = useQuizzes();
  const { data: quizDetail } = useQuiz(expandedQuizId || "");

  const quizzes: QuizItem[] = quizzesData?.quizzes ?? [];
  const typedQuizDetail: QuizDetail | undefined = quizDetail;

  return (
    <div className="space-y-4">
      <QuizRegistration />
      <QuizList
        isLoading={isLoading}
        quizzes={quizzes}
        expandedQuizId={expandedQuizId}
        onToggleExpand={setExpandedQuizId}
      />
      {expandedQuizId && typedQuizDetail && (
        <QuestionManagement
          key={expandedQuizId}
          expandedQuizId={expandedQuizId}
          typedQuizDetail={typedQuizDetail}
        />
      )}
    </div>
  );
}
