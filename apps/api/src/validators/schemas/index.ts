// Barrel re-export of all schemas
// This maintains backward compatibility with existing imports from "../validators/schemas"

// shared.ts is internal-only (enum arrays, primitives) — not re-exported
export * from "./auth.js";
export * from "./domain.js";
