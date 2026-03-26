export function hyperswitchBaseUrl(): string {
  return process.env.HYPERSWITCH_BASE_URL?.trim().replace(/\/$/, "") ?? "";
}

export type PublicSignUpBody = { email: string; password: string };
export type AdminMerchantSignUpBody = {
  name: string;
  email: string;
  password: string;
  company_name: string;
};

export async function hyperswitchPublicSignup(
  base: string,
  body: PublicSignUpBody,
): Promise<{ token: string; token_type?: string }> {
  const res = await fetch(`${base}/user/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Hyperswitch POST /user/signup → ${res.status}: ${text.slice(0, 500)}`);
  }
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("Hyperswitch signup: response is not JSON");
  }
  const token = j.token;
  if (typeof token !== "string" || !token) {
    throw new Error(
      "Hyperswitch signup: no token (هل البناء مفعّل فيه feature email؟ عندها استخدم admin_merchant)",
    );
  }
  return { token, token_type: typeof j.token_type === "string" ? j.token_type : undefined };
}

export async function hyperswitchGetUserMerchantId(base: string, bearerToken: string): Promise<string> {
  const res = await fetch(`${base}/user`, {
    method: "GET",
    headers: { Authorization: `Bearer ${bearerToken}`, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Hyperswitch GET /user → ${res.status}: ${text.slice(0, 500)}`);
  }
  const j = JSON.parse(text) as Record<string, unknown>;
  const mid = j.merchant_id;
  if (typeof mid !== "string" || !mid) {
    throw new Error("Hyperswitch GET /user: missing merchant_id");
  }
  return mid;
}

export async function hyperswitchAdminSignupWithMerchant(
  base: string,
  adminApiKey: string,
  body: AdminMerchantSignUpBody,
): Promise<{ is_email_sent: boolean }> {
  const res = await fetch(`${base}/user/signup_with_merchant_id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": adminApiKey,
    },
    body: JSON.stringify({
      name: body.name,
      email: body.email,
      password: body.password,
      company_name: body.company_name,
      organization_type: null,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Hyperswitch POST /user/signup_with_merchant_id → ${res.status}: ${text.slice(0, 500)}`,
    );
  }
  const j = JSON.parse(text) as Record<string, unknown>;
  return { is_email_sent: Boolean(j.is_email_sent) };
}
