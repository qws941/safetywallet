import { QUESTION_TYPE_OPTIONS } from "./constants";

export const parseMultiChoiceAnswers = (
  value: string | null | undefined,
): number[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item: unknown) =>
          typeof item === "number" && Number.isInteger(item) && item >= 0,
      )
      .map((item: number) => Number(item));
  } catch {
    return [];
  }
};

export const createMultiOption = (value = "") => ({
  id: `multi-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  value,
});

export const getQuestionTypeLabel = (type: string | null | undefined): string =>
  QUESTION_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
  "단일 선택";
