import type { QuestionFormState, QuizFormState } from "../education-types";
import type { QuestionType } from "./types";

export const QUESTION_TYPE_OPTIONS: Array<{
  value: QuestionType;
  label: string;
}> = [
  { value: "SINGLE_CHOICE", label: "단일 선택" },
  { value: "OX", label: "OX 퀴즈" },
  { value: "MULTI_CHOICE", label: "복수 선택" },
  { value: "SHORT_ANSWER", label: "주관식" },
  { value: "IMAGE", label: "이미지 문제" },
];

export const INITIAL_QUIZ_FORM: QuizFormState = {
  title: "",
  description: "",
  status: "DRAFT",
  pointsReward: "0",
  timeLimitMinutes: "",
};

export const INITIAL_QUESTION_FORM: QuestionFormState = {
  question: "",
  questionType: "SINGLE_CHOICE",
  imageUrl: "",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  correctAnswer: "0",
  correctAnswerText: "",
  explanation: "",
};
