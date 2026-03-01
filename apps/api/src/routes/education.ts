import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import type { Env, AuthContext } from "../types";
import { authMiddleware } from "../middleware/auth";
import {
  CreateCourseSchema,
  UpdateCourseSchema,
  CreateQuizSchema,
  CreateQuizInputSchema,
  SubmitQuizSchema,
  CreateStatutoryTrainingSchema,
  CreateStatutoryTrainingInputSchema,
  UpdateStatutoryTrainingSchema,
  CreateTbmRecordSchema,
  CreateTbmInputSchema,
  UpdateTbmRecordSchema,
  AttendTbmSchema,
} from "../validators/schemas";
import {
  educationContents,
  quizzes,
  quizQuestions,
  quizAttempts,
  pointPolicies,
  statutoryTrainings,
  tbmRecords,
  tbmAttendees,
  siteMemberships,
  pointsLedger,
  users,
} from "../db/schema";
import { success, error } from "../lib/response";
import { logAuditWithContext } from "../lib/audit";

interface CreateContentBody {
  siteId: string;
  title: string;
  description?: string;
  contentType: "VIDEO" | "IMAGE" | "TEXT" | "DOCUMENT";
  contentUrl?: string;
  thumbnailUrl?: string;
  durationMinutes?: number;
  externalSource?: "LOCAL" | "YOUTUBE" | "KOSHA";
  externalId?: string;
  sourceUrl?: string;
  isActive?: boolean;
}

interface CreateQuizBody {
  siteId: string;
  contentId?: string;
  title: string;
  description?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  pointsReward?: number;
  passingScore?: number;
  timeLimitMinutes?: number;
}

interface CreateQuizQuestionBody {
  question?: string;
  options?: string[];
  correctAnswer?: number;
  questionType?: "SINGLE_CHOICE" | "OX" | "MULTI_CHOICE" | "SHORT_ANSWER";
  correctAnswerText?: string;
  explanation?: string;
  orderIndex?: number;
}

interface UpdateQuizQuestionBody {
  question?: string;
  options?: string[];
  correctAnswer?: number;
  questionType?: "SINGLE_CHOICE" | "OX" | "MULTI_CHOICE" | "SHORT_ANSWER";
  correctAnswerText?: string;
  explanation?: string;
  orderIndex?: number;
}

interface SubmitQuizAttemptBody {
  answers?:
    | Array<number | number[] | string>
    | Record<string, number | number[] | string>;
}

type QuizQuestionType =
  | "SINGLE_CHOICE"
  | "OX"
  | "MULTI_CHOICE"
  | "SHORT_ANSWER";

const QUIZ_QUESTION_TYPES: QuizQuestionType[] = [
  "SINGLE_CHOICE",
  "OX",
  "MULTI_CHOICE",
  "SHORT_ANSWER",
];

const CreateQuizQuestionRequestSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.number().int().optional(),
  questionType: z
    .enum(["SINGLE_CHOICE", "OX", "MULTI_CHOICE", "SHORT_ANSWER"])
    .default("SINGLE_CHOICE"),
  correctAnswerText: z.string().optional(),
  explanation: z.string().optional(),
  orderIndex: z.number().int().optional(),
});

const UpdateQuizQuestionRequestSchema = z.object({
  question: z.string().min(1).optional(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.number().int().optional(),
  questionType: z
    .enum(["SINGLE_CHOICE", "OX", "MULTI_CHOICE", "SHORT_ANSWER"])
    .optional(),
  correctAnswerText: z.string().optional(),
  explanation: z.string().optional(),
  orderIndex: z.number().int().optional(),
});

const SubmitQuizAttemptRequestSchema = z.object({
  answers: z.union([
    z.array(z.union([z.number().int(), z.array(z.number().int()), z.string()])),
    z.record(
      z.union([z.number().int(), z.array(z.number().int()), z.string()]),
    ),
  ]),
});

const parseMultiChoiceAnswers = (
  raw: string | null | undefined,
): number[] | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const normalized = Array.from(
      new Set(
        parsed.filter(
          (value) => Number.isInteger(value) && value >= 0,
        ) as number[],
      ),
    ).sort((a, b) => a - b);
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
};

const normalizeTextAnswer = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase();

const isQuizAnswerCorrect = (
  question: {
    correctAnswer: number;
    questionType: string;
    correctAnswerText: string | null;
  },
  answer: number | number[] | string | undefined,
): boolean => {
  const questionType = QUIZ_QUESTION_TYPES.includes(
    question.questionType as QuizQuestionType,
  )
    ? (question.questionType as QuizQuestionType)
    : "SINGLE_CHOICE";

  if (questionType === "SINGLE_CHOICE" || questionType === "OX") {
    return typeof answer === "number" && answer === question.correctAnswer;
  }

  if (questionType === "MULTI_CHOICE") {
    if (!Array.isArray(answer)) return false;
    const submitted = Array.from(
      new Set(answer.filter((value) => Number.isInteger(value) && value >= 0)),
    ).sort((a, b) => a - b);
    const expected = parseMultiChoiceAnswers(question.correctAnswerText);
    if (!expected) return false;
    return (
      submitted.length === expected.length &&
      submitted.every((value, index) => value === expected[index])
    );
  }

  if (questionType === "SHORT_ANSWER") {
    if (typeof answer !== "string") return false;
    return (
      normalizeTextAnswer(answer) ===
      normalizeTextAnswer(question.correctAnswerText)
    );
  }

  return false;
};

