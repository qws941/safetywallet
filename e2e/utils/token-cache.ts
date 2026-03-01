import * as fs from "fs";
import * as path from "path";

const CACHE_PATH = path.resolve(__dirname, "../.auth-cache.json");
const LOCK_PATH = path.resolve(__dirname, "../.auth-cache.lock");

export function getCachedToken(key: string): string | undefined {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const data = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
      return data[key];
    }
  } catch (e) {
    console.warn("[token-cache] getCachedToken failed:", (e as Error).message);
  }
  return undefined;
}

export function setCachedToken(key: string, token: string) {
  try {
    let data: Record<string, string> = {};
    if (fs.existsSync(CACHE_PATH)) {
      try {
        data = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
      } catch (parseErr) {
        console.warn(
          "[token-cache] parse existing cache failed:",
          (parseErr as Error).message,
        );
      }
    }
    data[key] = token;
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn("[token-cache] setCachedToken failed:", (e as Error).message);
  }
}

// Simple file-based lock to prevent race conditions during parallel worker startup
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function tryCleanStaleLock(): boolean {
  try {
    const content = fs.readFileSync(LOCK_PATH, "utf8");
    const pid = parseInt(content, 10);
    if (!Number.isNaN(pid) && !isProcessAlive(pid)) {
      try {
        fs.unlinkSync(LOCK_PATH);
      } catch {
        // another process beat us to it
      }
      return true;
    }
  } catch {
    // lock file disappeared between check and read — that's fine
  }
  return false;
}

export async function acquireLock(): Promise<void> {
  let attempts = 0;
  while (attempts < 50) {
    // wait up to 5 seconds
    try {
      fs.writeFileSync(LOCK_PATH, String(process.pid), { flag: "wx" });
      return;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "EEXIST") {
        // On first collision, try to clean stale locks from crashed processes
        if (attempts === 0 && tryCleanStaleLock()) {
          continue;
        }
        attempts++;
        await new Promise((r) => setTimeout(r, 100));
      } else {
        throw e;
      }
    }
  }
  throw new Error(
    "[token-cache] Failed to acquire lock after 5s — another process may be stuck",
  );
}
export function releaseLock() {
  try {
    fs.unlinkSync(LOCK_PATH);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("[token-cache] releaseLock failed:", (e as Error).message);
    }
  }
}
