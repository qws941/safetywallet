import { Category, RejectReason } from "@safetywallet/types";

export const DEFAULT_BASE_POINTS: Record<string, number> = {
  [Category.HAZARD]: 10,
  [Category.UNSAFE_BEHAVIOR]: 8,
  [Category.INCONVENIENCE]: 5,
  [Category.SUGGESTION]: 7,
  [Category.BEST_PRACTICE]: 10,
};

export const DEFAULT_RISK_BONUS: Record<string, number> = {
  HIGH: 5,
  MEDIUM: 3,
  LOW: 0,
};

export const rejectReasons: {
  value: RejectReason;
  label: string;
  template: string;
}[] = [
  {
    value: RejectReason.DUPLICATE,
    label: "중복 제보",
    template: "이미 동일한 내용이 보고되었습니다.",
  },
  {
    value: RejectReason.UNCLEAR_PHOTO,
    label: "사진 불명확",
    template: "사진이 불명확하거나 상황을 충분히 보여주지 않습니다.",
  },
  {
    value: RejectReason.INSUFFICIENT,
    label: "정보 부족",
    template: "안전 문제를 판단하기에 제공된 정보가 부족합니다.",
  },
  {
    value: RejectReason.FALSE,
    label: "허위 제보",
    template: "부적절하거나 허위 내용이 포함되어 있습니다.",
  },
  {
    value: RejectReason.IRRELEVANT,
    label: "관련 없음",
    template: "안전과 직접적으로 관련되지 않은 내용입니다.",
  },
  {
    value: RejectReason.OTHER,
    label: "기타",
    template: "",
  },
];
