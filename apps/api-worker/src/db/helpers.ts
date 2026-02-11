import type { DrizzleD1Database } from "drizzle-orm/d1";

/**
 * Type for Drizzle D1 database with batch support.
 * Drizzle's D1 adapter doesn't expose the native D1 .batch() method
 * in its TypeScript types, but the underlying D1Database object supports it.
 * This interface bridges the type gap. See: https://github.com/drizzle-team/drizzle-orm/issues/2381
 */
interface D1BatchableDb {
  batch<T extends readonly unknown[]>(
    operations: [...{ [K in keyof T]: Promise<T[K]> }],
  ): Promise<T>;
}

/**
 * Execute multiple database operations atomically using D1's batch API.
 * D1 doesn't support traditional transactions, but db.batch() executes
 * all statements in a single round-trip with implicit transaction semantics.
 */
export async function dbBatch<T extends readonly unknown[]>(
  db: DrizzleD1Database<Record<string, never>>,
  operations: [...{ [K in keyof T]: Promise<T[K]> }],
): Promise<T> {
  // Drizzle wraps the D1Database which natively has .batch().
  // The type assertion is scoped to this helper to contain the gap.
  const batchable = db as unknown as D1BatchableDb;
  return batchable.batch(operations);
}
