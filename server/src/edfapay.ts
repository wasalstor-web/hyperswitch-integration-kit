import { createHash } from "node:crypto";

/**
 * تكامل EdfaPay S2S حسب الوثائق العامة:
 * https://docs.edfapay.com/docs/authentication
 * https://docs.edfapay.com/reference/sale
 *
 * client_key = معرّف التاجر (UUID)
 * كلمة مرور التجزئة = السر المستخدم داخل صيغة MD5 (غالباً ما يُسمّى Merchant Password في الدليل)
 */

export type EdfaPayConfig = {
  clientKey: string;
  hashPassword: string;
  baseUrl: string;
  merchantProfile?: string;
  merchantCode?: string;
};

/** قراءة من متغيرات EDFAPAY_* أو الأسماء العامة السابقة (CLIENT_ID / CLIENT_SECRET) */
export function readEdfapayConfig(): EdfaPayConfig | null {
  const clientKey =
    process.env.EDFAPAY_CLIENT_KEY?.trim() || process.env.PAYMENT_GATEWAY_CLIENT_ID?.trim();
  const hashPassword =
    process.env.EDFAPAY_HASH_PASSWORD?.trim() || process.env.PAYMENT_GATEWAY_CLIENT_SECRET?.trim();
  if (!clientKey || !hashPassword) return null;

  const explicitBase = process.env.EDFAPAY_BASE_URL?.trim();
  const baseUrl = (
    explicitBase ||
    (process.env.EDFAPAY_USE_SANDBOX === "false" ? "https://api.edfapay.com" : "https://apidev.edfapay.com")
  ).replace(/\/$/, "");

  const merchantProfile =
    process.env.EDFAPAY_MERCHANT_PROFILE?.trim() ||
    process.env.PAYMENT_GATEWAY_MERCHANT_PROFILE?.trim();
  const merchantCode = process.env.EDFAPAY_MERCHANT_CODE?.trim();

  return {
    clientKey,
    hashPassword,
    baseUrl,
    merchantProfile: merchantProfile || undefined,
    merchantCode: merchantCode || undefined,
  };
}

/**
 * HASH = MD5( UPPERCASE( Reverse(payer_email) + password + Reverse(first6PAN + last4PAN) ) )
 */
export function edfapayOperationHash(payerEmail: string, fullCardPan: string, merchantPassword: string): string {
  const rev = (s: string) => [...s].reverse().join("");
  const pan = fullCardPan.replace(/\D/g, "");
  if (pan.length < 13) {
    throw new Error("Card PAN too short for hash (need full test PAN)");
  }
  const seg = pan.slice(0, 6) + pan.slice(-4);
  const base = rev(payerEmail) + merchantPassword + rev(seg);
  return createHash("md5").update(base.toUpperCase(), "utf8").digest("hex");
}

export type EdfaPayProbeResult = {
  httpStatus: number;
  ok: boolean;
  parsed: Record<string, unknown> | null;
  bodyPreview: string;
};

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/** طلب SALE تجريبي إلى sandbox (أو الإنتاج إن ضُبط BASE_URL) — بطاقة اختبار من وثائق EdfaPay */
export async function probeEdfapaySale(cfg: EdfaPayConfig): Promise<EdfaPayProbeResult> {
  const payerEmail =
    process.env.EDFAPAY_PROBE_PAYER_EMAIL?.trim() || "edfapay-probe@hyperswitch-kit.local";
  const cardNumber =
    process.env.EDFAPAY_PROBE_TEST_PAN?.trim().replace(/\D/g, "") || "5123450000000008";
  const expMonth = process.env.EDFAPAY_PROBE_EXP_MONTH?.trim() || "01";
  const expYear = process.env.EDFAPAY_PROBE_EXP_YEAR?.trim() || "2039";
  const cvv = process.env.EDFAPAY_PROBE_CVV?.trim() || "100";

  const hash = edfapayOperationHash(payerEmail, cardNumber, cfg.hashPassword);
  const orderId = `KIT-PROBE-${Date.now()}`;

  const form = new FormData();
  form.set("action", "SALE");
  form.set("client_key", cfg.clientKey);
  form.set("order_id", orderId);
  form.set("order_amount", "0.11");
  form.set("order_currency", "SAR");
  form.set("order_description", "Hyperswitch kit credential probe");
  form.set("req_token", "N");
  form.set("payer_first_name", "Probe");
  form.set("payer_last_name", "User");
  form.set("payer_address", payerEmail);
  form.set("payer_country", "SA");
  form.set("payer_city", "Riyadh");
  form.set("payer_zip", "12345");
  form.set("payer_email", payerEmail);
  form.set("payer_phone", "+966500000000");
  form.set("payer_ip", "203.0.113.1");
  form.set("term_url_3ds", "https://example.com/3ds-return");
  form.set("auth", "N");
  form.set("recurring_init", "N");
  form.set("hash", hash);
  form.set("card_number", cardNumber);
  form.set("card_exp_month", expMonth);
  form.set("card_exp_year", expYear);
  form.set("card_cvv2", cvv);

  const url = `${cfg.baseUrl}/payment/post`;
  const rawMs = Number(process.env.EDFAPAY_FETCH_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(rawMs) && rawMs >= 5_000 ? rawMs : 45_000;
  const res = await fetch(url, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // HTML أو نص
  }

  const resultField = parsed && typeof parsed.result === "string" ? parsed.result : null;
  const ok =
    res.ok &&
    parsed !== null &&
    (resultField === "REDIRECT" || resultField === "SUCCESS" || parsed.status === "REDIRECT");

  return {
    httpStatus: res.status,
    ok,
    parsed,
    bodyPreview: truncate(text, 400),
  };
}
