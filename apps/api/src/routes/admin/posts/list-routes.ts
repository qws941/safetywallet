import type { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, sql, desc, gte, lt } from "drizzle-orm";
import type { Env, AuthContext } from "../../../types";
import {
  posts,
  postImages,
  users,
  sites,
  reviews,
  categoryEnum,
  riskLevelEnum,
  reviewStatusEnum,
} from "../../../db/schema";
import { success, error } from "../../../lib/response";
import { requireManagerOrAdmin } from "../helpers";

type AdminPostsApp = Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>;

export function registerListRoutes(app: AdminPostsApp) {
  app.get("/posts", requireManagerOrAdmin, async (c) => {
    const db = drizzle(c.env.DB);
    const siteId = c.req.query("siteId");
    const category = c.req.query("category");
    const riskLevel = c.req.query("riskLevel");
    const reviewStatus = c.req.query("reviewStatus");
    const isUrgent = c.req.query("isUrgent") === "true";
    const startDateStr = c.req.query("startDate");
    const endDateStr = c.req.query("endDate");
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
    const offset = parseInt(c.req.query("offset") || "0");

    const conditions = [];

    if (siteId) {
      conditions.push(eq(posts.siteId, siteId));
    }

    if (category) {
      conditions.push(
        eq(posts.category, category as (typeof categoryEnum)[number]),
      );
    }

    if (riskLevel) {
      conditions.push(
        eq(posts.riskLevel, riskLevel as (typeof riskLevelEnum)[number]),
      );
    }

    if (reviewStatus) {
      conditions.push(
        eq(
          posts.reviewStatus,
          reviewStatus as (typeof reviewStatusEnum)[number],
        ),
      );
    }

    if (isUrgent) {
      conditions.push(eq(posts.isUrgent, true));
    }

    if (startDateStr) {
      const startDate = new Date(startDateStr);
      if (!isNaN(startDate.getTime())) {
        conditions.push(gte(posts.createdAt, startDate));
      }
    }

    if (endDateStr) {
      const endDate = new Date(endDateStr);
      if (!isNaN(endDate.getTime())) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(0, 0, 0, 0);
        conditions.push(lt(posts.createdAt, nextDay));
      }
    }

    const results = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          name: users.name,
          nameMasked: users.nameMasked,
        },
        site: {
          id: sites.id,
          name: sites.name,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(sites, eq(posts.siteId, sites.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return success(c, {
      posts: results.map((row) => ({
        ...row.post,
        author: row.author,
        site: row.site,
      })),
    });
  });

  app.get("/posts/pending-review", requireManagerOrAdmin, async (c) => {
    const db = drizzle(c.env.DB);
    const siteId = c.req.query("siteId");
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
    const offset = parseInt(c.req.query("offset") || "0");

    const conditions = [];
    conditions.push(
      sql`${posts.reviewStatus} IN ('PENDING', 'IN_REVIEW', 'NEED_INFO')`,
    );
    if (siteId) {
      conditions.push(eq(posts.siteId, siteId));
    }

    const pendingPosts = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          name: users.nameMasked,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return success(c, {
      posts: pendingPosts.map((row) => ({
        ...row.post,
        author: row.author,
        duplicateWarning: row.post.isPotentialDuplicate,
      })),
    });
  });

  app.get("/posts/:id", requireManagerOrAdmin, async (c) => {
    const db = drizzle(c.env.DB);
    const postId = c.req.param("id");

    const post = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .get();

    if (!post) {
      return error(c, "POST_NOT_FOUND", "Post not found", 404);
    }

    const [author, postSite, images, postReviews] = await Promise.all([
      db
        .select({ id: users.id, nameMasked: users.nameMasked })
        .from(users)
        .where(eq(users.id, post.userId))
        .get(),
      db
        .select({ id: sites.id, name: sites.name })
        .from(sites)
        .where(eq(sites.id, post.siteId))
        .get(),
      db
        .select()
        .from(postImages)
        .where(eq(postImages.postId, postId))
        .orderBy(desc(postImages.createdAt))
        .all(),
      db.select().from(reviews).where(eq(reviews.postId, postId)).all(),
    ]);

    return success(c, {
      post: {
        ...post,
        author: author
          ? { id: author.id, nameMasked: author.nameMasked }
          : null,
        site: postSite,
        images,
        reviews: postReviews,
      },
    });
  });
}
