import { createLogger } from "./logger";

const log = createLogger("sync-lock");

const LOCK_PREFIX = "sync:lock:";
const DEFAULT_TTL_SECONDS = 300;

export interface SyncLockResult {
  acquired: boolean;
  holder?: string;
}

/** Non-blocking lock via KV. Returns immediately — skips if already held. */
export async function acquireSyncLock(
  kv: KVNamespace,
  lockName: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<SyncLockResult> {
  const key = `${LOCK_PREFIX}${lockName}`;
  const existing = await kv.get(key);

  if (existing) {
    log.info("Sync lock already held", { lockName, holder: existing });
    return { acquired: false, holder: existing };
  }

  const holder = `${lockName}-${Date.now()}`;
  await kv.put(key, holder, { expirationTtl: ttlSeconds });

  return { acquired: true, holder };
}

export async function releaseSyncLock(
  kv: KVNamespace,
  lockName: string,
): Promise<void> {
  const key = `${LOCK_PREFIX}${lockName}`;
  try {
    await kv.delete(key);
  } catch {
    log.error("Failed to release sync lock", { lockName });
  }
}