interface CreateStatutoryTrainingBody {
  siteId: string;
  userId: string;
  trainingType: "NEW_WORKER" | "SPECIAL" | "REGULAR" | "CHANGE_OF_WORK";
  trainingName: string;
  trainingDate: string;
  expirationDate?: string;
  provider?: string;
  certificateUrl?: string;
  hoursCompleted?: number;
  status?: "SCHEDULED" | "COMPLETED" | "EXPIRED";
  notes?: string;
}

interface UpdateStatutoryTrainingBody {
  trainingType?: "NEW_WORKER" | "SPECIAL" | "REGULAR" | "CHANGE_OF_WORK";
  trainingName?: string;
  trainingDate?: string;
  expirationDate?: string;
  provider?: string;
  certificateUrl?: string;
  hoursCompleted?: number;
  status?: "SCHEDULED" | "COMPLETED" | "EXPIRED";
  notes?: string;
}

interface CreateTbmBody {
  siteId: string;
  date: string;
  topic: string;
  content?: string;
  leaderId?: string;
  weatherCondition?: string;
  specialNotes?: string;
}

const app = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();
app.use("*", authMiddleware);

app.get("/youtube-oembed", async (c) => {
  const url = c.req.query("url");
  if (!url) return error(c, "MISSING_URL", "url query param required", 400);

  const ytRegex =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(ytRegex);
  if (!match)
    return error(
      c,
      "INVALID_YOUTUBE_URL",
      "유효하지 않은 YouTube URL입니다",
      400,
    );

  const videoId = match[1];
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

  try {
    const resp = await fetch(oembedUrl);
    if (!resp.ok)
      return error(
        c,
        "YOUTUBE_FETCH_FAILED",
        "YouTube 정보를 가져올 수 없습니다",
        502,
      );

    const data = (await resp.json()) as {
      title?: string;
      author_name?: string;
      html?: string;
    };

    return success(c, {
      videoId,
      title: data.title,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      authorName: data.author_name,
      html: data.html,
    });
  } catch {
    return error(c, "YOUTUBE_FETCH_ERROR", "YouTube API 오류", 502);
  }
});

app.post("/contents", zValidator("json", CreateCourseSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");

  const body = c.req.valid("json") as CreateContentBody;

  if (!body.siteId || !body.title || !body.contentType) {
    return error(
      c,
      "MISSING_FIELDS",
      "siteId, title, contentType are required",
      400,
    );
  }

  if (!["VIDEO", "IMAGE", "TEXT", "DOCUMENT"].includes(body.contentType)) {
    return error(c, "INVALID_CONTENT_TYPE", "Invalid contentType", 400);
  }

  const adminMembership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, body.siteId),
        eq(siteMemberships.status, "ACTIVE"),
        eq(siteMemberships.role, "SITE_ADMIN"),
      ),
    )
    .get();
  if (!adminMembership && user.role !== "SUPER_ADMIN")
    return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);

  const content = await db
    .insert(educationContents)
    .values({
      siteId: body.siteId,
      title: body.title,
      description: body.description ?? null,
      contentType: body.contentType,
      contentUrl: body.contentUrl ?? null,
      thumbnailUrl: body.thumbnailUrl ?? null,
      durationMinutes: body.durationMinutes ?? null,
      externalSource: body.externalSource ?? "LOCAL",
      externalId: body.externalId ?? null,
      sourceUrl: body.sourceUrl ?? null,
      isActive: body.isActive ?? true,
      createdById: user.id,
    })
    .returning()
    .get();

  await logAuditWithContext(
    c,
    db,
    "EDUCATION_CONTENT_CREATED",
    user.id,
    "EDUCATION_CONTENT",
    content.id,
    {
      siteId: content.siteId,
      title: content.title,
      contentType: content.contentType,
    },
  );

  return success(c, content, 201);
});

app.get("/contents", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const siteId = c.req.query("siteId");

  if (!siteId) {
    return error(c, "MISSING_SITE_ID", "siteId is required", 400);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();
  if (!membership && user.role !== "SUPER_ADMIN")
    return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
  const includeInactive = c.req.query("includeInactive") === "true";
  const limit = Math.min(
    Number.parseInt(c.req.query("limit") || "20", 10),
    100,
  );
  const offset = Number.parseInt(c.req.query("offset") || "0", 10);

  const whereClause = includeInactive
    ? eq(educationContents.siteId, siteId)
    : and(
        eq(educationContents.siteId, siteId),
        eq(educationContents.isActive, true),
      );

  const contents = await db
    .select()
    .from(educationContents)
    .where(whereClause)
    .orderBy(desc(educationContents.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(educationContents)
    .where(whereClause)
    .get();

  return success(c, {
    contents,
    total: countResult?.count ?? 0,
    limit,
    offset,
  });
});

app.get("/contents/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const id = c.req.param("id");

  const content = await db
    .select()
    .from(educationContents)
    .where(eq(educationContents.id, id))
    .get();

  if (!content) {
    return error(c, "CONTENT_NOT_FOUND", "Education content not found", 404);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, content.siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();
  if (!membership && user.role !== "SUPER_ADMIN")
    return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
  return success(c, content);
});

app.delete(
  "/contents/:id",
  zValidator("param", z.object({ id: z.string().min(1) })),
  async (c) => {
    const db = drizzle(c.env.DB);
    const { user } = c.get("auth");
    const id = c.req.valid("param").id;

    const content = await db
      .select()
      .from(educationContents)
      .where(eq(educationContents.id, id))
      .get();

    if (!content) {
      return error(c, "CONTENT_NOT_FOUND", "Education content not found", 404);
    }

    const adminMembership = await db
      .select()
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.userId, user.id),
          eq(siteMemberships.siteId, content.siteId),
          eq(siteMemberships.status, "ACTIVE"),
          eq(siteMemberships.role, "SITE_ADMIN"),
        ),
      )
      .get();
    if (!adminMembership && user.role !== "SUPER_ADMIN")
      return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);

    await db
      .update(educationContents)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(educationContents.id, id));

    await logAuditWithContext(
      c,
      db,
      "EDUCATION_CONTENT_DELETED",
      user.id,
      "EDUCATION_CONTENT",
      id,
      {
        siteId: content.siteId,
        title: content.title,
      },
    );

    return success(c, { deleted: true });
  },
);

