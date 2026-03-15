const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";
const AUTHENTICATION_FAILED_MESSAGE = "Authentication failed";
const DATABASE_ERROR_MESSAGE = "Database error";

const STACK_TRACE_PATTERN = /^\s*at\s.+$/gm;
const STACK_TRACE_DETECT_PATTERN = /^\s*at\s.+$/m;
const FILE_PATH_PATTERN =
  /(?:[A-Za-z]:\\[^\s)]+|\/(?:[^\s)]+\/)*[^\s).]+\.(?:ts|tsx|js|jsx|mjs|cjs|sql|json))/gi;
const FILE_PATH_DETECT_PATTERN =
  /(?:[A-Za-z]:\\[^\s)]+|\/(?:[^\s)]+\/)*[^\s).]+\.(?:ts|tsx|js|jsx|mjs|cjs|sql|json))/i;
const PRIVATE_IP_PATTERN =
  /\b(?:127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})\b/g;
const PRIVATE_IP_DETECT_PATTERN =
  /\b(?:127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})\b/;

type ErrorLike = {
  message?: unknown;
  status?: unknown;
  code?: unknown;
  name?: unknown;
  issues?: unknown;
  getResponse?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asErrorLike(value: unknown): ErrorLike | null {
  return isObject(value) ? (value as ErrorLike) : null;
}

function getRawErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }

  const maybeError = asErrorLike(error);
  if (maybeError && typeof maybeError.message === "string") {
    return maybeError.message;
  }

  return "";
}

function stripSensitiveText(message: string): string {
  return message
    .replace(STACK_TRACE_PATTERN, " ")
    .replace(FILE_PATH_PATTERN, "[path]")
    .replace(PRIVATE_IP_PATTERN, "[internal-ip]")
    .replace(/\s+/g, " ")
    .trim();
}

function hasSensitiveDetails(message: string): boolean {
  if (!message) {
    return false;
  }

  return (
    STACK_TRACE_DETECT_PATTERN.test(message) ||
    FILE_PATH_DETECT_PATTERN.test(message) ||
    PRIVATE_IP_DETECT_PATTERN.test(message)
  );
}

function isValidationError(error: unknown): boolean {
  const maybeError = asErrorLike(error);
  if (!maybeError) {
    return false;
  }

  if (maybeError.name === "ZodError") {
    return true;
  }

  if (Array.isArray(maybeError.issues)) {
    return true;
  }

  const message = getRawErrorMessage(error).toLowerCase();
  return message.includes("validation") || message.includes("invalid");
}

function isAuthError(error: unknown): boolean {
  const maybeError = asErrorLike(error);
  const status =
    typeof maybeError?.status === "number" ? maybeError.status : undefined;
  if (status === 401 || status === 403) {
    return true;
  }

  const code =
    typeof maybeError?.code === "string" ? maybeError.code.toUpperCase() : "";
  if (
    code.includes("AUTH") ||
    code.includes("TOKEN") ||
    code === "UNAUTHORIZED"
  ) {
    return true;
  }

  const message = getRawErrorMessage(error).toLowerCase();
  return (
    message.includes("auth") ||
    message.includes("token") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("인증")
  );
}

function isDatabaseError(error: unknown): boolean {
  const maybeError = asErrorLike(error);
  const code =
    typeof maybeError?.code === "string" ? maybeError.code.toUpperCase() : "";
  if (code.includes("SQL") || code.includes("D1") || code.includes("DB")) {
    return true;
  }

  const message = getRawErrorMessage(error).toLowerCase();
  return (
    message.includes("sqlite") ||
    message.includes("sql") ||
    message.includes("database") ||
    message.includes("d1_error") ||
    message.includes("constraint")
  );
}

function isHttpLikeError(error: unknown): boolean {
  const maybeError = asErrorLike(error);
  if (!maybeError) {
    return false;
  }

  if (typeof maybeError.status === "number") {
    return maybeError.status >= 400 && maybeError.status <= 599;
  }

  return typeof maybeError.getResponse === "function";
}

function isDevelopmentMode(): boolean {
  const maybeProcess = (
    globalThis as { process?: { env?: Record<string, string> } }
  ).process;
  const nodeEnv = maybeProcess?.env?.NODE_ENV;
  const runtimeEnv = maybeProcess?.env?.ENVIRONMENT;

  return nodeEnv === "development" || runtimeEnv === "development";
}

function mapStatusCode(error: unknown, explicitStatusCode?: number): number {
  if (
    typeof explicitStatusCode === "number" &&
    explicitStatusCode >= 400 &&
    explicitStatusCode <= 599
  ) {
    return explicitStatusCode;
  }

  const maybeError = asErrorLike(error);
  const status = typeof maybeError?.status === "number" ? maybeError.status : 0;
  if (status >= 400 && status <= 599) {
    return status;
  }

  if (isValidationError(error)) {
    return 400;
  }

  if (isAuthError(error)) {
    return 401;
  }

  return 500;
}

function mapErrorCode(statusCode: number, error: unknown): string {
  if (isDatabaseError(error)) {
    return "DATABASE_ERROR";
  }

  if (statusCode === 400) return "VALIDATION_ERROR";
  if (statusCode === 401) return "UNAUTHORIZED";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";
  if (statusCode === 409) return "CONFLICT";
  if (statusCode === 429) return "RATE_LIMITED";
  if (statusCode >= 500) return "INTERNAL_ERROR";

  return "ERROR";
}

export function isOperationalError(error: unknown): boolean {
  if (isValidationError(error) || isAuthError(error)) {
    return true;
  }

  if (isHttpLikeError(error)) {
    const statusCode = mapStatusCode(error);
    return statusCode >= 400 && statusCode < 500;
  }

  return false;
}

export function sanitizeErrorMessage(error: unknown): string {
  const rawMessage = getRawErrorMessage(error);
  const strippedMessage = stripSensitiveText(rawMessage);
  const containsSensitive = hasSensitiveDetails(rawMessage);

  if (isDatabaseError(error)) {
    return DATABASE_ERROR_MESSAGE;
  }

  if (isAuthError(error)) {
    return AUTHENTICATION_FAILED_MESSAGE;
  }

  if (isValidationError(error)) {
    if (!strippedMessage) {
      return "Validation error";
    }
    return strippedMessage;
  }

  if (isOperationalError(error) && strippedMessage && !containsSensitive) {
    return strippedMessage;
  }

  if (isDevelopmentMode() && strippedMessage) {
    return strippedMessage;
  }

  return INTERNAL_SERVER_ERROR_MESSAGE;
}

export function createSafeErrorResponse(error: unknown, statusCode?: number) {
  const resolvedStatusCode = mapStatusCode(error, statusCode);
  const message = sanitizeErrorMessage(error);
  const code = mapErrorCode(resolvedStatusCode, error);

  return {
    code,
    message,
    statusCode: resolvedStatusCode,
  };
}
