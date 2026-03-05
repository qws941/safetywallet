import { describe, expect, it } from "vitest";
import { buildIssueBody } from "../issue-template";
import type { IssueTemplateField } from "../issue-template";

describe("buildIssueBody", () => {
  it("formats fields in order with ### headings", () => {
    const fields: IssueTemplateField[] = [
      { id: "description", type: "textarea", label: "설명", required: true },
      {
        id: "severity",
        type: "dropdown",
        label: "심각도",
        options: ["높음", "중간", "낮음"],
        required: true,
      },
      {
        id: "priority",
        type: "dropdown",
        label: "우선순위",
        options: ["🔴 긴급 (P0)", "🟡 보통 (P2)"],
        required: true,
      },
    ];

    const values: Record<string, string> = {
      description: "버그가 발생했습니다.",
      severity: "높음",
      priority: "🔴 긴급 (P0)",
    };

    const body = buildIssueBody(fields, values);

    expect(body).toBe(
      [
        "### 설명",
        "",
        "버그가 발생했습니다.",
        "",
        "### 심각도",
        "",
        "높음",
        "",
        "### 우선순위",
        "",
        "🔴 긴급 (P0)",
      ].join("\n"),
    );
  });

  it("uses '_No response_' for empty or whitespace-only values", () => {
    const fields: IssueTemplateField[] = [
      {
        id: "environment",
        type: "textarea",
        label: "환경 정보",
        required: false,
      },
      {
        id: "screenshots",
        type: "textarea",
        label: "스크린샷/로그",
        required: false,
      },
    ];

    const values: Record<string, string> = {
      environment: "",
      screenshots: "  ",
    };

    const body = buildIssueBody(fields, values);

    expect(body).toContain("### 환경 정보\n\n_No response_");
    expect(body).toContain("### 스크린샷/로그\n\n_No response_");
  });

  it("uses '_No response_' for missing field values", () => {
    const fields: IssueTemplateField[] = [
      { id: "notes", type: "textarea", label: "참고 사항", required: false },
    ];

    const body = buildIssueBody(fields, {});

    expect(body).toBe("### 참고 사항\n\n_No response_");
  });

  it("handles single field", () => {
    const fields: IssueTemplateField[] = [
      { id: "summary", type: "textarea", label: "요약", required: true },
    ];

    const body = buildIssueBody(fields, { summary: "간단한 요약" });

    expect(body).toBe("### 요약\n\n간단한 요약");
  });

  it("handles empty fields array", () => {
    const body = buildIssueBody([], {});
    expect(body).toBe("");
  });
});
