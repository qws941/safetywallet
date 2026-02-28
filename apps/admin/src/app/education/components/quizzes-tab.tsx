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

type QuestionType = "SINGLE_CHOICE" | "OX" | "MULTI_CHOICE" | "SHORT_ANSWER";

const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType; label: string }> = [
  { value: "SINGLE_CHOICE", label: "단일 선택" },
  { value: "OX", label: "OX 퀴즈" },
  { value: "MULTI_CHOICE", label: "복수 선택" },
  { value: "SHORT_ANSWER", label: "주관식" },
];

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
  questionType: "SINGLE_CHOICE",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  correctAnswer: "0",
  correctAnswerText: "",
  explanation: "",
};

const parseMultiChoiceAnswers = (
  value: string | null | undefined,
): number[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => Number.isInteger(item) && item >= 0)
      .map((item) => Number(item));
  } catch {
    return [];
  }
};

const createMultiOption = (value = "") => ({
  id: `multi-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  value,
});

const getQuestionTypeLabel = (type: string | null | undefined): string =>
  QUESTION_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
  "단일 선택";

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
  const [multiOptions, setMultiOptions] = useState(() => [
    createMultiOption(),
    createMultiOption(),
  ]);
  const [multiCorrectAnswers, setMultiCorrectAnswers] = useState<number[]>([]);

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
    setMultiOptions([createMultiOption(), createMultiOption()]);
    setMultiCorrectAnswers([]);
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
    const questionType = (question.questionType ??
      "SINGLE_CHOICE") as QuestionType;
    setEditingQuestionId(question.id);
    setQuestionForm({
      question: question.question,
      questionType,
      option1: question.options[0] || "",
      option2: question.options[1] || "",
      option3: question.options[2] || "",
      option4: question.options[3] || "",
      correctAnswer: String(question.correctAnswer ?? 0),
      correctAnswerText: question.correctAnswerText || "",
      explanation: question.explanation || "",
    });

    if (questionType === "MULTI_CHOICE") {
      setMultiOptions(
        question.options.length > 0
          ? question.options.map((option) => createMultiOption(option))
          : [createMultiOption(), createMultiOption()],
      );
      setMultiCorrectAnswers(
        parseMultiChoiceAnswers(question.correctAnswerText),
      );
    } else {
      setMultiOptions([createMultiOption(), createMultiOption()]);
      setMultiCorrectAnswers([]);
    }
  };

  const onSubmitQuestion = async () => {
    if (!expandedQuizId || !questionForm.question.trim()) return;

    const questionType = questionForm.questionType;
    let options: string[] = [];
    let correctAnswer = 0;
    let correctAnswerText: string | undefined;

    if (questionType === "SINGLE_CHOICE") {
      options = [
        questionForm.option1,
        questionForm.option2,
        questionForm.option3,
        questionForm.option4,
      ].filter((value) => value.trim().length > 0);

      if (options.length < 2) {
        toast({
          variant: "destructive",
          description: "선택지는 최소 2개 이상 입력해야 합니다.",
        });
        return;
      }

      const selected = Number(questionForm.correctAnswer);
      if (
        !Number.isInteger(selected) ||
        selected < 0 ||
        selected >= options.length
      ) {
        toast({
          variant: "destructive",
          description: "정답을 올바르게 선택해 주세요.",
        });
        return;
      }

      correctAnswer = selected;
    }

    if (questionType === "OX") {
      options = ["O", "X"];
      const selected = Number(questionForm.correctAnswer);
      if (selected !== 0 && selected !== 1) {
        toast({
          variant: "destructive",
          description: "OX 정답을 선택해 주세요.",
        });
        return;
      }
      correctAnswer = selected;
    }

    if (questionType === "MULTI_CHOICE") {
      options = multiOptions
        .map((option) => option.value)
        .filter((value) => value.trim().length > 0);
      if (options.length < 2) {
        toast({
          variant: "destructive",
          description: "복수 선택 문항은 선택지가 최소 2개 필요합니다.",
        });
        return;
      }

      const selectedIndexes = Array.from(new Set(multiCorrectAnswers)).sort(
        (a, b) => a - b,
      );
      if (selectedIndexes.length === 0) {
        toast({
          variant: "destructive",
          description: "복수 선택 문항의 정답을 1개 이상 선택해 주세요.",
        });
        return;
      }

      const hasOutOfRange = selectedIndexes.some(
        (index) => index >= options.length,
      );
      if (hasOutOfRange) {
        toast({
          variant: "destructive",
          description: "정답 선택이 선택지 범위를 벗어났습니다.",
        });
        return;
      }

      correctAnswer = selectedIndexes[0];
      correctAnswerText = JSON.stringify(selectedIndexes);
    }

    if (questionType === "SHORT_ANSWER") {
      const answerText = questionForm.correctAnswerText.trim();
      if (!answerText) {
        toast({
          variant: "destructive",
          description: "정답 텍스트를 입력해 주세요.",
        });
        return;
      }
      options = [];
      correctAnswer = 0;
      correctAnswerText = answerText;
    }

    const editingQuestion = sortedQuizQuestions.find(
      (item) => item.id === editingQuestionId,
    );

    const payload: CreateQuizQuestionInput = {
      question: questionForm.question,
      questionType,
      options,
      correctAnswer,
      correctAnswerText,
      explanation: questionForm.explanation || undefined,
      orderIndex: editingQuestion
        ? editingQuestion.orderIndex
        : sortedQuizQuestions.length,
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

                    <div className="grid gap-3 md:grid-cols-2">
                      <Select
                        value={questionForm.questionType}
                        onValueChange={(value) => {
                          const nextType = value as QuestionType;
                          setQuestionForm((prev) => ({
                            ...prev,
                            questionType: nextType,
                            correctAnswerText:
                              nextType === "SHORT_ANSWER"
                                ? prev.correctAnswerText
                                : "",
                          }));
                          if (nextType === "MULTI_CHOICE") {
                            setMultiOptions([
                              createMultiOption(),
                              createMultiOption(),
                            ]);
                            setMultiCorrectAnswers([]);
                          }
                          if (nextType !== "MULTI_CHOICE") {
                            setMultiCorrectAnswers([]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="문항 유형" />
                        </SelectTrigger>
                        <SelectContent>
                          {QUESTION_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
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

                    {questionForm.questionType === "SINGLE_CHOICE" && (
                      <>
                        <div className="grid gap-2 md:grid-cols-2">
                          {(
                            [
                              "option1",
                              "option2",
                              "option3",
                              "option4",
                            ] as const
                          ).map((key, idx) => (
                            <Input
                              key={key}
                              placeholder={`선택지 ${idx + 1}`}
                              value={questionForm[key]}
                              onChange={(e) =>
                                setQuestionForm((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                            />
                          ))}
                        </div>
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
                            <SelectValue placeholder="정답" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">1번</SelectItem>
                            <SelectItem value="1">2번</SelectItem>
                            <SelectItem value="2">3번</SelectItem>
                            <SelectItem value="3">4번</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}

                    {questionForm.questionType === "OX" && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-md border p-3 text-center font-medium">
                            O
                          </div>
                          <div className="rounded-md border p-3 text-center font-medium">
                            X
                          </div>
                        </div>
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
                            <SelectValue placeholder="정답" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">O (⭕)</SelectItem>
                            <SelectItem value="1">X (❌)</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}

                    {questionForm.questionType === "MULTI_CHOICE" && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">선택지</div>
                        {multiOptions.map((option, optionIdx) => (
                          <div
                            key={option.id}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={multiCorrectAnswers.includes(optionIdx)}
                              onChange={(e) => {
                                setMultiCorrectAnswers((prev) => {
                                  if (e.target.checked) {
                                    return [...prev, optionIdx];
                                  }
                                  return prev.filter(
                                    (value) => value !== optionIdx,
                                  );
                                });
                              }}
                            />
                            <Input
                              placeholder={`선택지 ${optionIdx + 1}`}
                              value={option.value}
                              onChange={(e) => {
                                const next = [...multiOptions];
                                next[optionIdx] = {
                                  ...next[optionIdx],
                                  value: e.target.value,
                                };
                                setMultiOptions(next);
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                if (multiOptions.length <= 2) return;
                                const next = multiOptions.filter(
                                  (_, idx) => idx !== optionIdx,
                                );
                                setMultiOptions(next);
                                setMultiCorrectAnswers((prev) =>
                                  prev
                                    .filter((value) => value !== optionIdx)
                                    .map((value) =>
                                      value > optionIdx ? value - 1 : value,
                                    ),
                                );
                              }}
                            >
                              제거
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setMultiOptions((prev) => [
                              ...prev,
                              createMultiOption(),
                            ])
                          }
                        >
                          선택지 추가
                        </Button>
                      </div>
                    )}

                    {questionForm.questionType === "SHORT_ANSWER" && (
                      <Input
                        placeholder="정답 텍스트"
                        value={questionForm.correctAnswerText}
                        onChange={(e) =>
                          setQuestionForm((prev) => ({
                            ...prev,
                            correctAnswerText: e.target.value,
                          }))
                        }
                      />
                    )}

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
                      {sortedQuizQuestions.map((item, idx) => {
                        const itemType = (item.questionType ??
                          "SINGLE_CHOICE") as QuestionType;
                        const correctMultiAnswers =
                          itemType === "MULTI_CHOICE"
                            ? parseMultiChoiceAnswers(item.correctAnswerText)
                            : [];

                        return (
                          <div
                            key={item.id}
                            className="rounded-md border p-3 text-sm"
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <div className="font-medium">
                                {idx + 1}. {item.question}
                              </div>
                              <Badge variant="outline">
                                {getQuestionTypeLabel(itemType)}
                              </Badge>
                            </div>

                            {itemType !== "SHORT_ANSWER" && (
                              <ol className="ml-5 list-decimal space-y-1 text-muted-foreground">
                                {item.options.map((opt, optionIdx) => {
                                  const isCorrect =
                                    itemType === "MULTI_CHOICE"
                                      ? correctMultiAnswers.includes(optionIdx)
                                      : optionIdx === item.correctAnswer;
                                  return (
                                    <li
                                      key={`${item.id}-${optionIdx}`}
                                      className={
                                        isCorrect
                                          ? "font-semibold text-foreground"
                                          : ""
                                      }
                                    >
                                      {opt}
                                    </li>
                                  );
                                })}
                              </ol>
                            )}

                            {itemType === "SHORT_ANSWER" && (
                              <div className="text-muted-foreground">
                                정답 텍스트:{" "}
                                <span className="font-semibold text-foreground">
                                  {item.correctAnswerText || "-"}
                                </span>
                              </div>
                            )}

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
                        );
                      })}
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