app.post("/quizzes", zValidator("json", CreateQuizInputSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");

  const body = c.req.valid("json") as CreateQuizBody;

  if (!body.siteId || !body.title) {
    return error(c, "MISSING_FIELDS", "siteId and title are required", 400);
  }

  if (
    body.status &&
    !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(body.status)
  ) {
    return error(c, "INVALID_STATUS", "Invalid status", 400);
  }

  const adminMembership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, body.siteId),
        eq(siteMemberships.status, "ACTIVE"),
        eq(siteMemberships.role, "SITE_ADMIN"),
      ),
    )
    .get();
  if (!adminMembership && user.role !== "SUPER_ADMIN")
    return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);

  if (body.contentId) {
    const content = await db
      .select()
      .from(educationContents)
      .where(eq(educationContents.id, body.contentId))
      .get();
    if (!content || content.siteId !== body.siteId) {
      return error(
        c,
        "CONTENT_NOT_FOUND",
        "Education content not found for this site",
        404,
      );
    }
  }

  const quiz = await db
    .insert(quizzes)
    .values({
      siteId: body.siteId,
      contentId: body.contentId ?? null,
      title: body.title,
      description: body.description ?? null,
      status: body.status ?? "DRAFT",
      pointsReward: body.pointsReward ?? 0,
      passingScore: body.passingScore ?? 70,
      timeLimitMinutes: body.timeLimitMinutes ?? null,
      createdById: user.id,
    })
    .returning()
    .get();

  await logAuditWithContext(c, db, "QUIZ_CREATED", user.id, "QUIZ", quiz.id, {
    siteId: quiz.siteId,
    title: quiz.title,
    status: quiz.status,
  });

  return success(c, quiz, 201);
});

app.get("/quizzes", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const siteId = c.req.query("siteId");
  const status = c.req.query("status");

  if (!siteId) {
    return error(c, "MISSING_SITE_ID", "siteId is required", 400);
  }

  if (status && !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
    return error(c, "INVALID_STATUS", "Invalid status", 400);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();
  if (!membership && user.role !== "SUPER_ADMIN")
    return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
  const limit = Math.min(
    Number.parseInt(c.req.query("limit") || "20", 10),
    100,
  );
  const offset = Number.parseInt(c.req.query("offset") || "0", 10);

  const whereClause = status
    ? and(
        eq(quizzes.siteId, siteId),
        eq(quizzes.status, status as "DRAFT" | "PUBLISHED" | "ARCHIVED"),
      )
    : eq(quizzes.siteId, siteId);

  const list = await db
    .select()
    .from(quizzes)
    .where(whereClause)
    .orderBy(desc(quizzes.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(quizzes)
    .where(whereClause)
    .get();

  return success(c, {
    quizzes: list,
    total: countResult?.count ?? 0,
    limit,
    offset,
  });
});

app.get("/quizzes/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const id = c.req.param("id");

  const quiz = await db.select().from(quizzes).where(eq(quizzes.id, id)).get();

  if (!quiz) {
    return error(c, "QUIZ_NOT_FOUND", "Quiz not found", 404);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, quiz.siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();
  if (!membership && user.role !== "SUPER_ADMIN")
    return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, id))
    .orderBy(quizQuestions.orderIndex)
    .all();

  return success(c, { ...quiz, questions });
});

