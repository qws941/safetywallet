import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTranslation } from "@/hooks/use-translation";

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    messages: {
      greeting: {
        hello: "안녕하세요",
        named: "{name}님 환영합니다",
      },
    },
  }),
}));

describe("useTranslation", () => {
  it("translates nested keys", () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current("greeting.hello")).toBe("안녕하세요");
  });

  it("interpolates template variables", () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current("greeting.named", { name: "철수" })).toBe(
      "철수님 환영합니다",
    );
  });

  it("falls back to key when translation is missing", () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current("missing.key")).toBe("missing.key");
  });
});
