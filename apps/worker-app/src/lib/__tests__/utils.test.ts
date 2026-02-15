import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class values and removes conflicting tailwind utilities", () => {
    expect(cn("px-2", "text-sm", "px-4", { "font-bold": true })).toBe(
      "text-sm px-4 font-bold",
    );
  });

  it("returns empty string for empty inputs", () => {
    expect(cn(undefined, null, false, "")).toBe("");
  });
});