app.post(
  "/quizzes/:quizId/questions",
  zValidator("json", CreateQuizQuestionRequestSchema),
  async (c) => {
    const db = drizzle(c.env.DB);
    const { user } = c.get("auth");
    const quizId = c.req.param("quizId");

    const quiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .get();

    if (!quiz) {
      return error(c, "QUIZ_NOT_FOUND", "Quiz not found", 404);
    }

    const adminMembership = await db
      .select()
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.userId, user.id),
          eq(siteMemberships.siteId, quiz.siteId),
          eq(siteMemberships.status, "ACTIVE"),
          eq(siteMemberships.role, "SITE_ADMIN"),
        ),
      )
      .get();
    if (!adminMembership && user.role !== "SUPER_ADMIN")
      return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);

    const body = c.req.valid("json") as CreateQuizQuestionBody;

    if (!body.question) {
      return error(c, "MISSING_FIELDS", "question is required", 400);
    }

    const questionType = (body.questionType ??
      "SINGLE_CHOICE") as QuizQuestionType;
    if (!QUIZ_QUESTION_TYPES.includes(questionType)) {
      return error(c, "INVALID_QUESTION_TYPE", "Invalid questionType", 400);
    }

    let options: string[] = Array.isArray(body.options)
      ? body.options.filter((option) => option.trim().length > 0)
      : [];
    let correctAnswer = body.correctAnswer;
    let correctAnswerText = body.correctAnswerText?.trim() || null;

    if (questionType === "OX") {
      options = ["O", "X"];
      if (
        typeof correctAnswer !== "number" ||
        !Number.isInteger(correctAnswer) ||
        (correctAnswer !== 0 && correctAnswer !== 1)
      ) {
        return error(
          c,
          "INVALID_CORRECT_ANSWER",
          "correctAnswer must be 0 (O) or 1 (X)",
          400,
        );
      }
      correctAnswerText = null;
    }

    if (questionType === "SINGLE_CHOICE") {
      if (options.length < 2) {
        return error(
          c,
          "INVALID_OPTIONS",
          "options must have at least 2 items",
          400,
        );
      }
      if (
        typeof correctAnswer !== "number" ||
        !Number.isInteger(correctAnswer) ||
        correctAnswer < 0 ||
        correctAnswer >= options.length
      ) {
        return error(
          c,
          "INVALID_CORRECT_ANSWER",
          "correctAnswer must be a valid option index",
          400,
        );
      }
      correctAnswerText = null;
    }

    if (questionType === "MULTI_CHOICE") {
      if (options.length < 2) {
        return error(
          c,
          "INVALID_OPTIONS",
          "options must have at least 2 items",
          400,
        );
      }
      const parsedAnswers = parseMultiChoiceAnswers(correctAnswerText);
      if (!parsedAnswers) {
        return error(
          c,
          "INVALID_CORRECT_ANSWER_TEXT",
          "correctAnswerText must be a JSON array of indices",
          400,
        );
      }
      const hasOutOfRange = parsedAnswers.some(
        (index) => index >= options.length,
      );
      if (hasOutOfRange) {
        return error(
          c,
          "INVALID_CORRECT_ANSWER_TEXT",
          "correctAnswerText contains out-of-range indices",
          400,
        );
      }
      correctAnswer = parsedAnswers[0];
      correctAnswerText = JSON.stringify(parsedAnswers);
    }

    if (questionType === "SHORT_ANSWER") {
      if (!correctAnswerText) {
        return error(
          c,
          "INVALID_CORRECT_ANSWER_TEXT",
          "correctAnswerText is required for SHORT_ANSWER",
          400,
        );
      }
      options = [];
      correctAnswer = 0;
      correctAnswerText = correctAnswerText.trim();
    }

    const question = await db
      .insert(quizQuestions)
      .values({
        quizId,
        question: body.question,
        options,
        correctAnswer: correctAnswer ?? 0,
        questionType,
        correctAnswerText,
        explanation: body.explanation ?? null,
        orderIndex: body.orderIndex ?? 0,
      })
      .returning()
      .get();

    return success(c, question, 201);
  },
);

app.put(
  "/quizzes/:quizId/questions/:questionId",
  zValidator("json", UpdateQuizQuestionRequestSchema),
  async (c) => {
    const db = drizzle(c.env.DB);
    const { user } = c.get("auth");
    const quizId = c.req.param("quizId");
    const questionId = c.req.param("questionId");

    const quiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .get();

    if (!quiz) {
      return error(c, "QUIZ_NOT_FOUND", "Quiz not found", 404);
    }

    const adminMembership = await db
      .select()
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.userId, user.id),
          eq(siteMemberships.siteId, quiz.siteId),
          eq(siteMemberships.status, "ACTIVE"),
          eq(siteMemberships.role, "SITE_ADMIN"),
        ),
      )
      .get();
    if (!adminMembership && user.role !== "SUPER_ADMIN")
      return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);

    const existingQuestion = await db
      .select()
      .from(quizQuestions)
      .where(
        and(eq(quizQuestions.id, questionId), eq(quizQuestions.quizId, quizId)),
      )
      .get();

    if (!existingQuestion) {
      return error(c, "QUESTION_NOT_FOUND", "Quiz question not found", 404);
    }

    const body = c.req.valid("json") as UpdateQuizQuestionBody;

    const nextQuestionType = (body.questionType ??
      existingQuestion.questionType) as QuizQuestionType;
    if (!QUIZ_QUESTION_TYPES.includes(nextQuestionType)) {
      return error(c, "INVALID_QUESTION_TYPE", "Invalid questionType", 400);
    }

    let nextOptions = body.options ?? existingQuestion.options;
    nextOptions = Array.isArray(nextOptions)
      ? nextOptions.filter((option) => option.trim().length > 0)
      : [];

    let nextCorrectAnswer =
      body.correctAnswer ?? existingQuestion.correctAnswer;
    let nextCorrectAnswerText =
      body.correctAnswerText !== undefined
        ? body.correctAnswerText?.trim() || null
        : existingQuestion.correctAnswerText;

    if (nextQuestionType === "OX") {
      nextOptions = ["O", "X"];
      if (
        !Number.isInteger(nextCorrectAnswer) ||
        (nextCorrectAnswer !== 0 && nextCorrectAnswer !== 1)
      ) {
        return error(
          c,
          "INVALID_CORRECT_ANSWER",
          "correctAnswer must be 0 (O) or 1 (X)",
          400,
        );
      }
      nextCorrectAnswerText = null;
    }

    if (nextQuestionType === "SINGLE_CHOICE") {
      if (nextOptions.length < 2) {
        return error(
          c,
          "INVALID_OPTIONS",
          "options must have at least 2 items",
          400,
        );
      }
      if (
        !Number.isInteger(nextCorrectAnswer) ||
        nextCorrectAnswer < 0 ||
        nextCorrectAnswer >= nextOptions.length
      ) {
        return error(
          c,
          "INVALID_CORRECT_ANSWER",
          "correctAnswer must be a valid option index",
          400,
        );
      }
      nextCorrectAnswerText = null;
    }

    if (nextQuestionType === "MULTI_CHOICE") {
      if (nextOptions.length < 2) {
        return error(
          c,
          "INVALID_OPTIONS",
          "options must have at least 2 items",
          400,
        );
      }
      const parsedAnswers = parseMultiChoiceAnswers(nextCorrectAnswerText);
      if (!parsedAnswers) {
        return error(
          c,
          "INVALID_CORRECT_ANSWER_TEXT",
          "correctAnswerText must be a JSON array of indices",
          400,
        );
      }
      const hasOutOfRange = parsedAnswers.some(
        (index) => index >= nextOptions.length,
      );
      if (hasOutOfRange) {
        return error(
          c,
          "INVALID_CORRECT_ANSWER_TEXT",
          "correctAnswerText contains out-of-range indices",
          400,
        );
      }
      nextCorrectAnswer = parsedAnswers[0];
      nextCorrectAnswerText = JSON.stringify(parsedAnswers);
    }

    if (nextQuestionType === "SHORT_ANSWER") {
      if (!nextCorrectAnswerText) {
        return error(
          c,
          "INVALID_CORRECT_ANSWER_TEXT",
          "correctAnswerText is required for SHORT_ANSWER",
          400,
        );
      }
      nextOptions = [];
      nextCorrectAnswer = 0;
      nextCorrectAnswerText = nextCorrectAnswerText.trim();
    }

    const updated = await db
      .update(quizQuestions)
      .set({
        ...(body.question !== undefined && { question: body.question }),
        options: nextOptions,
        correctAnswer: nextCorrectAnswer,
        questionType: nextQuestionType,
        correctAnswerText: nextCorrectAnswerText,
        ...(body.explanation !== undefined && {
          explanation: body.explanation,
        }),
        ...(body.orderIndex !== undefined && { orderIndex: body.orderIndex }),
      })
      .where(
        and(eq(quizQuestions.id, questionId), eq(quizQuestions.quizId, quizId)),
      )
      .returning()
      .get();

    return success(c, updated);
  },
);

