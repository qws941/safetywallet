import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTodayRange, maskName } from "../common";

describe("common utilities", () => {
  // ---------- maskName ----------

  describe("maskName", () => {
    it("masks single character name to *", () => {
      expect(maskName("김")).toBe("*");
    });

    it("masks two character name: first + *", () => {
      expect(maskName("김철")).toBe("김*");
    });

    it("masks three character Korean name: first + * + last", () => {
      expect(maskName("김철수")).toBe("김*수");
    });

    it("masks four character name: first + ** + last", () => {
      expect(maskName("김영철수")).toBe("김**수");
    });

    it("masks long English name correctly", () => {
      expect(maskName("Johnson")).toBe("J*****n");
    });

    it("handles empty string gracefully", () => {
      expect(maskName("")).toBe("*");
    });
  });

  // ---------- getTodayRange ----------

  describe("getTodayRange", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns start and end dates with 5AM KST cutoff during daytime", () => {
      // 2025-06-15 14:00 KST = 2025-06-15 05:00 UTC
      vi.setSystemTime(new Date("2025-06-15T05:00:00Z"));

      const range = getTodayRange();

      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
    });

    it("start and end span exactly 24 hours", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const range = getTodayRange();
      const diffMs = range.end.getTime() - range.start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      expect(diffHours).toBe(24);
    });

    it("start hour is always 5 (the KST cutoff)", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const range = getTodayRange();

      expect(range.start.getHours()).toBe(5);
      expect(range.start.getMinutes()).toBe(0);
      expect(range.start.getSeconds()).toBe(0);
      expect(range.start.getMilliseconds()).toBe(0);
    });

    it("end hour is always 5 (next day cutoff)", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const range = getTodayRange();

      expect(range.end.getHours()).toBe(5);
      expect(range.end.getMinutes()).toBe(0);
      expect(range.end.getSeconds()).toBe(0);
      expect(range.end.getMilliseconds()).toBe(0);
    });

    it("before 5AM KST rolls back to previous day", () => {
      // 2025-06-15 03:00 KST = 2025-06-14 18:00 UTC
      vi.setSystemTime(new Date("2025-06-14T18:00:00Z"));

      const range = getTodayRange();
      const rangeDay = range.start.getDate();

      // After 5AM KST same day
      vi.setSystemTime(new Date("2025-06-15T05:00:00Z"));
      const rangeDaytime = getTodayRange();
      const daytimeDay = rangeDaytime.start.getDate();

      // The pre-5AM range should start one day earlier
      expect(rangeDay).toBeLessThan(daytimeDay);
    });
  });
});
