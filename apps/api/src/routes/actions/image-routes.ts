import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import type { Env, AuthContext } from "../../types";
import { success, error } from "../../lib/response";
import { actions, actionImages, posts, siteMemberships } from "../../db/schema";

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

  const imageRecord = await db
    .insert(actionImages)
    .values({
      actionId,
      fileUrl: key,
      imageType: (imageType as "BEFORE" | "AFTER") ?? null,
    })
    .returning()
    .get();

  return success(c, { image: imageRecord }, 201);
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
