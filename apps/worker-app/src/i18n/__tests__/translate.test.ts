import { describe, expect, it } from "vitest";
import {
  createTranslator,
  getNestedValue,
  interpolate,
} from "@/i18n/translate";

describe("i18n translate helpers", () => {
  it("returns path when nested value is missing or not a string", () => {
    expect(getNestedValue({ a: { b: 1 } }, "a.b")).toBe("a.b");
    expect(getNestedValue({ a: {} }, "a.c")).toBe("a.c");
  });

  it("keeps unknown template variables as placeholders", () => {
    expect(interpolate("Hello {name}, {missing}", { name: "John" })).toBe(
      "Hello John, {missing}",
    );
  });

  it("creates translator that combines nested lookup and interpolation", () => {
    const t = createTranslator({ greeting: { msg: "안녕 {name}" } });
    expect(t("greeting.msg", { name: "철수" })).toBe("안녕 철수");
  });
});
