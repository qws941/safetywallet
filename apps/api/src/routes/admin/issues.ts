import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { parse } from "yaml";
import type { Env, AuthContext } from "../../types";
import { success, error } from "../../lib/response";
import { sanitizeErrorMessage } from "../../lib/error-sanitizer";
import { requireAdmin } from "./helpers";
import { createLogger } from "../../lib/logger";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();
const logger = createLogger("admin/issues");

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
  let candidate = fallback;

  try {
    const parsed = JSON.parse(raw) as { message?: unknown };
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      candidate = parsed.message.trim();
    }
  } catch (error) {
    logger.warn("Failed to parse GitHub error JSON", {
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { name: "UnknownError", message: String(error) },
    });
    candidate = raw.slice(0, 300);
  }

  const sanitized = sanitizeErrorMessage(candidate);
  return sanitized || fallback;
}

/* ------------------------------------------------------------------ */
/*  Issue template types                                               */
/* ------------------------------------------------------------------ */

interface TemplateField {
  id: string;
  type: "textarea" | "dropdown";
  label: string;
  description?: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
}

interface ParsedTemplate {
  slug: string;
  name: string;
  description: string;
  labels: string[];
  fields: TemplateField[];
}

interface YamlBodyEntry {
  type?: string;
  id?: string;
  attributes?: {
    label?: string;
    description?: string;
    placeholder?: string;
    options?: string[];
  };
  validations?: {
    required?: boolean;
  };
}

interface YamlTemplate {
  name?: string;
  description?: string;
  labels?: string[];
  body?: YamlBodyEntry[];
}

const TEMPLATE_FILES = ["bug_report.yml", "feature_request.yml", "task.yml"];
const KV_CACHE_KEY = "github:issue-templates";
const KV_CACHE_TTL = 3600;

/** GET /issues/templates — fetch and parse GitHub issue templates */
app.get("/issues/templates", requireAdmin, async (c) => {
  const token = c.env.GITHUB_TOKEN;
  const kv = c.env.KV;

  // Check KV cache first
  if (kv) {
    try {
      const cached = await kv.get(KV_CACHE_KEY, "json");
      if (cached) return success(c, cached);
    } catch (error) {
      logger.error("Failed to read KV cache for issue templates", error);
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "safetywallet-admin",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const templates: ParsedTemplate[] = [];

    for (const file of TEMPLATE_FILES) {
      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/.github/ISSUE_TEMPLATE/${file}`;
      const res = await fetch(url, { headers });

      if (!res.ok) continue;

      const data = (await res.json()) as { content?: string };
      if (!data.content) continue;

      const decoded = atob(data.content.replace(/\n/g, ""));
      const yml = parse(decoded) as YamlTemplate;

      if (!yml?.name || !yml?.body) continue;

      const slug = file.replace(/\.yml$/, "");
      const fields: TemplateField[] = [];

      for (const entry of yml.body) {
        if (entry.type !== "textarea" && entry.type !== "dropdown") continue;
        if (!entry.id || !entry.attributes?.label) continue;

        fields.push({
          id: entry.id,
          type: entry.type as "textarea" | "dropdown",
          label: entry.attributes.label,
          description: entry.attributes.description,
          placeholder: entry.attributes.placeholder,
          options: entry.attributes.options,
          required: entry.validations?.required ?? false,
        });
      }

      templates.push({
        slug,
        name: yml.name,
        description: yml.description || "",
        labels: yml.labels || [],
        fields,
      });
    }

    // Cache in KV
    if (kv && templates.length > 0) {
      try {
        await kv.put(KV_CACHE_KEY, JSON.stringify(templates), {
          expirationTtl: KV_CACHE_TTL,
        });
      } catch (error) {
        logger.error("Failed to write KV cache for issue templates", error);
      }
    }

    return success(c, templates);
  } catch {
    return error(
      c,
      "GITHUB_UPSTREAM_UNAVAILABLE",
      "Failed to fetch issue templates from GitHub",
      502,
    );
  }
});

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
app.post(
  "/issues",
  requireAdmin,
  zValidator(
    "json",
    z.object({
      title: z.string().min(1),
      body: z.string().optional(),
      labels: z.array(z.string()).optional(),
      assignCodex: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const token = c.env.GITHUB_TOKEN;
    if (!token) {
      return error(c, "MISSING_TOKEN", "GITHUB_TOKEN not configured", 503);
    }

    const body = c.req.valid("json");

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
        return error(
          c,
          "GITHUB_ERROR",
          message,
          toStatusCode(createRes.status),
        );
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
        } catch (error) {
          // Bot assignee may fail — non-blocking
          logger.warn("Failed to assign Codex bot via GraphQL", {
            error:
              error instanceof Error
                ? { name: error.name, message: error.message }
                : { name: "UnknownError", message: String(error) },
          });
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
        } catch (error) {
          logger.error("Failed to post @codex comment", error);
        }
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
  },
);

export default app;
