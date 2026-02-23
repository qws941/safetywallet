import type { TestInfo } from "@playwright/test";

const DEFAULT_E2E_ELK_INDEX_PREFIX = "safewallet-e2e";

function getDailyIndexDate(ts: string): string {
  return ts.slice(0, 10).replace(/-/g, ".");
}

function resolveElkUrl(): string | null {
  return (
    process.env.E2E_ELASTICSEARCH_URL ?? process.env.ELASTICSEARCH_URL ?? null
  );
}

function resolveIndexPrefix(): string {
  return (
    process.env.E2E_ELASTICSEARCH_INDEX_PREFIX ??
    process.env.ELASTICSEARCH_INDEX_PREFIX ??
    DEFAULT_E2E_ELK_INDEX_PREFIX
  );
}

function resolveHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const apiKey = process.env.E2E_ELASTICSEARCH_API_KEY;
  if (apiKey) {
    headers.Authorization = `ApiKey ${apiKey}`;
  }
  return headers;
}

export interface E2eElkDocument {
  module: string;
  message: string;
  metadata: Record<string, unknown>;
}

export async function emitE2eIssueToElk(
  testInfo: TestInfo,
  doc: E2eElkDocument,
): Promise<void> {
  const elkUrl = resolveElkUrl();
  if (!elkUrl) {
    return;
  }

  const nowIso = new Date().toISOString();
  const indexDate = getDailyIndexDate(nowIso);
  const indexPrefix = resolveIndexPrefix();
  const eventId = `${doc.module}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const endpoint = `${elkUrl}/${indexPrefix}-${indexDate}/_doc/${eventId}`;

  const payload = {
    level: "warn",
    service: "safetywallet-e2e",
    module: doc.module,
    message: doc.message,
    msg: doc.message,
    timestamp: nowIso,
    "@timestamp": nowIso,
    action: "E2E_UIUX_ISSUE_LOG",
    metadata: {
      testTitle: testInfo.title,
      testFile: testInfo.file,
      projectName: testInfo.project.name,
      retry: testInfo.retry,
      ...doc.metadata,
    },
  };

  await fetch(endpoint, {
    method: "PUT",
    headers: resolveHeaders(),
    body: JSON.stringify(payload),
  }).then(
    () => undefined,
    () => undefined,
  );
}
