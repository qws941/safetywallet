import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function success<T>(
  c: Context,
  data: T,
  status: ContentfulStatusCode = 200,
) {
  return c.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    status,
  );
}

export function error(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode = 400,
) {
  return c.json(
    {
      success: false,
      error: { code, message },
      timestamp: new Date().toISOString(),
    },
    status,
  );
}
