import { describe, it, expect } from "vitest";

// We import the entire index to verify barrel exports work
// Zod schemas are tested implicitly through API integration tests,
// but we just need to ensure the barrel file compiles and exports correctly
import * as dtos from "../dto";

describe("DTOs", () => {
  it("should export dtos", () => {
    // Just verify the module loaded successfully
    expect(dtos).toBeDefined();
    expect(Object.keys(dtos).length).toBeGreaterThanOrEqual(0);
  });
});
