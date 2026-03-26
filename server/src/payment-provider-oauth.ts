/**
 * تجربة OAuth2 لبوابة دفع خارجية (client_credentials).
 * الأسرار تُقرأ من البيئة فقط — لا تُخزَّن في الكود أو git.
 */

export type PaymentGatewayOAuthConfig = {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  /** form: body grant_type+client_id+secret | basic: Authorization Basic + grant body */
  authMode: "form" | "basic";
};

export function readPaymentGatewayOAuthConfig(): PaymentGatewayOAuthConfig | null {
  const tokenUrl = process.env.PAYMENT_GATEWAY_TOKEN_URL?.trim();
  const clientId = process.env.PAYMENT_GATEWAY_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYMENT_GATEWAY_CLIENT_SECRET?.trim();
  if (!tokenUrl || !clientId || !clientSecret) return null;
  const scope = process.env.PAYMENT_GATEWAY_SCOPE?.trim();
  const authMode = process.env.PAYMENT_GATEWAY_AUTH_MODE === "basic" ? "basic" : "form";
  return { tokenUrl, clientId, clientSecret, scope: scope || undefined, authMode };
}

export type TokenProbeResult = {
  httpStatus: number;
  ok: boolean;
  /** لا يُعاد التوكن — فقط هل وُجد access_token في JSON */
  accessTokenReceived: boolean;
  bodyPreview: string;
};

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export async function probePaymentGatewayToken(cfg: PaymentGatewayOAuthConfig): Promise<TokenProbeResult> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  if (cfg.scope) body.set("scope", cfg.scope);

  if (cfg.authMode === "basic") {
    const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
    headers.Authorization = `Basic ${basic}`;
  } else {
    body.set("client_id", cfg.clientId);
    body.set("client_secret", cfg.clientSecret);
  }

  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  const text = await res.text();
  let accessTokenReceived = false;
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    accessTokenReceived =
      typeof j.access_token === "string" ||
      typeof j.token === "string" ||
      typeof j.accessToken === "string";
  } catch {
    // ليس JSON
  }

  return {
    httpStatus: res.status,
    ok: res.ok && accessTokenReceived,
    accessTokenReceived,
    bodyPreview: truncate(text, 280),
  };
}
