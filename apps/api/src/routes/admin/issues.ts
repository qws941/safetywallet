import { Hono } from "hono";
import type { Env, AuthContext } from "../../types";
import { requireAdmin } from "./helpers";

const app = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

const GITHUB_OWNER = "qws941";
const GITHUB_REPO = "safetywallet";

/** GET /admin/issues — list GitHub issues */
app.get("/admin/issues", requireAdmin, async (c) => {
  const token = c.env.GITHUB_TOKEN;
  if (!token) {
    return c.json(
      {
        success: false,
        code: "MISSING_TOKEN",
        message: "GITHUB_TOKEN not configured",
      },
      500,
    );
  }

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

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "safetywallet-admin",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    return c.json(
      { success: false, code: "GITHUB_ERROR", message: err },
      res.status as 400,
    );
  }

  const issues = await res.json();
  return c.json({ success: true, data: issues });
});

/** POST /admin/issues — create GitHub issue with optional codex assignment */
app.post("/admin/issues", requireAdmin, async (c) => {
  const token = c.env.GITHUB_TOKEN;
  if (!token) {
    return c.json(
      {
        success: false,
        code: "MISSING_TOKEN",
        message: "GITHUB_TOKEN not configured",
      },
      500,
    );
  }

  const body = await c.req.json<{
    title: string;
    body?: string;
    labels?: string[];
    assignCodex?: boolean;
  }>();

  if (!body.title?.trim()) {
    return c.json(
      { success: false, code: "INVALID_INPUT", message: "title is required" },
      400,
    );
  }

  const labels = body.labels || [];
  if (body.assignCodex && !labels.includes("codex")) {
    labels.push("codex");
  }

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
    const err = await createRes.text();
    return c.json(
      { success: false, code: "GITHUB_ERROR", message: err },
      createRes.status as 400,
    );
  }

  const issue = (await createRes.json()) as {
    number: number;
    title: string;
    body: string;
  };

  // If codex assigned, assign Codex user + post @codex comment
  if (body.assignCodex) {
    // Assign Codex (bot type — may fail, non-blocking)
    try {
      await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issue.number}/assignees`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "safetywallet-admin",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ assignees: ["Codex"] }),
        },
      );
    } catch {
      // Bot assignee may fail — non-blocking
    }

    // Post @codex comment so Codex agent picks it up
    const commentBody = [`@codex ${issue.title}`, "", issue.body || ""]
      .join("\n")
      .trim();

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
  }

  return c.json({ success: true, data: issue }, 201);
});

export default app;
