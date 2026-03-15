const DEFAULT_EXPIRY_SECONDS = 3600;

const encoder = new TextEncoder();

function normalizeR2Key(value: string): string {
  if (!value) {
    return "";
  }

  const stripQueryAndHash = (raw: string): string =>
    raw.split("?")[0].split("#")[0];

  if (value.startsWith("/r2/")) {
    return stripQueryAndHash(value.slice(4));
  }

  if (value.startsWith("r2/")) {
    return stripQueryAndHash(value.slice(3));
  }

  try {
    const parsed = new URL(value);
    if (parsed.pathname.startsWith("/r2/")) {
      return stripQueryAndHash(parsed.pathname.slice(4));
    }
  } catch {}

  return value;
}

function hasR2PathPrefix(value: string): boolean {
  if (value.startsWith("/r2/") || value.startsWith("r2/")) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.pathname.startsWith("/r2/");
  } catch {
    return false;
  }
}

async function createHmacSignature(
  payload: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  const bytes = new Uint8Array(signature);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function generateSignedPath(
  r2Key: string,
  secret: string,
  expirySeconds: number = DEFAULT_EXPIRY_SECONDS,
): Promise<string> {
  if (!secret) {
    throw new Error("Signing secret is required");
  }

  const normalizedKey = normalizeR2Key(r2Key);
  if (!normalizedKey) {
    throw new Error("R2 key is required");
  }

  const safeExpiry = Number.isFinite(expirySeconds)
    ? Math.max(1, Math.floor(expirySeconds))
    : DEFAULT_EXPIRY_SECONDS;
  const expiryTimestamp = Math.floor(Date.now() / 1000) + safeExpiry;
  const payload = `${normalizedKey}:${expiryTimestamp}`;
  const signature = await createHmacSignature(payload, secret);
  return `/r2/${normalizedKey}?exp=${expiryTimestamp}&sig=${signature}`;
}

export async function verifySignedPath(
  path: string,
  queryParams: { exp: string; sig: string },
  secret: string,
): Promise<boolean> {
  if (!secret) {
    return false;
  }

  const normalizedKey = normalizeR2Key(path);
  if (!normalizedKey || !queryParams.exp || !queryParams.sig) {
    return false;
  }

  const expiryTimestamp = Number.parseInt(queryParams.exp, 10);
  if (!Number.isFinite(expiryTimestamp)) {
    return false;
  }

  if (expiryTimestamp <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const payload = `${normalizedKey}:${expiryTimestamp}`;
  const expectedSignature = await createHmacSignature(payload, secret);
  return timingSafeEqual(expectedSignature, queryParams.sig);
}

export async function signR2PathIfNeeded(
  pathOrUrl: string | null | undefined,
  secret: string,
  expirySeconds: number = DEFAULT_EXPIRY_SECONDS,
): Promise<string | null> {
  if (!pathOrUrl) {
    return null;
  }

  if (!secret) {
    return pathOrUrl;
  }

  if (!hasR2PathPrefix(pathOrUrl)) {
    return pathOrUrl;
  }

  const key = normalizeR2Key(pathOrUrl);
  if (!key) {
    return pathOrUrl;
  }

  return generateSignedPath(key, secret, expirySeconds);
}

export function toUnsignedR2Path(pathOrUrl: string): string {
  if (!hasR2PathPrefix(pathOrUrl)) {
    return pathOrUrl;
  }

  const key = normalizeR2Key(pathOrUrl);
  if (!key) {
    return pathOrUrl;
  }

  return `/r2/${key}`;
}
