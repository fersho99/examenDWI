import { createHash, timingSafeEqual } from "node:crypto";
import type { ApiError, ApiErrorCode } from "@bloque21/shared";

const STATUS: Record<ApiErrorCode, number> = {
  invalid_input: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  rate_limited: 429,
  source_unavailable: 503,
  internal: 500,
};

export function apiError(code: ApiErrorCode, message: string, init: { retryAfter?: number } = {}) {
  const body: ApiError = {
    error: { code, message, ...(init.retryAfter ? { retryAfter: init.retryAfter } : {}) },
  };
  return Response.json(body, {
    status: STATUS[code],
    headers: {
      "cache-control": "no-store",
      ...(init.retryAfter ? { "retry-after": String(init.retryAfter) } : {}),
    },
  });
}

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Compara el encabezado Authorization con el secreto sin filtrar su longitud ni su contenido por tiempo. */
export function hasBearerSecret(request: Request, secret: string) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token.length > 0 && timingSafeEqual(digest(token), digest(secret));
}
