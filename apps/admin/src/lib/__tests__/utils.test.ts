import { describe, expect, it, vi } from "vitest";

const cnMock = vi.fn(() => "merged-class");

vi.mock("@safetywallet/ui", () => ({
  cn: (...args: unknown[]) => cnMock(...args),
}));

describe("lib/utils", () => {
  it("re-exports cn from @safetywallet/ui", async () => {
    const utils = await import("@/lib/utils");
    const result = utils.cn("a", "b");

    expect(result).toBe("merged-class");
    expect(cnMock).toHaveBeenCalledWith("a", "b");
  });
});
