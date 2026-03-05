import { describe, expect, it } from "vitest";
import { buildIssueBody } from "../page";

describe("buildIssueBody", () => {
  it("formats issue body to match GitHub template order", () => {
    const body = buildIssueBody({
      type: "🐛 버그",
      priority: "🔴 긴급 (P0)",
      summary: "요약",
      description: "상세 설명",
      additionalInfo: "추가 정보",
    });

    expect(body).toBe(
      [
        "### 유형",
        "🐛 버그",
        "",
        "### 우선순위",
        "🔴 긴급 (P0)",
        "",
        "### 요약",
        "요약",
        "",
        "### 상세 설명",
        "상세 설명",
        "",
        "### 추가 정보",
        "추가 정보",
      ].join("\n"),
    );
  });

  it("falls back to '없음' when optional fields are empty", () => {
    const body = buildIssueBody({
      type: "✨ 기능 요청",
      priority: "🟡 보통 (P2)",
      summary: "  ",
      description: "세부 내용",
      additionalInfo: "",
    });

    expect(body).toContain("### 요약\n없음");
    expect(body).toContain("### 추가 정보\n없음");
    expect(body).toContain("### 상세 설명\n세부 내용");
  });
});
