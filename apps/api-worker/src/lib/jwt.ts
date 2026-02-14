import * as jose from "jose";

export interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
  loginDate: string;
}

function getKSTDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // "YYYY-MM-DD"
}

export async function signJwt(
  payload: Omit<JwtPayload, "loginDate">,
  secret: string,
  expiresIn: string = "24h",
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  const loginDate = getKSTDateString();

  return await new jose.SignJWT({ ...payload, loginDate })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

export async function verifyJwt(
  token: string,
  secret: string,
): Promise<JwtPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);

    // Validate required fields exist and are strings
    if (
      typeof payload.sub !== "string" ||
      typeof payload.phone !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.loginDate !== "string"
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      phone: payload.phone,
      role: payload.role,
      loginDate: payload.loginDate,
    };
  } catch {
    return null;
  }
}

export function checkSameDay(loginDate: string): boolean {
  return loginDate === getKSTDateString();
}
