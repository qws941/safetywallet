export const BUG_SEVERITY_OPTIONS = ["낮음", "보통", "높음", "심각"];
export const BUG_PRIORITY_OPTIONS = [
  "🔴 긴급 (P0)",
  "🟠 높음 (P1)",
  "🟡 보통 (P2)",
  "🟢 낮음 (P3)",
];

export const FEATURE_KIND_OPTIONS = [
  "신규 기능",
  "기존 기능 개선",
  "성능 개선",
  "개발 경험 개선",
];
export const FEATURE_PRIORITY_OPTIONS = BUG_PRIORITY_OPTIONS;

export const TASK_AREA_OPTIONS = [
  "API (apps/api)",
  "근로자 앱 (apps/worker)",
  "관리자 대시보드 (apps/admin)",
  "공통 패키지 (packages/)",
  "CI/CD / 인프라",
  "문서 / 기타",
];
export const TASK_PRIORITY_OPTIONS = ["낮음", "보통", "높음", "긴급"];

export type TemplateType = "bug" | "feature" | "task";

export function buildIssueBody(
  template: TemplateType,
  fields: Record<string, string>,
) {
  const sanitize = (value: string | undefined) => {
    const trimmed = (value || "").trim();
    return trimmed ? trimmed : "_No response_";
  };

  if (template === "bug") {
    return [
      "### 설명",
      "",
      sanitize(fields.description),
      "",
      "### 재현 단계",
      "",
      sanitize(fields.steps),
      "",
      "### 기대 동작",
      "",
      sanitize(fields.expected),
      "",
      "### 실제 동작",
      "",
      sanitize(fields.actual),
      "",
      "### 심각도",
      "",
      sanitize(fields.severity),
      "",
      "### 우선순위",
      "",
      sanitize(fields.priority),
      "",
      "### 환경 정보",
      "",
      sanitize(fields.environment),
      "",
      "### 스크린샷/로그",
      "",
      sanitize(fields.screenshots),
    ].join("\n");
  }

  if (template === "feature") {
    return [
      "### 유형",
      "",
      sanitize(fields.kind),
      "",
      "### 우선순위",
      "",
      sanitize(fields.priority),
      "",
      "### 요약",
      "",
      sanitize(fields.summary),
      "",
      "### 동기",
      "",
      sanitize(fields.motivation),
      "",
      "### 제안하는 해결 방법",
      "",
      sanitize(fields.solution),
      "",
      "### 고려한 대안",
      "",
      sanitize(fields.alternatives),
      "",
      "### 완료 기준",
      "",
      sanitize(fields.acceptance),
    ].join("\n");
  }

  if (template === "task") {
    return [
      "### 관련 영역",
      "",
      sanitize(fields.area),
      "",
      "### 우선순위",
      "",
      sanitize(fields.priority),
      "",
      "### 작업 내용",
      "",
      sanitize(fields.description),
      "",
      "### 완료 기준",
      "",
      sanitize(fields.acceptance),
      "",
      "### 참고 사항",
      "",
      sanitize(fields.context),
    ].join("\n");
  }

  return "";
}