app.delete("/quizzes/:quizId/questions/:questionId", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const quizId = c.req.param("quizId");
  const questionId = c.req.param("questionId");

  const quiz = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .get();

  if (!quiz) {
    return error(c, "QUIZ_NOT_FOUND", "Quiz not found", 404);
  }

  const adminMembership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, quiz.siteId),
        eq(siteMemberships.status, "ACTIVE"),
        eq(siteMemberships.role, "SITE_ADMIN"),
      ),
    )
    .get();
  if (!adminMembership && user.role !== "SUPER_ADMIN")
    return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);

  const existingQuestion = await db
    .select()
    .from(quizQuestions)
    .where(
      and(eq(quizQuestions.id, questionId), eq(quizQuestions.quizId, quizId)),
    )
    .get();

  if (!existingQuestion) {
    return error(c, "QUESTION_NOT_FOUND", "Quiz question not found", 404);
  }

  await db
    .delete(quizQuestions)
    .where(
      and(eq(quizQuestions.id, questionId), eq(quizQuestions.quizId, quizId)),
    );

  return success(c, { deleted: true });
});

app.post(
  "/quizzes/:quizId/attempt",
  zValidator("json", SubmitQuizAttemptRequestSchema),
  async (c) => {
    const db = drizzle(c.env.DB);
    const { user } = c.get("auth");
    const quizId = c.req.param("quizId");

    const quiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .get();

    if (!quiz) {
      return error(c, "QUIZ_NOT_FOUND", "Quiz not found", 404);
    }

    if (quiz.status !== "PUBLISHED") {
      return error(c, "QUIZ_NOT_PUBLISHED", "Quiz is not published", 400);
    }

    const membership = await db
      .select()
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.userId, user.id),
          eq(siteMemberships.siteId, quiz.siteId),
          eq(siteMemberships.status, "ACTIVE"),
        ),
      )
      .get();

    if (!membership && user.role !== "SUPER_ADMIN") {
      return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
    }

    const body = c.req.valid("json") as SubmitQuizAttemptBody;

    const answersByIndex = Array.isArray(body.answers) ? body.answers : null;
    const answersByQuestionId =
      !Array.isArray(body.answers) && body.answers ? body.answers : null;

    if (!answersByIndex && !answersByQuestionId) {
      return error(c, "INVALID_ANSWERS", "answers are required", 400);
    }

    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(quizQuestions.orderIndex)
      .all();

    if (questions.length === 0) {
      return error(c, "NO_QUESTIONS", "Quiz has no questions", 400);
    }

    const normalizedAnswers: Array<number | number[] | string> = questions.map(
      (question, index) => {
        if (answersByIndex) {
          return answersByIndex[index] ?? "";
        }
        return answersByQuestionId?.[question.id] ?? "";
      },
    );

    let correctCount = 0;
    for (let i = 0; i < questions.length; i += 1) {
      const submittedAnswer = normalizedAnswers[i];
      if (isQuizAnswerCorrect(questions[i], submittedAnswer)) {
        correctCount += 1;
      }
    }

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= quiz.passingScore;

    const existingAttempt = await db
      .select({ id: quizAttempts.id, passed: quizAttempts.passed })
      .from(quizAttempts)
      .where(
        and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.userId, user.id)),
      )
      .get();

    if (existingAttempt) {
      if (existingAttempt.passed) {
        return error(c, "ALREADY_COMPLETED", "Course already completed", 409);
      }

      return error(c, "ALREADY_SUBMITTED", "Quiz already submitted", 409);
    }

    const quizPassPolicy = await db
      .select({ defaultAmount: pointPolicies.defaultAmount })
      .from(pointPolicies)
      .where(
        and(
          eq(pointPolicies.siteId, quiz.siteId),
          eq(pointPolicies.reasonCode, "QUIZ_PASS"),
          eq(pointPolicies.isActive, true),
        ),
      )
      .get();

    const rewardAmount = quizPassPolicy?.defaultAmount ?? quiz.pointsReward;

    let pointsAwarded = 0;
    if (passed && rewardAmount > 0) {
      pointsAwarded = rewardAmount;

      await db.insert(pointsLedger).values({
        userId: user.id,
        siteId: quiz.siteId,
        amount: rewardAmount,
        reasonCode: "QUIZ_PASS",
        reasonText: `Quiz passed: ${quiz.title}`,
        settleMonth: new Date().toISOString().slice(0, 7),
        occurredAt: new Date(),
        adminId: quiz.createdById,
      });

      await logAuditWithContext(
        c,
        db,
        "QUIZ_POINTS_AWARDED",
        user.id,
        "QUIZ",
        quiz.id,
        {
          score,
          passingScore: quiz.passingScore,
          pointsAwarded,
        },
      );
    }

    const attempt = await db
      .insert(quizAttempts)
      .values({
        quizId,
        userId: user.id,
        siteId: quiz.siteId,
        answers: normalizedAnswers,
        score,
        passed,
        pointsAwarded,
        completedAt: new Date(),
      })
      .returning()
      .get();

    return success(
      c,
      {
        ...attempt,
        totalQuestions: questions.length,
        correctCount,
      },
      201,
    );
  },
);

