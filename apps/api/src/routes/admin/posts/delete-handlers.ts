import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import {
  posts,
  postImages,
  reviews,
  pointsLedger,
  auditLogs,
  actions,
  actionImages,
} from "../../../db/schema";
import { success, error } from "../../../lib/response";
import { createLogger } from "../../../lib/logger";
import {
  AdminEmergencyDeleteSchema,
  AdminEmergencyActionPurgeSchema,
  AdminDeletePostSchema,
} from "../../../validators/schemas";
import { AppContext } from "../helpers";
import { dbBatchChunked } from "../../../db/helpers";

const logger = createLogger("admin/posts");

export async function deletePostHandler(c: AppContext) {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const postId = c.req.param("id");
  const body = c.req.valid("json" as never) as z.infer<
    typeof AdminDeletePostSchema
  >;

  const post = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, postId))
    .get();

  if (!post) {
    return error(c, "POST_NOT_FOUND", "Post not found", 404);
  }

  const [images] = await Promise.all([
    db
      .select({ fileUrl: postImages.fileUrl })
      .from(postImages)
      .where(eq(postImages.postId, postId))
      .all(),
    db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.postId, postId))
      .all(),
    db
      .select({ id: pointsLedger.id })
      .from(pointsLedger)
      .where(eq(pointsLedger.postId, postId))
      .all(),
  ]);

  for (const image of images) {
    try {
      await c.env.R2.delete(image.fileUrl);
    } catch (e) {
      logger.error("Failed to delete R2 image", {
        fileUrl: image.fileUrl,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const ops = [
    db.delete(postImages).where(eq(postImages.postId, postId)),
    db.delete(reviews).where(eq(reviews.postId, postId)),
    db.delete(pointsLedger).where(eq(pointsLedger.postId, postId)),
    db.delete(posts).where(eq(posts.id, postId)),
  ];

  try {
    await dbBatchChunked(db, ops as Promise<unknown>[]);
  } catch (e) {
    logger.error("Admin post delete batch failed", {
      postId,
      operationCount: ops.length,
      error: e instanceof Error ? e.message : String(e),
    });
    return error(c, "INTERNAL_ERROR", "Post delete failed", 500);
  }

  await db.insert(auditLogs).values({
    action: "POST_DELETED",
    actorId: user.id,
    targetType: "POST",
    targetId: postId,
    reason: body.reason,
  });

  return success(c, { deleted: true, postId });
}

export async function emergencyPurgePostHandler(c: AppContext) {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const postId = c.req.param("id");
  const body = c.req.valid("json" as never) as z.infer<
    typeof AdminEmergencyDeleteSchema
  >;

  if (user.role !== "SUPER_ADMIN") {
    return error(
      c,
      "FORBIDDEN",
      "Only SUPER_ADMIN can perform emergency purge",
      403,
    );
  }

  if (body.confirmPostId !== postId) {
    return error(
      c,
      "CONFIRMATION_FAILED",
      "Confirmation post ID mismatch",
      400,
    );
  }

  const post = await db.select().from(posts).where(eq(posts.id, postId)).get();

  if (!post) {
    return error(c, "POST_NOT_FOUND", "Post not found", 404);
  }

  const [images, reviewsList, points] = await Promise.all([
    db.select().from(postImages).where(eq(postImages.postId, postId)).all(),
    db.select().from(reviews).where(eq(reviews.postId, postId)).all(),
    db.select().from(pointsLedger).where(eq(pointsLedger.postId, postId)).all(),
  ]);

  for (const image of images) {
    try {
      await c.env.R2.delete(image.fileUrl);
    } catch (e) {
      logger.error("Failed to delete R2 image", {
        fileUrl: image.fileUrl,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const ops = [
    db.delete(postImages).where(eq(postImages.postId, postId)),
    db.delete(reviews).where(eq(reviews.postId, postId)),
    db.delete(pointsLedger).where(eq(pointsLedger.postId, postId)),
    db.delete(posts).where(eq(posts.id, postId)),
  ];

  try {
    await dbBatchChunked(db, ops as Promise<unknown>[]);
  } catch (e) {
    logger.error("Emergency post purge batch failed", {
      postId,
      operationCount: ops.length,
      error: e instanceof Error ? e.message : String(e),
    });
    return error(c, "INTERNAL_ERROR", "Emergency purge failed", 500);
  }

  await db.insert(auditLogs).values({
    action: "EMERGENCY_DELETE",
    actorId: user.id,
    targetType: "POST",
    targetId: postId,
    reason: body.reason,
  });

  return success(c, {
    deleted: true,
    purgedImages: images.length,
    purgedReviews: reviewsList.length,
    purgedPoints: points.length,
  });
}

export async function emergencyPurgeActionHandler(c: AppContext) {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const actionId = c.req.param("id");
  const body = c.req.valid("json" as never) as z.infer<
    typeof AdminEmergencyActionPurgeSchema
  >;

  if (user.role !== "SUPER_ADMIN") {
    return error(
      c,
      "FORBIDDEN",
      "Only SUPER_ADMIN can perform emergency action purge",
      403,
    );
  }

  if (body.confirmActionId !== actionId) {
    return error(
      c,
      "CONFIRMATION_FAILED",
      "Confirmation action ID mismatch",
      400,
    );
  }

  const action = await db
    .select({ id: actions.id, postId: actions.postId })
    .from(actions)
    .where(eq(actions.id, actionId))
    .get();

  if (!action) {
    return error(c, "ACTION_NOT_FOUND", "Action not found", 404);
  }

  const images = await db
    .select({ fileUrl: actionImages.fileUrl })
    .from(actionImages)
    .where(eq(actionImages.actionId, actionId))
    .all();

  for (const image of images) {
    try {
      await c.env.R2.delete(image.fileUrl);
    } catch (e) {
      logger.error("Failed to delete R2 action image", {
        fileUrl: image.fileUrl,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  await db.delete(actionImages).where(eq(actionImages.actionId, actionId));
  await db.delete(actions).where(eq(actions.id, actionId));

  await db.insert(auditLogs).values({
    action: "EMERGENCY_DELETE",
    actorId: user.id,
    targetType: "ACTION",
    targetId: actionId,
    reason: body.reason,
  });

  return success(c, {
    deleted: true,
    purgedImages: images.length,
  });
}
