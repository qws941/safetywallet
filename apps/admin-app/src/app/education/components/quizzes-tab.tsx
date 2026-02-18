"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@safetywallet/ui";
import {
  useCreateQuiz,
  useCreateQuizQuestion,
  useDeleteQuizQuestion,
  useQuiz,
  useQuizzes,
  useUpdateQuizQuestion,
  type CreateQuizInput,
  type CreateQuizQuestionInput,
  type QuizQuestion,
} from "@/hooks/use-api";
import { useAuthStore } from "@/stores/auth";
import { getErrorMessage, getQuizStatusLabel } from "../education-helpers";
import type {
  QuestionFormState,
  QuizDetail,
  QuizFormState,
  QuizItem,
} from "./education-types";

const INITIAL_QUIZ_FORM: QuizFormState = {
  title: "",
  description: "",
  status: "DRAFT",
  pointsReward: "0",
  passingScore: "70",
  timeLimitMinutes: "",
};

const INITIAL_QUESTION_FORM: QuestionFormState = {
  question: "",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  correctAnswer: "0",
  explanation: "",
};

export function QuizzesTab() {
  const currentSiteId = useAuthStore((s) => s.currentSiteId);
  const { toast } = useToast();

  const [quizForm, setQuizForm] = useState<QuizFormState>(INITIAL_QUIZ_FORM);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(
    INITIAL_QUESTION_FORM,
  );

  const { data: quizzesData, isLoading } = useQuizzes();
  const { data: quizDetail } = useQuiz(expandedQuizId || "");
  const createQuizMutation = useCreateQuiz();
  const createQuestionMutation = useCreateQuizQuestion();
  const updateQuestionMutation = useUpdateQuizQuestion();
  const deleteQuestionMutation = useDeleteQuizQuestion();

  const quizzes: QuizItem[] = quizzesData?.quizzes ?? [];
  const typedQuizDetail: QuizDetail | undefined = quizDetail;

  const sortedQuizQuestions = useMemo(() => {
    if (!typedQuizDetail?.questions) return [];
    return [...typedQuizDetail.questions].sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );
  }, [typedQuizDetail?.questions]);

  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setQuestionForm(INITIAL_QUESTION_FORM);
  };

  const onCreateQuiz = async () => {
    if (!currentSiteId || !quizForm.title) return;
    try {
      await createQuizMutation.mutateAsync({
        siteId: currentSiteId,
        title: quizForm.title,
        description: quizForm.description || undefined,
        status: quizForm.status,
        pointsReward: Number(quizForm.pointsReward || 0),
        passingScore: Number(quizForm.passingScore || 70),
        timeLimitMinutes: quizForm.timeLimitMinutes
          ? Number(quizForm.timeLimitMinutes)
          : undefined,
      });
      toast({ description: "퀴즈가 등록되었습니다." });
      setQuizForm(INITIAL_QUIZ_FORM);
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
  };

  const fillQuestionForm = (question: QuizQuestion) => {
    setEditingQuestionId(question.id);
    setQuestionForm({
      question: question.question,
      option1: question.options[0] || "",
      option2: question.options[1] || "",
      option3: question.options[2] || "",
      option4: question.options[3] || "",
      correctAnswer: String(question.correctAnswer),
      explanation: question.explanation || "",
    });
  };

  const onSubmitQuestion = async () => {
    if (!expandedQuizId || !questionForm.question) return;

    const options = [
      questionForm.option1,
      questionForm.option2,
      questionForm.option3,
      questionForm.option4,
    ].filter((v) => v.trim().length > 0);

    if (options.length < 2) {
      toast({
        variant: "destructive",
        description: "선택지는 최소 2개 이상 입력해야 합니다.",
      });
      return;
    }

    const payload: CreateQuizQuestionInput = {
      question: questionForm.question,
      options,
      correctAnswer: Number(questionForm.correctAnswer),
      explanation: questionForm.explanation || undefined,
      orderIndex: sortedQuizQuestions.length,
    };

    try {
      if (editingQuestionId) {
        await updateQuestionMutation.mutateAsync({
          quizId: expandedQuizId,
          questionId: editingQuestionId,
          data: payload,
        });
        toast({ description: "문항이 수정되었습니다." });
      } else {
        await createQuestionMutation.mutateAsync({
          quizId: expandedQuizId,
          data: payload,
        });
        toast({ description: "문항이 등록되었습니다." });
      }
      resetQuestionForm();
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
  };

  const onDeleteQuestion = async (questionId: string) => {
    if (!expandedQuizId) return;
    try {
      await deleteQuestionMutation.mutateAsync({
        quizId: expandedQuizId,
        questionId,
      });
      toast({ description: "문항이 삭제되었습니다." });
      if (editingQuestionId === questionId) {
        resetQuestionForm();
      }
    } catch (error) {
      toast({ variant: "destructive", description: getErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>퀴즈 등록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="퀴즈 제목"
            value={quizForm.title}
            onChange={(e) =>
              setQuizForm((prev) => ({ ...prev, title: e.target.value }))
            }
          />
          <textarea
            className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="설명"
            value={quizForm.description}
            onChange={(e) =>
              setQuizForm((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
          />
          <div className="grid gap-3 md:grid-cols-4">
            <Select
              value={quizForm.status}
              onValueChange={(value) =>
                setQuizForm((prev) => ({
                  ...prev,
                  status: value as CreateQuizInput["status"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">초안</SelectItem>
                <SelectItem value="PUBLISHED">게시</SelectItem>
                <SelectItem value="ARCHIVED">보관</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="보상 포인트"
              value={quizForm.pointsReward}
              onChange={(e) =>
                setQuizForm((prev) => ({
                  ...prev,
                  pointsReward: e.target.value,
                }))
              }
            />
            <Input
              type="number"
              placeholder="통과 점수"
              value={quizForm.passingScore}
              onChange={(e) =>
                setQuizForm((prev) => ({
                  ...prev,
                  passingScore: e.target.value,
                }))
              }
            />
            <Input
              type="number"
              placeholder="제한 시간(분)"
              value={quizForm.timeLimitMinutes}
              onChange={(e) =>
                setQuizForm((prev) => ({
                  ...prev,
                  timeLimitMinutes: e.target.value,
                }))
              }
            />
          </div>
          <Button
            type="button"
            onClick={onCreateQuiz}
            disabled={
              !currentSiteId || !quizForm.title || createQuizMutation.isPending
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            퀴즈 등록
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>퀴즈 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          ) : quizzes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              등록된 퀴즈가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
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
                          <td className="px-2 py-2 font-medium">
                            {quiz.title}
                          </td>
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
                            {new Date(quiz.createdAt).toLocaleDateString(
                              "ko-KR",
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExpandedQuizId(isExpanded ? null : quiz.id);
                                resetQuestionForm();
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

              {expandedQuizId && typedQuizDetail && (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base">
                      문항 관리 - {typedQuizDetail.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <textarea
                      className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="문항"
                      value={questionForm.question}
                      onChange={(e) =>
                        setQuestionForm((prev) => ({
                          ...prev,
                          question: e.target.value,
                        }))
                      }
                    />
                    <div className="grid gap-2 md:grid-cols-2">
                      {["option1", "option2", "option3", "option4"].map(
                        (key, idx) => (
                          <Input
                            key={key}
                            placeholder={`선택지 ${idx + 1}`}
                            value={
                              questionForm[
                                key as keyof typeof questionForm
                              ] as string
                            }
                            onChange={(e) =>
                              setQuestionForm((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                          />
                        ),
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Select
                        value={questionForm.correctAnswer}
                        onValueChange={(value) =>
                          setQuestionForm((prev) => ({
                            ...prev,
                            correctAnswer: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="정답 번호" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">1번</SelectItem>
                          <SelectItem value="1">2번</SelectItem>
                          <SelectItem value="2">3번</SelectItem>
                          <SelectItem value="3">4번</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="해설"
                        value={questionForm.explanation}
                        onChange={(e) =>
                          setQuestionForm((prev) => ({
                            ...prev,
                            explanation: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" onClick={onSubmitQuestion}>
                        {editingQuestionId ? "문항 수정" : "문항 추가"}
                      </Button>
                      {editingQuestionId && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetQuestionForm}
                        >
                          취소
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {sortedQuizQuestions.map((item, idx) => (
                        <div
                          key={item.id}
                          className="rounded-md border p-3 text-sm"
                        >
                          <div className="mb-1 font-medium">
                            {idx + 1}. {item.question}
                          </div>
                          <ol className="ml-5 list-decimal space-y-1 text-muted-foreground">
                            {item.options.map((opt, optionIdx) => (
                              <li
                                key={`${item.id}-${optionIdx}`}
                                className={
                                  optionIdx === item.correctAnswer
                                    ? "font-semibold text-foreground"
                                    : ""
                                }
                              >
                                {opt}
                              </li>
                            ))}
                          </ol>
                          <div className="mt-2 flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => fillQuestionForm(item)}
                            >
                              수정
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => onDeleteQuestion(item.id)}
                            >
                              삭제
                            </Button>
                          </div>
                        </div>
                      ))}
                      {sortedQuizQuestions.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          등록된 문항이 없습니다.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
