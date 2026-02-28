import { describe, expect, it } from "vitest";
import * as i18n from "@/i18n/index";

describe("i18n/index", () => {
  it("re-exports key runtime APIs", () => {
    expect(i18n.I18nProvider).toBeDefined();
    expect(i18n.useI18n).toBeDefined();
    expect(i18n.getLocale).toBeDefined();
    expect(i18n.createTranslator).toBeDefined();
    expect(i18n.getNestedValue).toBeDefined();
    expect(i18n.interpolate).toBeDefined();
  });

  it("re-exports locale config", () => {
    expect(i18n.defaultLocale).toBe("ko");
    expect(i18n.locales).toEqual(["ko", "en"]);
    expect(i18n.localeNames.ko).toBe("한국어");
  });
});
