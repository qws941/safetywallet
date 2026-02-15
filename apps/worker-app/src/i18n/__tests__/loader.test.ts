import { afterEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/config";

afterEach(() => {
  vi.unmock("@/locales/en.json");
  vi.unmock("../config");
  vi.restoreAllMocks();
});

describe("i18n loader", () => {
  it("loads default locale when locale is omitted", async () => {
    vi.resetModules();
    const { getLocale } = await import("@/i18n/loader");
    const ko = (await import("@/locales/ko.json")).default;

    await expect(getLocale()).resolves.toEqual(ko);
  });

  it("loads en locale successfully", async () => {
    vi.resetModules();
    const { getLocale } = await import("@/i18n/loader");
    const en = (await import("@/locales/en.json")).default;

    await expect(getLocale("en")).resolves.toEqual(en);
  });

  it("falls back to default locale for unsupported locale", async () => {
    vi.resetModules();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getLocale } = await import("@/i18n/loader");
    const ko = (await import("@/locales/ko.json")).default;

    await expect(getLocale("vi" as Locale)).resolves.toEqual(ko);
    expect(warnSpy).toHaveBeenCalledWith(
      "Locale vi not found, falling back to ko",
    );
  });

  it("handles loader errors and falls back to default locale", async () => {
    vi.resetModules();
    vi.doMock("@/locales/en.json", () => {
      throw new Error("mocked locale import failure");
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getLocale } = await import("@/i18n/loader");
    const ko = (await import("@/locales/ko.json")).default;

    await expect(getLocale("en")).resolves.toEqual(ko);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("throws when configured default locale loader is missing", async () => {
    vi.resetModules();
    vi.doMock("../config", async () => {
      const actual =
        await vi.importActual<typeof import("../config")>("../config");
      return {
        ...actual,
        defaultLocale: "fr",
      };
    });

    const { getLocale } = await import("@/i18n/loader");

    await expect(getLocale("vi" as Locale)).rejects.toThrow(
      "Default locale fr not found",
    );
  });
});
