import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import type { Env, AuthContext } from "../../types";
import { success, error } from "../../lib/response";
import { actions, actionImages, posts, siteMemberships } from "../../db/schema";
import { analyzeActionImage } from "../../lib/gemini-ai";

const app = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

app.post("/:id/images", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const actionId = c.req.param("id");

  const action = await db
    .select()
    .from(actions)
    .where(eq(actions.id, actionId))
    .get();

  if (!action) {
    return error(c, "ACTION_NOT_FOUND", "Action not found", 404);
  }

  const post = await db
    .select()
    .from(posts)
    .where(eq(posts.id, action.postId))
    .get();

  if (!post) {
    return error(c, "POST_NOT_FOUND", "Associated post not found", 404);
  }

  const isAssignee = action.assigneeId === user.id;

  if (!isAssignee) {
    const membership = await db
      .select()
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.userId, user.id),
          eq(siteMemberships.siteId, post.siteId),
          eq(siteMemberships.status, "ACTIVE"),
        ),
      )
      .get();

    if (!membership || membership.role === "WORKER") {
      return error(c, "UNAUTHORIZED", "Not authorized", 403);
    }
  }

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  const imageType = formData.get("imageType") as string | null;

  if (!file) {
    return error(c, "NO_FILE", "No file provided", 400);
  }

  if (imageType && imageType !== "BEFORE" && imageType !== "AFTER") {
    return error(
      c,
      "INVALID_IMAGE_TYPE",
      "imageType must be BEFORE or AFTER",
      400,
    );
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return error(c, "INVALID_FILE_TYPE", "Invalid file type", 400);
  }

  const ext = file.name.split(".").pop() || "jpg";
  const key = `actions/${actionId}/${crypto.randomUUID()}.${ext}`;

  await c.env.R2.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const inserted = await db
    .insert(actionImages)
    .values({
      actionId,
      fileUrl: key,
      imageType: (imageType as "BEFORE" | "AFTER") ?? null,
    })
    .returning()
    .get();

  const geminiApiKey = c.env.GEMINI_API_KEY;
  if (geminiApiKey && file) {
    const mimeType = file.type || "image/jpeg";
    c.executionCtx.waitUntil(
      (async () => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
          }
          const base64 = btoa(binary);

          const result = await analyzeActionImage(
            geminiApiKey,
            base64,
            mimeType,
          );

          if (result) {
            await db
              .update(actionImages)
              .set({
                aiAnalysis: JSON.stringify(result),
                aiAnalyzedAt: new Date().toISOString(),
              })
              .where(eq(actionImages.id, inserted.id));
          }
        } catch (e) {
          console.error("Action image AI analysis failed:", e);
        }
      })(),
    );
  }

  return success(c, { image: inserted }, 201);
});

app.post("/:id/images/:imageId/analyze", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const actionId = c.req.param("id");
  const imageId = c.req.param("imageId");

  if (!c.env.GEMINI_API_KEY) {
    return error(c, "AI_NOT_CONFIGURED", "Gemini API key not configured", 503);
  }

  const action = await db
    .select()
    .from(actions)
    .where(eq(actions.id, actionId))
    .get();

  if (!action) {
    return error(c, "ACTION_NOT_FOUND", "Action not found", 404);
  }

  const post = await db
    .select()
    .from(posts)
    .where(eq(posts.id, action.postId))
    .get();

  if (!post) {
    return error(c, "POST_NOT_FOUND", "Associated post not found", 404);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, post.siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();

  if (
    (!membership || membership.role === "WORKER") &&
    user.role !== "SUPER_ADMIN"
  ) {
    return error(c, "UNAUTHORIZED", "Not authorized", 403);
  }

  const image = await db
    .select()
    .from(actionImages)
    .where(
      and(eq(actionImages.id, imageId), eq(actionImages.actionId, actionId)),
    )
    .get();

  if (!image) {
    return error(c, "IMAGE_NOT_FOUND", "Image not found", 404);
  }

  const object = await c.env.R2.get(image.fileUrl);
  if (!object) {
    return error(c, "IMAGE_FILE_NOT_FOUND", "Image file not found", 404);
  }

  const arrayBuffer = await object.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const base64 = btoa(binary);
  const mimeType = object.httpMetadata?.contentType ?? "image/jpeg";

  const result = await analyzeActionImage(
    c.env.GEMINI_API_KEY,
    base64,
    mimeType,
  );

  if (!result) {
    return error(c, "AI_ANALYSIS_FAILED", "AI 분석에 실패했습니다", 500);
  }

  const analyzedAt = new Date().toISOString();
  await db
    .update(actionImages)
    .set({
      aiAnalysis: JSON.stringify(result),
      aiAnalyzedAt: analyzedAt,
    })
    .where(eq(actionImages.id, image.id));

  return success(c, { aiAnalysis: result, aiAnalyzedAt: analyzedAt });
});

app.get("/:id/images/:imageId/ai-analysis", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const actionId = c.req.param("id");
  const imageId = c.req.param("imageId");

  const action = await db
    .select()
    .from(actions)
    .where(eq(actions.id, actionId))
    .get();

  if (!action) {
    return error(c, "ACTION_NOT_FOUND", "Action not found", 404);
  }

  const post = await db
    .select()
    .from(posts)
    .where(eq(posts.id, action.postId))
    .get();

  if (!post) {
    return error(c, "POST_NOT_FOUND", "Associated post not found", 404);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, post.siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();

  if (
    (!membership || membership.role === "WORKER") &&
    user.role !== "SUPER_ADMIN"
  ) {
    return error(c, "UNAUTHORIZED", "Not authorized", 403);
  }

  const image = await db
    .select()
    .from(actionImages)
    .where(
      and(eq(actionImages.id, imageId), eq(actionImages.actionId, actionId)),
    )
    .get();

  if (!image) {
    return error(c, "IMAGE_NOT_FOUND", "Image not found", 404);
  }

  if (!image.aiAnalysis) {
    return success(c, { aiAnalysis: null, aiAnalyzedAt: null });
  }

  try {
    return success(c, {
      aiAnalysis: JSON.parse(image.aiAnalysis),
      aiAnalyzedAt: image.aiAnalyzedAt ?? null,
    });
  } catch {
    return success(c, {
      aiAnalysis: null,
      aiAnalyzedAt: image.aiAnalyzedAt ?? null,
    });
  }
});

app.delete("/:id/images/:imageId", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const actionId = c.req.param("id");
  const imageId = c.req.param("imageId");

  const action = await db
    .select()
    .from(actions)
    .where(eq(actions.id, actionId))
    .get();

  if (!action) {
    return error(c, "ACTION_NOT_FOUND", "Action not found", 404);
  }

  const post = await db
    .select()
    .from(posts)
    .where(eq(posts.id, action.postId))
    .get();

  if (!post) {
    return error(c, "POST_NOT_FOUND", "Associated post not found", 404);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, post.siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();

  if (!membership || membership.role === "WORKER") {
    return error(c, "UNAUTHORIZED", "Not authorized", 403);
  }

  const image = await db
    .select()
    .from(actionImages)
    .where(
      and(eq(actionImages.id, imageId), eq(actionImages.actionId, actionId)),
    )
    .get();

  if (!image) {
    return error(c, "IMAGE_NOT_FOUND", "Image not found", 404);
  }

  await c.env.R2.delete(image.fileUrl);
  await db.delete(actionImages).where(eq(actionImages.id, imageId));

  return success(c, null);
});

export default app;
