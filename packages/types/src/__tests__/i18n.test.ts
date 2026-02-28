import { describe, it, expect } from "vitest";
import * as i18n from "../i18n";

describe("i18n", () => {
  it("should export translations", () => {
    expect(i18n.ko).toBeDefined();
  });
});