app.get("/quizzes/:quizId/my-attempts", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const quizId = c.req.param("quizId");

  const quiz = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .get();

  if (!quiz) {
    return error(c, "QUIZ_NOT_FOUND", "Quiz not found", 404);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, quiz.siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();

  if (!membership && user.role !== "SUPER_ADMIN") {
    return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
  }

  const attempts = await db
    .select()
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.userId, user.id)),
    )
    .orderBy(desc(quizAttempts.completedAt))
    .all();

  return success(c, { attempts });
});

app.post(
  "/statutory",
  zValidator("json", CreateStatutoryTrainingInputSchema),
  async (c) => {
    const db = drizzle(c.env.DB);
    const { user } = c.get("auth");

    const body = c.req.valid("json") as CreateStatutoryTrainingBody;

    if (
      !body.siteId ||
      !body.userId ||
      !body.trainingType ||
      !body.trainingName ||
      !body.trainingDate
    ) {
      return error(
        c,
        "MISSING_FIELDS",
        "siteId, userId, trainingType, trainingName, trainingDate are required",
        400,
      );
    }

    if (
      !["NEW_WORKER", "SPECIAL", "REGULAR", "CHANGE_OF_WORK"].includes(
        body.trainingType,
      )
    ) {
      return error(c, "INVALID_TRAINING_TYPE", "Invalid trainingType", 400);
    }

    if (
      body.status &&
      !["SCHEDULED", "COMPLETED", "EXPIRED"].includes(body.status)
    ) {
      return error(c, "INVALID_STATUS", "Invalid status", 400);
    }

    const adminMembership = await db
      .select()
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.userId, user.id),
          eq(siteMemberships.siteId, body.siteId),
          eq(siteMemberships.status, "ACTIVE"),
          eq(siteMemberships.role, "SITE_ADMIN"),
        ),
      )
      .get();
    if (!adminMembership && user.role !== "SUPER_ADMIN")
      return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);

    const targetMembership = await db
      .select()
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.userId, body.userId),
          eq(siteMemberships.siteId, body.siteId),
          eq(siteMemberships.status, "ACTIVE"),
        ),
      )
      .get();

    if (!targetMembership) {
      return error(
        c,
        "TARGET_NOT_SITE_MEMBER",
        "Target user is not an active member of this site",
        400,
      );
    }

    const training = await db
      .insert(statutoryTrainings)
      .values({
        siteId: body.siteId,
        userId: body.userId,
        trainingType: body.trainingType,
        trainingName: body.trainingName,
        trainingDate: Math.floor(new Date(body.trainingDate).getTime() / 1000),
        expirationDate: body.expirationDate
          ? Math.floor(new Date(body.expirationDate).getTime() / 1000)
          : null,
        provider: body.provider ?? null,
        certificateUrl: body.certificateUrl ?? null,
        hoursCompleted: body.hoursCompleted ?? 0,
        status: body.status ?? "SCHEDULED",
        createdById: user.id,
        notes: body.notes ?? null,
      })
      .returning()
      .get();

    await logAuditWithContext(
      c,
      db,
      "STATUTORY_TRAINING_CREATED",
      user.id,
      "STATUTORY_TRAINING",
      training.id,
      {
        siteId: training.siteId,
        targetUserId: training.userId,
        trainingType: training.trainingType,
      },
    );

    return success(c, training, 201);
  },
);

