import { describe, expect, it } from "vitest";
import {
  formatDateForInput,
  formatTime,
  getKSTHour,
} from "./attendance-helpers";

describe("attendance-helpers", () => {
  describe("formatDateForInput", () => {
    it("formats date in KST for date input", () => {
      const utcDate = new Date("2026-02-23T16:00:00.000Z");
      expect(formatDateForInput(utcDate)).toBe("2026-02-24");
    });
  });

  describe("getKSTHour", () => {
    it("returns KST hour for a valid ISO string with +09:00 offset", () => {
      // 06:30 KST = 06:30+09:00 → UTC 21:30 previous day
      expect(getKSTHour("2026-01-15T06:30:00+09:00")).toBe(6);
    });

    it("returns KST hour for a UTC ISO string", () => {
      // 00:00 UTC → 09:00 KST
      expect(getKSTHour("2026-01-15T00:00:00.000Z")).toBe(9);
    });

    it("returns NaN for an invalid date string", () => {
      expect(getKSTHour("invalid-date")).toBeNaN();
    });

    it("returns NaN for an empty string", () => {
      expect(getKSTHour("")).toBeNaN();
    });

    it("detects early attendance (hour < 5 KST)", () => {
      // 04:00 KST
      expect(getKSTHour("2026-01-15T04:00:00+09:00")).toBe(4);
      // 00:00 KST
      expect(getKSTHour("2026-01-15T00:00:00+09:00")).toBe(0);
    });

    it("detects late attendance (hour >= 12 KST)", () => {
      // 12:00 KST
      expect(getKSTHour("2026-01-15T12:00:00+09:00")).toBe(12);
      // 15:30 KST
      expect(getKSTHour("2026-01-15T15:30:00+09:00")).toBe(15);
    });

    it("handles padded 3-digit inTime correctly (e.g. 630 → 0630 → 06:30)", () => {
      // This is the key bug scenario: FAS DB stores 630 as INT,
      // backend now pads to '0630' and produces valid ISO
      const isoFrom0630 = "2026-01-15T06:30:00+09:00";
      const hour = getKSTHour(isoFrom0630);
      expect(hour).toBe(6);
      expect(hour).not.toBeNaN();
    });
  });

  describe("formatTime", () => {
    it("returns dash for null input", () => {
      expect(formatTime(null)).toBe("-");
    });

    it("returns dash for empty string", () => {
      expect(formatTime("")).toBe("-");
    });

    it("formats a valid ISO date to Korean time string", () => {
      const result = formatTime("2026-01-15T06:30:00+09:00");
      // Should contain hour and minute components
      expect(result).not.toBe("-");
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
