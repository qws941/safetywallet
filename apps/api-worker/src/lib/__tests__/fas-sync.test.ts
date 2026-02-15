import { describe, expect, it } from "vitest";
import { socialNoToDob } from "../fas-sync";

describe("fas-sync", () => {
  // ---------- socialNoToDob ----------

  describe("socialNoToDob", () => {
    describe("1900s century (gender digits 1, 2, 5, 6)", () => {
      it("converts gender digit 1 (male, 1900s)", () => {
        // 710410 + 1 → 19710410
        expect(socialNoToDob("7104101")).toBe("19710410");
      });

      it("converts gender digit 2 (female, 1900s)", () => {
        // 850325 + 2 → 19850325
        expect(socialNoToDob("8503252")).toBe("19850325");
      });

      it("converts gender digit 5 (foreign male, 1900s)", () => {
        expect(socialNoToDob("9001015")).toBe("19900101");
      });

      it("converts gender digit 6 (foreign female, 1900s)", () => {
        expect(socialNoToDob("7512316")).toBe("19751231");
      });
    });

    describe("2000s century (gender digits 3, 4, 7, 8)", () => {
      it("converts gender digit 3 (male, 2000s)", () => {
        expect(socialNoToDob("0501153")).toBe("20050115");
      });

      it("converts gender digit 4 (female, 2000s)", () => {
        expect(socialNoToDob("1003074")).toBe("20100307");
      });

      it("converts gender digit 7 (foreign male, 2000s)", () => {
        expect(socialNoToDob("0208127")).toBe("20020812");
      });

      it("converts gender digit 8 (foreign female, 2000s)", () => {
        expect(socialNoToDob("0712248")).toBe("20071224");
      });
    });

    describe("1800s century (gender digits 9, 0)", () => {
      it("converts gender digit 9 (male, 1800s)", () => {
        expect(socialNoToDob("9901019")).toBe("18990101");
      });

      it("converts gender digit 0 (female, 1800s)", () => {
        expect(socialNoToDob("8806150")).toBe("18880615");
      });
    });

    describe("edge cases", () => {
      it("returns null for null input", () => {
        expect(socialNoToDob(null)).toBeNull();
      });

      it("returns null for empty string", () => {
        expect(socialNoToDob("")).toBeNull();
      });

      it("returns null for string shorter than 7 chars", () => {
        expect(socialNoToDob("710410")).toBeNull();
      });

      it("returns null for invalid gender digit", () => {
        // 'A' is not a valid gender digit
        expect(socialNoToDob("710410A")).toBeNull();
      });

      it("handles strings longer than 7 chars (uses first 7)", () => {
        // Full 13-digit social number
        expect(socialNoToDob("7104101234567")).toBe("19710410");
      });
    });
  });
});
