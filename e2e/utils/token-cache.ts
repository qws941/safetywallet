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
export async function acquireLock(): Promise<void> {
  let attempts = 0;
  while (attempts < 50) {
    // wait up to 5 seconds
    try {
      fs.writeFileSync(LOCK_PATH, String(process.pid), { flag: "wx" });
      return;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "EEXIST") {
        attempts++;
        await new Promise((r) => setTimeout(r, 100));
      } else {
        throw e;
      }
    }
  }
  console.warn("[token-cache] Failed to acquire lock, proceeding anyway...");
}

export function releaseLock() {
  try {
    if (fs.existsSync(LOCK_PATH)) {
      fs.unlinkSync(LOCK_PATH);
    }
  } catch (e) {
    console.warn("[token-cache] releaseLock failed:", (e as Error).message);
  }
}
