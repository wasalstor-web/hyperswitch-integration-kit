import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Prisma, PrismaClient } from "@prisma/client";
import { OutboxStatus } from "@prisma/client";
import { outboxStatusFromGateway, sendViaGateway } from "./gateway.js";
import { randomOtp6, randomTokenHex, sha256Hex } from "./hash.js";
import {
  hyperswitchAdminSignupWithMerchant,
  hyperswitchBaseUrl,
  hyperswitchGetUserMerchantId,
  hyperswitchPublicSignup,
} from "./hyperswitch.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_OTP_ATTEMPTS = 5;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function createApp(prisma: PrismaClient) {
  const app = new Hono();

  app.use(
    "/*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["authorization", "x-client-info", "apikey", "content-type"],
    }),
  );

  app.get("/health", () => json({ ok: true, service: "hyperswitch-integration-kit-api" }));

  app.use("/functions/v1/*", async (c, next) => {
    if (c.req.method === "OPTIONS") return next();
    const key = process.env.INTERNAL_API_KEY?.trim();
    if (key) {
      const h = c.req.header("Authorization");
      if (h !== `Bearer ${key}`) {
        return json({ error: "Unauthorized" }, 401);
      }
    }
    return next();
  });

  app.post("/functions/v1/request-email-verification", async (c) => {
    let email: string;
    try {
      const j = await c.req.json();
      email = String(j.email ?? "")
        .trim()
        .toLowerCase();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    if (!email || !email.includes("@")) {
      return json({ error: "Invalid email" }, 400);
    }

    const rawToken = randomTokenHex(24);
    const tokenHash = sha256Hex(rawToken);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    try {
      await prisma.onboardingSession.upsert({
        where: { email },
        create: {
          email,
          emailVerified: false,
          emailTokenHash: tokenHash,
          emailTokenExpiresAt: new Date(expires),
          otpCodeHash: null,
          otpExpiresAt: null,
          otpAttempts: 0,
          completedAt: null,
          hyperswitchMerchantId: null,
        },
        update: {
          emailVerified: false,
          emailTokenHash: tokenHash,
          emailTokenExpiresAt: new Date(expires),
          otpCodeHash: null,
          otpExpiresAt: null,
          otpAttempts: 0,
          completedAt: null,
        },
      });
    } catch (e) {
      console.error(e);
      return json({ error: "Database error" }, 500);
    }

    const base = process.env.PUBLIC_APP_VERIFY_URL?.trim() ?? "https://your-frontend.example/verify-email";
    const verifyLink = `${base.replace(/\/$/, "")}?email=${encodeURIComponent(email)}&token=${rawToken}`;

    const gw = await sendViaGateway({
      channel: "email",
      to: email,
      template: "email_verification",
      data: { verifyLink, expires },
    });
    const outboxStatus = outboxStatusFromGateway(gw) as OutboxStatus;

    const providerBodyObj: Record<string, unknown> =
      gw.providerBody && typeof gw.providerBody === "object" && gw.providerBody !== null
        ? { ...(gw.providerBody as Record<string, unknown>) }
        : {};
    if (gw.error) providerBodyObj.gateway_error = gw.error;

    await prisma.messageOutbox.create({
      data: {
        channel: "email",
        recipient: email,
        templateKey: "email_verification",
        payload: { verifyLink, expires },
        status: outboxStatus,
        providerStatus: gw.httpStatus ?? null,
        providerBody: providerBodyObj as Prisma.InputJsonValue,
      },
    });

    const gatewayHint =
      outboxStatus === "skipped"
        ? " (لم يُرسل بريد: اضبط MESSAGE_GATEWAY_URL أو استخدم dev_token إن وُجد)"
        : outboxStatus === "failed"
          ? " (فشل الإرسال عبر البوابة — راجع message_outbox وإعدادات البوابة)"
          : "";

    return json({
      ok: true,
      gateway: outboxStatus,
      message: "If the email exists in our system, a verification link was sent." + gatewayHint,
      dev_token: process.env.DANGEROUS_RETURN_TOKEN === "true" ? rawToken : undefined,
    });
  });

  app.post("/functions/v1/confirm-email", async (c) => {
    let email: string;
    let token: string;
    try {
      const j = await c.req.json();
      email = String(j.email ?? "")
        .trim()
        .toLowerCase();
      token = String(j.token ?? "").trim();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    if (!email || !token) {
      return json({ error: "email and token required" }, 400);
    }

    const hash = sha256Hex(token);
    const row = await prisma.onboardingSession.findUnique({ where: { email } });
    if (!row) {
      return json({ error: "Invalid or expired link" }, 400);
    }
    if (row.emailVerified) {
      return json({ ok: true, alreadyVerified: true });
    }
    if (
      !row.emailTokenHash ||
      row.emailTokenHash !== hash ||
      !row.emailTokenExpiresAt ||
      row.emailTokenExpiresAt < new Date()
    ) {
      return json({ error: "Invalid or expired token" }, 400);
    }

    await prisma.onboardingSession.update({
      where: { email },
      data: {
        emailVerified: true,
        emailTokenHash: null,
        emailTokenExpiresAt: null,
      },
    });

    return json({
      ok: true,
      nextStep: "request_otp",
      message: "Email verified. Call request-otp next.",
    });
  });

  app.post("/functions/v1/request-otp", async (c) => {
    let email: string;
    try {
      const j = await c.req.json();
      email = String(j.email ?? "")
        .trim()
        .toLowerCase();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const row = await prisma.onboardingSession.findUnique({ where: { email } });
    if (!row || !row.emailVerified) {
      return json({ error: "Email not verified. Complete email step first." }, 403);
    }
    if (row.completedAt) {
      return json({ error: "Onboarding already completed" }, 400);
    }

    const otp = randomOtp6();
    const otpHash = sha256Hex(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    try {
      await prisma.onboardingSession.update({
        where: { email },
        data: {
          otpCodeHash: otpHash,
          otpExpiresAt: new Date(otpExpires),
          otpAttempts: 0,
        },
      });
    } catch (e) {
      console.error(e);
      return json({ error: "Failed to store OTP" }, 500);
    }

    const gw = await sendViaGateway({
      channel: "email",
      to: email,
      template: "otp",
      data: { code: otp, expires: otpExpires },
    });
    const outboxStatus = outboxStatusFromGateway(gw) as OutboxStatus;

    const providerBodyObj: Record<string, unknown> =
      gw.providerBody && typeof gw.providerBody === "object" && gw.providerBody !== null
        ? { ...(gw.providerBody as Record<string, unknown>) }
        : {};
    if (gw.error) providerBodyObj.gateway_error = gw.error;

    await prisma.messageOutbox.create({
      data: {
        channel: "email",
        recipient: email,
        templateKey: "otp",
        payload: { expires: otpExpires },
        status: outboxStatus,
        providerStatus: gw.httpStatus ?? null,
        providerBody: providerBodyObj as Prisma.InputJsonValue,
      },
    });

    const gatewayHint =
      outboxStatus === "skipped"
        ? " (لم يُرسل OTP: اضبط MESSAGE_GATEWAY_URL أو DANGEROUS_RETURN_OTP)"
        : outboxStatus === "failed"
          ? " (فشل الإرسال عبر البوابة)"
          : "";

    return json({
      ok: true,
      gateway: outboxStatus,
      message: "OTP sent (dev: set DANGEROUS_RETURN_OTP=true to include code)" + gatewayHint,
      dev_otp: process.env.DANGEROUS_RETURN_OTP === "true" ? otp : undefined,
    });
  });

  app.post("/functions/v1/verify-otp", async (c) => {
    let email: string;
    let code: string;
    try {
      const j = await c.req.json();
      email = String(j.email ?? "")
        .trim()
        .toLowerCase();
      code = String(j.code ?? "")
        .replace(/\D/g, "")
        .slice(0, 6);
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    if (!email || code.length !== 6) {
      return json({ error: "email and 6-digit code required" }, 400);
    }

    const row = await prisma.onboardingSession.findUnique({ where: { email } });
    if (!row || !row.emailVerified) {
      return json({ error: "Invalid session" }, 400);
    }
    if ((row.otpAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
      return json({ error: "Too many attempts. Request a new OTP." }, 429);
    }
    if (!row.otpCodeHash || !row.otpExpiresAt || row.otpExpiresAt < new Date()) {
      return json({ error: "No valid OTP. Request a new one." }, 400);
    }

    const hash = sha256Hex(code);
    if (hash !== row.otpCodeHash) {
      await prisma.onboardingSession.update({
        where: { email },
        data: { otpAttempts: (row.otpAttempts ?? 0) + 1 },
      });
      return json({ error: "Wrong code" }, 400);
    }

    const now = new Date();
    await prisma.onboardingSession.update({
      where: { email },
      data: {
        completedAt: now,
        otpCodeHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });

    return json({
      ok: true,
      verified: true,
      message:
        "OTP OK. Next: create Supabase Auth session from your backend or call Hyperswitch APIs with server-side keys.",
    });
  });

  app.post("/functions/v1/register-hyperswitch-merchant", async (c) => {
    const base = hyperswitchBaseUrl();
    if (!base) {
      return json({ error: "HYPERSWITCH_BASE_URL not configured" }, 500);
    }

    let email: string;
    let password: string;
    let company_name: string;
    let name: string;
    try {
      const j = await c.req.json();
      email = String(j.email ?? "")
        .trim()
        .toLowerCase();
      password = String(j.password ?? "");
      company_name = String(j.company_name ?? "").trim();
      name = String(j.name ?? j.display_name ?? company_name).trim() || company_name;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    if (!email || !password || !company_name) {
      return json({ error: "email, password, and company_name required" }, 400);
    }

    const row = await prisma.onboardingSession.findUnique({ where: { email } });
    if (!row?.completedAt) {
      return json({ error: "أكمل التحقق (بريد + OTP) قبل ربط Hyperswitch" }, 403);
    }
    if (row.hyperswitchMerchantId) {
      return json({
        ok: true,
        alreadyLinked: true,
        merchant_id: row.hyperswitchMerchantId,
      });
    }

    const adminKey = process.env.HYPERSWITCH_ADMIN_API_KEY?.trim() ?? "";
    const modeEnv = process.env.HYPERSWITCH_REGISTRATION_MODE?.trim().toLowerCase();
    const mode =
      modeEnv === "public_signup" || modeEnv === "admin_merchant"
        ? modeEnv
        : adminKey
          ? "admin_merchant"
          : "public_signup";

    try {
      if (mode === "admin_merchant") {
        if (!adminKey) {
          return json({ error: "admin_merchant يتطلب HYPERSWITCH_ADMIN_API_KEY" }, 500);
        }
        const { is_email_sent } = await hyperswitchAdminSignupWithMerchant(base, adminKey, {
          name,
          email,
          password,
          company_name,
        });
        return json({
          ok: true,
          mode: "admin_merchant",
          is_email_sent,
          message: is_email_sent
            ? "أُنشئ الحساب في Hyperswitch؛ أكمل التحقق من البريد من رسالة Hyperswitch ثم سجّل الدخول للوحة."
            : "أُنشئ الحساب في Hyperswitch؛ سجّل الدخول بالبريد وكلمة المرور.",
          merchant_id: null,
        });
      }

      const { token } = await hyperswitchPublicSignup(base, { email, password });
      const merchant_id = await hyperswitchGetUserMerchantId(base, token);

      await prisma.onboardingSession.update({
        where: { email },
        data: { hyperswitchMerchantId: merchant_id },
      });

      const devJwt = process.env.DANGEROUS_RETURN_HS_JWT === "true" ? token : undefined;

      return json({
        ok: true,
        mode: "public_signup",
        merchant_id,
        message:
          "تم الربط. استخدم البريد وكلمة المرور لتسجيل الدخول في لوحة Hyperswitch (Control Center).",
        dev_hyperswitch_jwt: devJwt,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(msg);
      return json({ error: msg }, 502);
    }
  });

  return app;
}
