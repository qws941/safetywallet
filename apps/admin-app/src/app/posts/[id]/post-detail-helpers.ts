import {
  ReviewStatus,
  ActionStatus,
  Category,
  RiskLevel,
} from "@safetywallet/types";

export type { Post } from "@/hooks/use-posts-api";

export const statusLabels: Record<ReviewStatus, string> = {
  [ReviewStatus.PENDING]: "접수됨",
  [ReviewStatus.IN_REVIEW]: "검토 중",
  [ReviewStatus.NEED_INFO]: "추가정보 필요",
  [ReviewStatus.APPROVED]: "승인됨",
  [ReviewStatus.REJECTED]: "거절됨",
  [ReviewStatus.URGENT]: "긴급",
};

export const statusColors: Record<ReviewStatus, string> = {
  [ReviewStatus.PENDING]: "bg-blue-100 text-blue-800",
  [ReviewStatus.IN_REVIEW]: "bg-yellow-100 text-yellow-800",
  [ReviewStatus.NEED_INFO]: "bg-orange-100 text-orange-800",
  [ReviewStatus.APPROVED]: "bg-green-100 text-green-800",
  [ReviewStatus.REJECTED]: "bg-red-100 text-red-800",
  [ReviewStatus.URGENT]: "bg-red-200 text-red-800 font-semibold",
};

export const categoryLabels: Record<Category, string> = {
  [Category.HAZARD]: "위험요소",
  [Category.UNSAFE_BEHAVIOR]: "불안전 행동",
  [Category.INCONVENIENCE]: "불편사항",
  [Category.SUGGESTION]: "개선 제안",
  [Category.BEST_PRACTICE]: "모범 사례",
};

export const riskLabels: Record<string, { label: string; color: string }> = {
  [RiskLevel.HIGH]: { label: "높음", color: "bg-red-100 text-red-800" },
  [RiskLevel.MEDIUM]: {
    label: "보통",
    color: "bg-yellow-100 text-yellow-800",
  },
  [RiskLevel.LOW]: { label: "낮음", color: "bg-green-100 text-green-800" },
};

export const reviewActionLabels: Record<string, string> = {
  APPROVE: "승인",
  REJECT: "거절",
  REQUEST_MORE: "추가정보 요청",
  MARK_URGENT: "긴급 지정",
  ASSIGN: "시정조치 배정",
  CLOSE: "종결",
};

export const actionStatusLabels: Record<ActionStatus, string> = {
  [ActionStatus.NONE]: "없음",
  [ActionStatus.ASSIGNED]: "배정됨",
  [ActionStatus.IN_PROGRESS]: "진행 중",
  [ActionStatus.COMPLETED]: "완료",
  [ActionStatus.VERIFIED]: "확인됨",
  [ActionStatus.OVERDUE]: "기한초과",
};

export const actionStatusColors: Record<ActionStatus, string> = {
  [ActionStatus.NONE]: "",
  [ActionStatus.ASSIGNED]: "bg-blue-100 text-blue-800",
  [ActionStatus.IN_PROGRESS]: "bg-yellow-100 text-yellow-800",
  [ActionStatus.COMPLETED]: "bg-green-100 text-green-800",
  [ActionStatus.VERIFIED]: "bg-emerald-100 text-emerald-800",
  [ActionStatus.OVERDUE]: "bg-red-200 text-red-800 font-semibold",
};

export function buildLocationString(post: {
  locationFloor?: string;
  locationZone?: string;
  locationDetail?: string;
}): string {
  return [
    post.locationFloor && `${post.locationFloor}층`,
    post.locationZone,
    post.locationDetail,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function canReviewPost(status: ReviewStatus): boolean {
  return (
    status === ReviewStatus.PENDING ||
    status === ReviewStatus.IN_REVIEW ||
    status === ReviewStatus.NEED_INFO
  );
}
