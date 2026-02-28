import { describe, expect, it } from "vitest";
import { defaultLocale, localeNames, locales } from "@/i18n/config";

describe("i18n/config", () => {
  it("exports supported locales and default locale", () => {
    expect(locales).toEqual(["ko", "en"]);
    expect(defaultLocale).toBe("ko");
  });

  it("exports locale display names", () => {
    expect(localeNames.ko).toBe("한국어");
    expect(localeNames.en).toBe("English");
  });
});
