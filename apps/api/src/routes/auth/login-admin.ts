import type { Context } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { users } from "../../db/schema";
import { hmac, verifyPassword } from "../../lib/crypto";
import { signJwt } from "../../lib/jwt";
import { error, success } from "../../lib/response";
import { checkRateLimit } from "../../lib/rate-limit";
import type { AuthContext, Env } from "../../types";

const LOGIN_MIN_RESPONSE_MS = 350;

type AuthBindings = { Bindings: Env; Variables: { auth: AuthContext } };
export interface AdminLoginBody {
  username?: string;
  password?: string;
}

async function enforceMinimumResponseTime(startedAt: number) {
  const elapsed = Date.now() - startedAt;
  const remaining = LOGIN_MIN_RESPONSE_MS - elapsed;
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

export async function handleAdminLogin(
  c: Context<AuthBindings>,
  body: AdminLoginBody | null,
) {
  const startedAt = Date.now();
  const respondWithDelay = async (response: Response) => {
    await enforceMinimumResponseTime(startedAt);
    return response;
  };

  if (!body) {
    return respondWithDelay(error(c, "INVALID_JSON", "Invalid JSON", 400));
  }
  if (!body.username || !body.password) {
    return respondWithDelay(
      error(c, "MISSING_FIELDS", "username and password are required", 400),
    );
  }

  const clientIp = c.req.header("CF-Connecting-IP") || "unknown";
  const rateLimit = await checkRateLimit(
    c.env,
    `auth:admin:login:ip:${clientIp}`,
    5,
    60 * 1000,
  );
  if (!rateLimit.allowed) {
    return respondWithDelay(
      error(
        c,
        "RATE_LIMIT_EXCEEDED",
        "요청이 너무 많습니다. 잠시 후 다시 시도하세요.",
        429,
      ),
    );
  }

  const ADMIN_USERNAME = c.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_HASH = c.env.ADMIN_PASSWORD_HASH;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) {
    return respondWithDelay(
      error(
        c,
        "SERVER_ERROR",
        "서버 설정 오류입니다. 관리자에게 문의하세요.",
        500,
      ),
    );
  }

  const usernameMatch = body.username === ADMIN_USERNAME;
  const passwordMatch = await verifyPassword(
    body.password,
    ADMIN_PASSWORD_HASH,
  );
  if (!usernameMatch || !passwordMatch) {
    return respondWithDelay(
      error(
        c,
        "INVALID_CREDENTIALS",
        "아이디 또는 비밀번호가 올바르지 않습니다",
        401,
      ),
    );
  }

  const db = drizzle(c.env.DB);
  let adminUser = await db
    .select()
    .from(users)
    .where(eq(users.role, "SUPER_ADMIN"))
    .get();

  if (!adminUser) {
    adminUser = await db
      .insert(users)
      .values({
        name: "관리자",
        nameMasked: "관*자",
        phoneHash: await hmac(c.env.HMAC_SECRET, "admin"),
        role: "SUPER_ADMIN",
        piiViewFull: true,
        canAwardPoints: true,
        canManageUsers: true,
      })
      .returning()
      .get();
  }

  const accessToken = await signJwt(
    { sub: adminUser.id, phone: "", role: adminUser.role },
    c.env.JWT_SECRET,
  );
  const refreshToken = crypto.randomUUID();
  const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db
    .update(users)
    .set({ refreshToken, refreshTokenExpiresAt, updatedAt: new Date() })
    .where(eq(users.id, adminUser.id));

  return respondWithDelay(
    success(
      c,
      {
        user: {
          id: adminUser.id,
          phone: "",
          nameMasked: adminUser.nameMasked || "관리자",
          role: adminUser.role,
        },
        tokens: { accessToken, refreshToken },
      },
      200,
    ),
  );
}
