import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Env, AuthContext } from "../../types";
import { success, error } from "../../lib/response";
import { requireAdmin } from "./helpers";

const app = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

const GITHUB_OWNER = "qws941";
const GITHUB_REPO = "safetywallet";

function toStatusCode(status: number): ContentfulStatusCode {
  if (status >= 400 && status <= 599) {
    return status as ContentfulStatusCode;
  }
  return 502;
}

function getGitHubErrorMessage(raw: string, fallback: string): string {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as { message?: unknown };
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
  } catch {}
  return raw.slice(0, 300);
}

/** GET /issues — list GitHub issues */
app.get("/issues", requireAdmin, async (c) => {
  const token = c.env.GITHUB_TOKEN;

  const state = c.req.query("state") || "open";
  const labels = c.req.query("labels") || "";
  const page = c.req.query("page") || "1";
  const perPage = c.req.query("per_page") || "30";

  const url = new URL(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
  );
  url.searchParams.set("state", state);
  url.searchParams.set("page", page);
  url.searchParams.set("per_page", perPage);
  url.searchParams.set("sort", "created");
  url.searchParams.set("direction", "desc");
  if (labels) url.searchParams.set("labels", labels);

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "safetywallet-admin",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
      const errText = await res.text();
      const message = getGitHubErrorMessage(
        errText,
        "GitHub issues API request failed",
      );
      return error(c, "GITHUB_ERROR", message, toStatusCode(res.status));
    }

    const allItems = (await res.json()) as Record<string, unknown>[];
    // GitHub Issues API returns both issues and PRs — filter out PRs
    const issues = allItems.filter((item) => !item.pull_request);
    return success(c, issues);
  } catch {
    return error(
      c,
      "GITHUB_UPSTREAM_UNAVAILABLE",
      "Failed to reach GitHub API",
      502,
    );
  }
});

/** POST /issues — create GitHub issue with optional codex assignment */
app.post("/issues", requireAdmin, async (c) => {
  const token = c.env.GITHUB_TOKEN;
  if (!token) {
    return error(c, "MISSING_TOKEN", "GITHUB_TOKEN not configured", 503);
  }

  let body: {
    title: string;
    body?: string;
    labels?: string[];
    assignCodex?: boolean;
  };

  try {
    body = await c.req.json<{
      title: string;
      body?: string;
      labels?: string[];
      assignCodex?: boolean;
    }>();
  } catch {
    return error(c, "INVALID_JSON", "Request body must be valid JSON", 400);
  }

  if (!body.title?.trim()) {
    return error(c, "INVALID_INPUT", "title is required");
  }

  const labels = body.labels || [];
  if (body.assignCodex && !labels.includes("codex")) {
    labels.push("codex");
  }

  try {
    // Create issue
    const createRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "safetywallet-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: body.title.trim(),
          body: body.body?.trim() || "",
          labels,
        }),
      },
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      const message = getGitHubErrorMessage(
        errText,
        "GitHub issue creation failed",
      );
      return error(c, "GITHUB_ERROR", message, toStatusCode(createRes.status));
    }

    const issue = (await createRes.json()) as {
      number: number;
      node_id: string;
      title: string;
      body: string;
    };

    // If codex assigned, assign Codex user + post @codex comment
    if (body.assignCodex) {
      // Assign Codex via GraphQL (REST API silently ignores bot assignees)
      try {
        await fetch("https://api.github.com/graphql", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": "safetywallet-admin",
          },
          body: JSON.stringify({
            query: `mutation($assignableId: ID!, $assigneeIds: [ID!]!) {
            addAssigneesToAssignable(input: { assignableId: $assignableId, assigneeIds: $assigneeIds }) {
              assignable { ... on Issue { number } }
            }
          }`,
            variables: {
              assignableId: issue.node_id,
              assigneeIds: ["BOT_kgDODnSAjQ"],
            },
          }),
        });
      } catch {
        // Bot assignee may fail — non-blocking
      }

      // Post @codex comment so Codex agent picks it up
      const commentBody = [`@codex ${issue.title}`, "", issue.body || ""]
        .join("\n")
        .trim();

      try {
        await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issue.number}/comments`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
              "User-Agent": "safetywallet-admin",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ body: commentBody }),
          },
        );
      } catch {}
    }

    return success(c, issue, 201);
  } catch {
    return error(
      c,
      "GITHUB_UPSTREAM_UNAVAILABLE",
      "Failed to reach GitHub API",
      502,
    );
  }
});

export default app;
