export function parseRetryAfterSeconds(
  value: string | null | undefined,
): number {
  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function parseResetEpochSeconds(
  value: string | null | undefined,
): number {
  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function computeRateLimitWaitMs(
  retryAfterSeconds: number,
  resetEpochSeconds: number,
  fallbackMs: number,
): number {
  if (resetEpochSeconds > 0) {
    return Math.max(0, resetEpochSeconds * 1000 - Date.now());
  }
  if (retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }
  return fallbackMs;
}
