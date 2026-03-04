/**
 * Automatic GitHub issue creation on unhandled errors.
 *
 * - Deduplicates via KV (fingerprint = error message + endpoint, 1h TTL)
 * - Only fires for 500-level (non-HTTP) errors
 * - Non-blocking: caller wraps in `waitUntil`
 * - Labels: type:bug, auto-reported
 */

const GITHUB_OWNER = "qws941";
const GITHUB_REPO = "safetywallet";

/** KV key prefix for dedup tracking */
const KV_PREFIX = "auto-issue:";

/** Dedup window — same error+endpoint won't create a new issue within this period */
const DEDUP_TTL_SECONDS = 3600; // 1 hour

interface AutoIssueOptions {
  error: Error;
  endpoint: string;
  method: string;
  githubToken: string;
  kv: KVNamespace;
}

/**
 * Generate a stable fingerprint for dedup.
 * Uses first line of error message + endpoint to group related errors.
 */
function fingerprint(errorMessage: string, endpoint: string): string {
  const firstLine = errorMessage.split("\n")[0].slice(0, 200);
  return (
    KV_PREFIX +
    btoa(unescape(encodeURIComponent(`${endpoint}:${firstLine}`))).slice(0, 64)
  );
}

/**
 * Create a GitHub issue for an unhandled error.
 * Skips if a recent issue already exists for this error fingerprint.
 */
export async function createErrorIssue(opts: AutoIssueOptions): Promise<void> {
  const { error, endpoint, method, githubToken, kv } = opts;

  const key = fingerprint(error.message, endpoint);

  // Check dedup — skip if recently reported
  const existing = await kv.get(key);
  if (existing) return;

  const title = `[Auto] ${method} ${endpoint} — ${error.message.split("\n")[0].slice(0, 80)}`;
  const body = [
    "## 자동 에러 보고",
    "",
    `**Endpoint:** \`${method} ${endpoint}\``,
    `**Error:** \`${error.name}: ${error.message}\``,
    `**Time:** ${new Date().toISOString()}`,
    "",
    "### Stack Trace",
    "```",
    error.stack || "(no stack)",
    "```",
    "",
    "_이 이슈는 API 에러 핸들러에서 자동 생성되었습니다._",
  ].join("\n");

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "safetywallet-api",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        body,
        labels: ["type:bug", "auto-reported"],
      }),
    },
  );

  if (res.ok) {
    const issue = (await res.json()) as { number: number };
    // Store fingerprint → issue number for dedup window
    await kv.put(key, String(issue.number), {
      expirationTtl: DEDUP_TTL_SECONDS,
    });
  }
}
