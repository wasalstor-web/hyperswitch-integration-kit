import type { Context } from "hono";

export const CORS_ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type";

function parseCorsList(): string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** رؤوس JSON: بدون CORS_ORIGIN → *. مع قائمة: يطابق Origin أو أول مسموح (عملاء غير متصفح). */
export function corsAllowOrigin(requestOrigin: string | null): string {
  const list = parseCorsList();
  if (list.length === 0) return "*";
  if (requestOrigin && list.includes(requestOrigin)) return requestOrigin;
  return list[0]!;
}

/** وسيط hono/cors: طلب غير مدرج مع تعريف قائمة → رفض (null). */
export function honoCorsOrigin(origin: string | undefined): string | null {
  const list = parseCorsList();
  if (list.length === 0) return "*";
  if (origin && list.includes(origin)) return origin;
  if (!origin) return list[0]!;
  return null;
}

export function jsonResponse(c: Context, data: unknown, status = 200): Response {
  const origin = c.req.header("Origin") ?? null;
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": corsAllowOrigin(origin),
      "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
      Vary: "Origin",
    },
  });
}
