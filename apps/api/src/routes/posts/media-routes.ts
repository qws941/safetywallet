import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { eq, sql } from "drizzle-orm";
import { attendanceMiddleware } from "../../middleware/attendance";
import { success, error } from "../../lib/response";
import { logAuditWithContext } from "../../lib/audit";
import { canResubmit } from "../../lib/state-machine";
import { ResubmitPostSchema } from "../../validators/schemas";
import { posts, postImages, reviews, pointsLedger } from "../../db/schema";
import { validateJson, type PostsRouteApp } from "./helpers";

export const registerMediaRoutes = (app: PostsRouteApp): void => {
  app.post("/:id/images", async (c) => {
    await attendanceMiddleware(c, async () => {});
    const db = drizzle(c.env.DB);
    const { user } = c.get("auth");
    const postId = c.req.param("id");

    const post = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .get();

    if (!post) {
      return error(c, "POST_NOT_FOUND", "Post not found", 404);
    }

    if (post.userId !== user.id) {
      return error(
        c,
        "UNAUTHORIZED",
        "Not authorized to add images to this post",
        403,
      );
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return error(c, "NO_FILE", "No file provided", 400);
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ];
    if (!allowedTypes.includes(file.type)) {
      return error(c, "INVALID_FILE_TYPE", "Invalid file type", 400);
    }

    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return error(
        c,
        "FILE_TOO_LARGE",
        `File too large (max ${isVideo ? "50MB" : "10MB"})`,
        400,
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const key = `posts/${postId}/${crypto.randomUUID()}.${ext}`;

    await c.env.R2.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const imageRecord = await db
      .insert(postImages)
      .values({
        postId,
        fileUrl: key,
        mediaType: isVideo ? "video" : "image",
      })
      .returning()
      .get();

    return success(c, { image: imageRecord }, 201);
  });

  app.post(
    "/:id/resubmit",
    validateJson("json", ResubmitPostSchema),
    async (c) => {
      const db = drizzle(c.env.DB);
      const { user } = c.get("auth");
      const postId = c.req.param("id");
      const { supplementaryContent } = c.req.valid("json" as never) as z.infer<
        typeof ResubmitPostSchema
      >;

      const post = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .get();

      if (!post) {
        return error(c, "POST_NOT_FOUND", "Post not found", 404);
      }

      if (post.userId !== user.id) {
        return error(
          c,
          "UNAUTHORIZED",
          "Not authorized to resubmit this post",
          403,
        );
      }

      if (!canResubmit(post.reviewStatus)) {
        return error(
          c,
          "INVALID_POST_STATUS",
          "Post cannot be resubmitted in current status",
          400,
        );
      }

      await attendanceMiddleware(c, async () => {}, post.siteId);

      const now = new Date();
      const settleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const reviewInsert = db.insert(reviews).values({
        postId,
        adminId: user.id,
        action: sql<string>`'RESUBMIT'`,
        comment: supplementaryContent,
      });

      const pointsInsert = db.insert(pointsLedger).values({
        id: crypto.randomUUID(),
        userId: user.id,
        siteId: post.siteId,
        postId,
        amount: 2,
        reasonCode: "INFO_SUPPLEMENT",
        reasonText: "보완 정보 제출 보너스",
        settleMonth,
        occurredAt: now,
        createdAt: now,
      });

      await db.batch([
        db
          .update(posts)
          .set({ reviewStatus: "PENDING", updatedAt: now })
          .where(eq(posts.id, postId)),
        reviewInsert,
        pointsInsert,
      ]);

      const updatedPost = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .get();

      if (!updatedPost) {
        return error(c, "POST_NOT_FOUND", "Post not found", 404);
      }

      await logAuditWithContext(
        c,
        db,
        "POST_REVIEWED",
        user.id,
        "POST",
        postId,
        {
          action: "RESUBMIT",
          previousReviewStatus: post.reviewStatus,
          newReviewStatus: "PENDING",
          reason: "worker supplementary resubmission",
        },
      );

      return success(c, { post: updatedPost });
    },
  );
};
