import { describe, expect, it } from "vitest";
import { buildIssueBody } from "../issue-template";

describe("buildIssueBody", () => {
  it("formats bug report to match GitHub template order", () => {
    const body = buildIssueBody("bug", {
      severity: "높음",
      priority: "🔴 긴급 (P0)",
      description: "버그가 발생했습니다.",
      steps: "1. 버튼 클릭\n2. 에러 확인",
      expected: "성공 메시지",
      actual: "500 에러",
      environment: "Chrome 120",
      screenshots: "![error](...)",
    });

    expect(body).toBe(
      [
        "### 설명",
        "",
        "버그가 발생했습니다.",
        "",
        "### 재현 단계",
        "",
        "1. 버튼 클릭\n2. 에러 확인",
        "",
        "### 기대 동작",
        "",
        "성공 메시지",
        "",
        "### 실제 동작",
        "",
        "500 에러",
        "",
        "### 심각도",
        "",
        "높음",
        "",
        "### 우선순위",
        "",
        "🔴 긴급 (P0)",
        "",
        "### 환경 정보",
        "",
        "Chrome 120",
        "",
        "### 스크린샷/로그",
        "",
        "![error](...)",
      ].join("\n"),
    );
  });

  it("formats feature request to match GitHub template order", () => {
    const body = buildIssueBody("feature", {
      kind: "신규 기능",
      priority: "🟡 보통 (P2)",
      summary: "요약",
      motivation: "동기",
      solution: "제안하는 해결 방법",
      alternatives: "고려한 대안",
      acceptance: "- [ ] 기준 1",
    });

    expect(body).toBe(
      [
        "### 유형",
        "",
        "신규 기능",
        "",
        "### 우선순위",
        "",
        "🟡 보통 (P2)",
        "",
        "### 요약",
        "",
        "요약",
        "",
        "### 동기",
        "",
        "동기",
        "",
        "### 제안하는 해결 방법",
        "",
        "제안하는 해결 방법",
        "",
        "### 고려한 대안",
        "",
        "고려한 대안",
        "",
        "### 완료 기준",
        "",
        "- [ ] 기준 1",
      ].join("\n"),
    );
  });

  it("formats task to match GitHub template order", () => {
    const body = buildIssueBody("task", {
      area: "API (apps/api)",
      priority: "높음",
      description: "작업 내용",
      acceptance: "완료 기준",
      context: "참고 사항",
    });

    expect(body).toBe(
      [
        "### 관련 영역",
        "",
        "API (apps/api)",
        "",
        "### 우선순위",
        "",
        "높음",
        "",
        "### 작업 내용",
        "",
        "작업 내용",
        "",
        "### 완료 기준",
        "",
        "완료 기준",
        "",
        "### 참고 사항",
        "",
        "참고 사항",
      ].join("\n"),
    );
  });

  it("falls back to '_No response_' when optional fields are empty", () => {
    const body = buildIssueBody("bug", {
      severity: "낮음",
      priority: "🟢 낮음 (P3)",
      description: "설명",
      steps: "단계",
      expected: "기대",
      actual: "실제",
      environment: "",
      screenshots: "  ",
    });

    expect(body).toContain("### 환경 정보\n\n_No response_");
    expect(body).toContain("### 스크린샷/로그\n\n_No response_");
  });
});
