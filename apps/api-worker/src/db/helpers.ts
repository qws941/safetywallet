import type { DrizzleD1Database } from "drizzle-orm/d1";
import { createLogger } from "../lib/logger";

// Drizzle D1 type gap — see https://github.com/drizzle-team/drizzle-orm/issues/2381
interface D1BatchableDb {
  batch<T extends readonly unknown[]>(
    operations: [...{ [K in keyof T]: Promise<T[K]> }],
  ): Promise<T>;
}

const D1_BATCH_LIMIT = 100;
const log = createLogger("db/helpers");

export interface BatchChunkedResult {
  totalOps: number;
  completedOps: number;
  failedChunks: number;
  errors: Array<{ chunkIndex: number; error: string }>;
}

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
): Promise<BatchChunkedResult> {
  const result: BatchChunkedResult = {
    totalOps: operations.length,
    completedOps: 0,
    failedChunks: 0,
    errors: [],
  };

  if (operations.length === 0) return result;

  const batchable = db as unknown as D1BatchableDb;
  let totalChunks = 0;

  for (let i = 0; i < operations.length; i += D1_BATCH_LIMIT) {
    totalChunks++;
    const chunk = operations.slice(i, i + D1_BATCH_LIMIT);
    const chunkIndex = Math.floor(i / D1_BATCH_LIMIT);

    try {
      await batchable.batch(chunk as [Promise<unknown>]);
      result.completedOps += chunk.length;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      result.failedChunks += 1;
      result.errors.push({ chunkIndex, error: errorMessage });

      log.error("dbBatchChunked chunk failed", {
        chunkIndex,
        chunkSize: chunk.length,
        error: errorMessage,
      });
    }
  }

  if (result.failedChunks > 0) {
    log.warn("dbBatchChunked completed with failed chunks", { ...result });
  }

  if (result.failedChunks === totalChunks) {
    throw new Error("dbBatchChunked failed: all chunks failed");
  }

  return result;
}