app.get("/statutory", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const siteId = c.req.query("siteId");
  const userId = c.req.query("userId");
  const trainingType = c.req.query("trainingType");
  const status = c.req.query("status");

  if (!siteId) {
    return error(c, "MISSING_SITE_ID", "siteId is required", 400);
  }

  if (
    trainingType &&
    !["NEW_WORKER", "SPECIAL", "REGULAR", "CHANGE_OF_WORK"].includes(
      trainingType,
    )
  ) {
    return error(c, "INVALID_TRAINING_TYPE", "Invalid trainingType", 400);
  }

  if (status && !["SCHEDULED", "COMPLETED", "EXPIRED"].includes(status)) {
    return error(c, "INVALID_STATUS", "Invalid status", 400);
  }

  const adminMembership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, siteId),
        eq(siteMemberships.status, "ACTIVE"),
        eq(siteMemberships.role, "SITE_ADMIN"),
      ),
    )
    .get();
  if (!adminMembership && user.role !== "SUPER_ADMIN")
    return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);

  const limit = Math.min(
    Number.parseInt(c.req.query("limit") || "20", 10),
    100,
  );
  const offset = Number.parseInt(c.req.query("offset") || "0", 10);

  const conditions = [eq(statutoryTrainings.siteId, siteId)];
  if (userId) conditions.push(eq(statutoryTrainings.userId, userId));
  if (trainingType)
    conditions.push(
      eq(
        statutoryTrainings.trainingType,
        trainingType as "NEW_WORKER" | "SPECIAL" | "REGULAR" | "CHANGE_OF_WORK",
      ),
    );
  if (status)
    conditions.push(
      eq(
        statutoryTrainings.status,
        status as "SCHEDULED" | "COMPLETED" | "EXPIRED",
      ),
    );

  const trainings = await db
    .select({
      training: statutoryTrainings,
      userName: users.name,
    })
    .from(statutoryTrainings)
    .innerJoin(users, eq(statutoryTrainings.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(statutoryTrainings.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(statutoryTrainings)
    .where(and(...conditions))
    .get();

  return success(c, {
    trainings,
    total: countResult?.count ?? 0,
    limit,
    offset,
  });
});

app.put(
  "/statutory/:id",
  zValidator("json", UpdateStatutoryTrainingSchema),
  async (c) => {
    const db = drizzle(c.env.DB);
    const { user } = c.get("auth");
    const id = c.req.param("id");

    const existing = await db
      .select()
      .from(statutoryTrainings)
      .where(eq(statutoryTrainings.id, id))
      .get();

    if (!existing) {
      return error(
        c,
        "STATUTORY_TRAINING_NOT_FOUND",
        "Statutory training not found",
        404,
      );
    }

    const adminMembership = await db
      .select()
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.userId, user.id),
          eq(siteMemberships.siteId, existing.siteId),
          eq(siteMemberships.status, "ACTIVE"),
          eq(siteMemberships.role, "SITE_ADMIN"),
        ),
      )
      .get();
    if (!adminMembership && user.role !== "SUPER_ADMIN")
      return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);

    const body = c.req.valid("json") as UpdateStatutoryTrainingBody;

    if (
      body.trainingType &&
      !["NEW_WORKER", "SPECIAL", "REGULAR", "CHANGE_OF_WORK"].includes(
        body.trainingType,
      )
    ) {
      return error(c, "INVALID_TRAINING_TYPE", "Invalid trainingType", 400);
    }

    if (
      body.status &&
      !["SCHEDULED", "COMPLETED", "EXPIRED"].includes(body.status)
    ) {
      return error(c, "INVALID_STATUS", "Invalid status", 400);
    }

    const updated = await db
      .update(statutoryTrainings)
      .set({
        ...(body.trainingType !== undefined && {
          trainingType: body.trainingType,
        }),
        ...(body.trainingName !== undefined && {
          trainingName: body.trainingName,
        }),
        ...(body.trainingDate !== undefined && {
          trainingDate: Math.floor(
            new Date(body.trainingDate).getTime() / 1000,
          ),
        }),
        ...(body.expirationDate !== undefined && {
          expirationDate: body.expirationDate
            ? Math.floor(new Date(body.expirationDate).getTime() / 1000)
            : null,
        }),
        ...(body.provider !== undefined && { provider: body.provider }),
        ...(body.certificateUrl !== undefined && {
          certificateUrl: body.certificateUrl,
        }),
        ...(body.hoursCompleted !== undefined && {
          hoursCompleted: body.hoursCompleted,
        }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        updatedAt: new Date(),
      })
      .where(eq(statutoryTrainings.id, id))
      .returning()
      .get();

    return success(c, updated);
  },
);

app.post("/tbm", zValidator("json", CreateTbmInputSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");

  const body = c.req.valid("json") as CreateTbmBody;

  if (!body.siteId || !body.date || !body.topic) {
    return error(c, "MISSING_FIELDS", "siteId, date, topic are required", 400);
  }

  const adminMembership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, body.siteId),
        eq(siteMemberships.status, "ACTIVE"),
        eq(siteMemberships.role, "SITE_ADMIN"),
      ),
    )
    .get();
  if (!adminMembership && user.role !== "SUPER_ADMIN")
    return error(c, "SITE_ADMIN_REQUIRED", "관리자 권한이 필요합니다", 403);

  if (body.leaderId) {
    const leaderMembership = await db
      .select()
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.userId, body.leaderId),
          eq(siteMemberships.siteId, body.siteId),
          eq(siteMemberships.status, "ACTIVE"),
        ),
      )
      .get();
    if (!leaderMembership) {
      return error(
        c,
        "LEADER_NOT_SITE_MEMBER",
        "leaderId must be an active site member",
        400,
      );
    }
  }

  const tbm = await db
    .insert(tbmRecords)
    .values({
      siteId: body.siteId,
      date: Math.floor(new Date(body.date).getTime() / 1000),
      topic: body.topic,
      content: body.content ?? null,
      leaderId: body.leaderId ?? user.id,
      weatherCondition: body.weatherCondition ?? null,
      specialNotes: body.specialNotes ?? null,
    })
    .returning()
    .get();

  await logAuditWithContext(
    c,
    db,
    "TBM_CREATED",
    user.id,
    "TBM_RECORD",
    tbm.id,
    {
      siteId: tbm.siteId,
      topic: tbm.topic,
      date: tbm.date,
    },
  );

  return success(c, tbm, 201);
});

