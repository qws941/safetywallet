import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc } from "drizzle-orm";
import type { Env, AuthContext } from "../../types";
import { success, error } from "../../lib/response";
import { actions, actionImages, posts, siteMemberships } from "../../db/schema";
import {
  analyzeActionImage,
  compareBeforeAfterImages,
  getGcpCredentials,
} from "../../lib/gemini-ai";
import { createLogger } from "../../lib/logger";

const logger = createLogger("image-routes");

const app = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

function extractR2Key(fileUrl: string): string {
  if (!fileUrl) {
    return "";
  }

  return fileUrl
    .replace(/^.*\/files\//, "")
    .replace(/^.*\/r2\//, "")
    .replace(/^\/?r2\//, "");
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

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

  const shouldAutoCompare = imageType === "AFTER";
  const beforeImageForComparison = shouldAutoCompare
    ? await db
        .select()
        .from(actionImages)
        .where(
          and(
            eq(actionImages.actionId, actionId),
            eq(actionImages.imageType, "BEFORE"),
          ),
        )
        .orderBy(desc(actionImages.createdAt))
        .limit(1)
        .get()
    : null;

  const gcpCreds = getGcpCredentials(c.env);
  if (gcpCreds && file) {
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

          const result = await analyzeActionImage(gcpCreds, base64, mimeType);

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
          logger.error(
            "Action image AI analysis failed:",
            e instanceof Error ? e : undefined,
          );
        }
      })(),
    );
  }

  if (gcpCreds && shouldAutoCompare && beforeImageForComparison) {
    c.executionCtx.waitUntil(
      (async () => {
        try {
          const beforeKey = extractR2Key(beforeImageForComparison.fileUrl);
          const afterKey = extractR2Key(inserted.fileUrl);
          if (!beforeKey || !afterKey) {
            return;
          }

          const [beforeObject, afterObject] = await Promise.all([
            c.env.R2.get(beforeKey),
            c.env.R2.get(afterKey),
          ]);

          if (!beforeObject || !afterObject) {
            return;
          }

          const [beforeBuffer, afterBuffer] = await Promise.all([
            beforeObject.arrayBuffer(),
            afterObject.arrayBuffer(),
          ]);

          const beforeBase64 = arrayBufferToBase64(beforeBuffer);
          const afterBase64 = arrayBufferToBase64(afterBuffer);
          const mimeType =
            afterObject.httpMetadata?.contentType ||
            beforeObject.httpMetadata?.contentType ||
            "image/jpeg";

          const comparison = await compareBeforeAfterImages(
            gcpCreds,
            beforeBase64,
            afterBase64,
            mimeType,
            action.description ?? undefined,
          );

          if (!comparison) {
            return;
          }

          await db
            .update(actions)
            .set({
              aiComparison: JSON.stringify(comparison),
              aiComparedAt: new Date().toISOString(),
            })
            .where(eq(actions.id, actionId));
        } catch (e) {
          logger.error(
            "Action before/after comparison auto-trigger failed:",
            e instanceof Error ? e : undefined,
          );
        }
      })(),
    );
  }

  return success(c, { image: inserted }, 201);
});

app.post("/:id/compare-images", async (c) => {
  const { user } = c.get("auth");
  if (user.role !== "SUPER_ADMIN" && user.role !== "SITE_ADMIN") {
    return error(c, "FORBIDDEN", "Admin access required", 403);
  }

  const db = drizzle(c.env.DB);
  const actionId = c.req.param("id");

  const credentials = getGcpCredentials(c.env);
  if (!credentials) {
    return error(c, "AI_NOT_CONFIGURED", "AI service not configured", 503);
  }

  const action = await db
    .select()
    .from(actions)
    .where(eq(actions.id, actionId))
    .get();
  if (!action) {
    return error(c, "ACTION_NOT_FOUND", "Action not found", 404);
  }

  const beforeImage = await db
    .select()
    .from(actionImages)
    .where(
      and(
        eq(actionImages.actionId, actionId),
        eq(actionImages.imageType, "BEFORE"),
      ),
    )
    .orderBy(desc(actionImages.createdAt))
    .limit(1)
    .get();

  const afterImage = await db
    .select()
    .from(actionImages)
    .where(
      and(
        eq(actionImages.actionId, actionId),
        eq(actionImages.imageType, "AFTER"),
      ),
    )
    .orderBy(desc(actionImages.createdAt))
    .limit(1)
    .get();

  if (!beforeImage || !afterImage) {
    return error(
      c,
      "MISSING_BEFORE_AFTER_IMAGES",
      "BEFORE와 AFTER 이미지가 모두 필요합니다",
      400,
    );
  }

  const beforeKey = extractR2Key(beforeImage.fileUrl);
  const afterKey = extractR2Key(afterImage.fileUrl);
  if (!beforeKey || !afterKey) {
    return error(
      c,
      "INVALID_IMAGE_KEY",
      "유효하지 않은 이미지 경로입니다",
      400,
    );
  }

  const [beforeObject, afterObject] = await Promise.all([
    c.env.R2.get(beforeKey),
    c.env.R2.get(afterKey),
  ]);

  if (!beforeObject || !afterObject) {
    return error(c, "IMAGE_FILE_NOT_FOUND", "Image file not found", 404);
  }

  const [beforeBuffer, afterBuffer] = await Promise.all([
    beforeObject.arrayBuffer(),
    afterObject.arrayBuffer(),
  ]);

  const comparison = await compareBeforeAfterImages(
    credentials,
    arrayBufferToBase64(beforeBuffer),
    arrayBufferToBase64(afterBuffer),
    afterObject.httpMetadata?.contentType ||
      beforeObject.httpMetadata?.contentType ||
      "image/jpeg",
    action.description ?? undefined,
  );

  if (!comparison) {
    return error(c, "AI_COMPARISON_FAILED", "AI 비교 분석에 실패했습니다", 500);
  }

  const comparedAt = new Date().toISOString();
  await db
    .update(actions)
    .set({
      aiComparison: JSON.stringify(comparison),
      aiComparedAt: comparedAt,
    })
    .where(eq(actions.id, actionId));

  return success(c, { comparison, comparedAt });
});

app.get("/:id/comparison", async (c) => {
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
  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "SITE_ADMIN";

  if (!isAssignee && !isAdmin) {
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

  if (!action.aiComparison) {
    return success(c, { comparison: null, comparedAt: null });
  }

  try {
    return success(c, {
      comparison: JSON.parse(action.aiComparison),
      comparedAt: action.aiComparedAt ?? null,
    });
  } catch {
    return success(c, {
      comparison: null,
      comparedAt: action.aiComparedAt ?? null,
    });
  }
});

app.post("/:id/images/:imageId/analyze", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const actionId = c.req.param("id");
  const imageId = c.req.param("imageId");

  const gcpCreds = getGcpCredentials(c.env);
  if (!gcpCreds) {
    return error(
      c,
      "AI_NOT_CONFIGURED",
      "Vertex AI credentials not configured",
      503,
    );
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

  const result = await analyzeActionImage(gcpCreds, base64, mimeType);

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
