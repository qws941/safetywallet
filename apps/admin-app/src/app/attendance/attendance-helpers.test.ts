import { describe, expect, it } from "vitest";
import { formatDateForInput } from "./attendance-helpers";

describe("attendance-helpers", () => {
  it("formats date in KST for date input", () => {
    const utcDate = new Date("2026-02-23T16:00:00.000Z");
    expect(formatDateForInput(utcDate)).toBe("2026-02-24");
  });
});
