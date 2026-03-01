import { QuizQuestion } from "@/hooks/use-api";

export type QuestionType =
  | "SINGLE_CHOICE"
  | "OX"
  | "MULTI_CHOICE"
  | "SHORT_ANSWER";

export interface MultiOption {
  id: string;
  value: string;
}
