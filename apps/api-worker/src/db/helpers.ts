import type { DrizzleD1Database } from "drizzle-orm/d1";

// Drizzle D1 type gap — see https://github.com/drizzle-team/drizzle-orm/issues/2381
interface D1BatchableDb {
  batch<T extends readonly unknown[]>(
    operations: [...{ [K in keyof T]: Promise<T[K]> }],
  ): Promise<T>;
}

const D1_BATCH_LIMIT = 100;

export async function dbBatch<T extends readonly unknown[]>(
  db: DrizzleD1Database<Record<string, never>>,
  operations: [...{ [K in keyof T]: Promise<T[K]> }],
): Promise<T> {
  const batchable = db as unknown as D1BatchableDb;
  return batchable.batch(operations);
}

/** Batch operations in chunks of D1_BATCH_LIMIT (100) to stay within D1 limits. */
export async function dbBatchChunked(
  db: DrizzleD1Database<Record<string, never>>,
  operations: Promise<unknown>[],
): Promise<void> {
  if (operations.length === 0) return;

  const batchable = db as unknown as D1BatchableDb;

  for (let i = 0; i < operations.length; i += D1_BATCH_LIMIT) {
    const chunk = operations.slice(i, i + D1_BATCH_LIMIT);
    await batchable.batch(chunk as [Promise<unknown>]);
  }
}
