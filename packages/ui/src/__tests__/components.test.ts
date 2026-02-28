import { describe, it, expect } from "vitest";

describe("UI Components", () => {
  it("should export UI components", async () => {
    // We just need to verify the barrel exports work
    // Since UI components are largely tested inside apps,
    // this ensures 100% coverage on the package barrel files
    const ui = await import("../index");

    expect(ui.Button).toBeDefined();
    expect(ui.Input).toBeDefined();
    expect(ui.Card).toBeDefined();
    expect(ui.Dialog).toBeDefined();
  });
});