app.get("/tbm", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const siteId = c.req.query("siteId");
  const date = c.req.query("date");

  if (!siteId) {
    return error(c, "MISSING_SITE_ID", "siteId is required", 400);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();
  if (!membership && user.role !== "SUPER_ADMIN")
    return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
  const limit = Math.min(
    Number.parseInt(c.req.query("limit") || "20", 10),
    100,
  );
  const offset = Number.parseInt(c.req.query("offset") || "0", 10);

  const whereClause = date
    ? and(
        eq(tbmRecords.siteId, siteId),
        eq(tbmRecords.date, Math.floor(new Date(date).getTime() / 1000)),
      )
    : eq(tbmRecords.siteId, siteId);

  const records = await db
    .select({
      tbm: tbmRecords,
      leaderName: users.name,
    })
    .from(tbmRecords)
    .innerJoin(users, eq(tbmRecords.leaderId, users.id))
    .where(whereClause)
    .orderBy(desc(tbmRecords.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tbmRecords)
    .where(whereClause)
    .get();

  return success(c, {
    records,
    total: countResult?.count ?? 0,
    limit,
    offset,
  });
});

app.get("/tbm/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const id = c.req.param("id");

  const tbm = await db
    .select({
      record: tbmRecords,
      leaderName: users.name,
    })
    .from(tbmRecords)
    .innerJoin(users, eq(tbmRecords.leaderId, users.id))
    .where(eq(tbmRecords.id, id))
    .get();

  if (!tbm) {
    return error(c, "TBM_NOT_FOUND", "TBM record not found", 404);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, tbm.record.siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();
  if (!membership && user.role !== "SUPER_ADMIN")
    return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
  const attendees = await db
    .select({
      attendee: tbmAttendees,
      userName: users.name,
    })
    .from(tbmAttendees)
    .innerJoin(users, eq(tbmAttendees.userId, users.id))
    .where(eq(tbmAttendees.tbmRecordId, id))
    .orderBy(desc(tbmAttendees.attendedAt))
    .all();

  return success(c, {
    ...tbm.record,
    leaderName: tbm.leaderName,
    attendees,
    attendeeCount: attendees.length,
  });
});

app.post(
  "/tbm/:tbmId/attend",
  zValidator("json", AttendTbmSchema),
  async (c) => {
    const db = drizzle(c.env.DB);
    const { user } = c.get("auth");
    const tbmId = c.req.param("tbmId");

    const tbm = await db
      .select()
      .from(tbmRecords)
      .where(eq(tbmRecords.id, tbmId))
      .get();

    if (!tbm) {
      return error(c, "TBM_NOT_FOUND", "TBM record not found", 404);
    }

    const membership = await db
      .select()
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.userId, user.id),
          eq(siteMemberships.siteId, tbm.siteId),
          eq(siteMemberships.status, "ACTIVE"),
        ),
      )
      .get();

    if (!membership && user.role !== "SUPER_ADMIN") {
      return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
    }

    c.req.valid("json");

    const existing = await db
      .select()
      .from(tbmAttendees)
      .where(
        and(
          eq(tbmAttendees.tbmRecordId, tbmId),
          eq(tbmAttendees.userId, user.id),
        ),
      )
      .get();

    if (existing) {
      return error(c, "ALREADY_ATTENDED", "Already attended", 400);
    }

    const attendee = await db
      .insert(tbmAttendees)
      .values({
        tbmRecordId: tbmId,
        userId: user.id,
      })
      .returning()
      .get();

    return success(c, attendee, 201);
  },
);

app.get("/tbm/:tbmId/attendees", async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const tbmId = c.req.param("tbmId");

  const tbm = await db
    .select()
    .from(tbmRecords)
    .where(eq(tbmRecords.id, tbmId))
    .get();

  if (!tbm) {
    return error(c, "TBM_NOT_FOUND", "TBM record not found", 404);
  }

  const membership = await db
    .select()
    .from(siteMemberships)
    .where(
      and(
        eq(siteMemberships.userId, user.id),
        eq(siteMemberships.siteId, tbm.siteId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .get();

  if (!membership && user.role !== "SUPER_ADMIN") {
    return error(c, "NOT_SITE_MEMBER", "Site membership required", 403);
  }

  const attendees = await db
    .select({
      attendee: tbmAttendees,
      userName: users.name,
    })
    .from(tbmAttendees)
    .innerJoin(users, eq(tbmAttendees.userId, users.id))
    .where(eq(tbmAttendees.tbmRecordId, tbmId))
    .orderBy(desc(tbmAttendees.attendedAt))
    .all();

  return success(c, { attendees });
});

export default app;
