import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  hyperswitchAdminSignupWithMerchant,
  hyperswitchBaseUrl,
  hyperswitchGetUserMerchantId,
  hyperswitchPublicSignup,
} from "../_shared/hyperswitch.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * بعد نجاح verify-otp: ربط الحساب بـ Hyperswitch (تاجر + مستخدم لوحة التحكم).
 *
 * أسرار بيئة:
 * - HYPERSWITCH_BASE_URL (مثلاً http://hyperswitch-server:8080 أو https://api.example.com)
 * - HYPERSWITCH_ADMIN_API_KEY (اختياري) — إن وُجد يُفضَّل مسار admin_merchant ما لم تضبط HYPERSWITCH_REGISTRATION_MODE=public_signup
 * - HYPERSWITCH_REGISTRATION_MODE: public_signup | admin_merchant (اختياري؛ يُستنتج من المفتاح)
 * - DANGEROUS_RETURN_HS_JWT=true (تطوير فقط) لإرجاع JWT Hyperswitch في JSON
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const base = hyperswitchBaseUrl();
  if (!base) {
    return new Response(
      JSON.stringify({ error: "HYPERSWITCH_BASE_URL not configured" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let email: string;
  let password: string;
  let company_name: string;
  let name: string;
  try {
    const j = await req.json();
    email = String(j.email ?? "").trim().toLowerCase();
    password = String(j.password ?? "");
    company_name = String(j.company_name ?? "").trim();
    name = String(j.name ?? j.display_name ?? company_name).trim() || company_name;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!email || !password || !company_name) {
    return new Response(
      JSON.stringify({ error: "email, password, and company_name required" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const { data: row, error: selErr } = await supabase
    .from("onboarding_sessions")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (selErr || !row?.completed_at) {
    return new Response(
      JSON.stringify({
        error: "أكمل التحقق (بريد + OTP) قبل ربط Hyperswitch",
      }),
      { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  if (row.hyperswitch_merchant_id) {
    return new Response(
      JSON.stringify({
        ok: true,
        alreadyLinked: true,
        merchant_id: row.hyperswitch_merchant_id,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const adminKey = Deno.env.get("HYPERSWITCH_ADMIN_API_KEY")?.trim() ?? "";
  const modeEnv = Deno.env.get("HYPERSWITCH_REGISTRATION_MODE")?.trim().toLowerCase();
  const mode =
    modeEnv === "public_signup" || modeEnv === "admin_merchant"
      ? modeEnv
      : adminKey
        ? "admin_merchant"
        : "public_signup";

  try {
    if (mode === "admin_merchant") {
      if (!adminKey) {
        return new Response(
          JSON.stringify({
            error: "admin_merchant يتطلب HYPERSWITCH_ADMIN_API_KEY",
          }),
          { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
      const { is_email_sent } = await hyperswitchAdminSignupWithMerchant(base, adminKey, {
        name,
        email,
        password,
        company_name,
      });
      await supabase
        .from("onboarding_sessions")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("email", email);

      return new Response(
        JSON.stringify({
          ok: true,
          mode: "admin_merchant",
          is_email_sent,
          message: is_email_sent
            ? "أُنشئ الحساب في Hyperswitch؛ أكمل التحقق من البريد من رسالة Hyperswitch ثم سجّل الدخول للوحة."
            : "أُنشئ الحساب في Hyperswitch؛ سجّل الدخول بالبريد وكلمة المرور.",
          merchant_id: null,
        }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const { token } = await hyperswitchPublicSignup(base, { email, password });
    const merchant_id = await hyperswitchGetUserMerchantId(base, token);

    const { error: updErr } = await supabase
      .from("onboarding_sessions")
      .update({
        hyperswitch_merchant_id: merchant_id,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);

    if (updErr) {
      console.error(updErr);
      return new Response(JSON.stringify({ error: "Failed to save merchant_id" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const devJwt = Deno.env.get("DANGEROUS_RETURN_HS_JWT") === "true" ? token : undefined;

    return new Response(
      JSON.stringify({
        ok: true,
        mode: "public_signup",
        merchant_id,
        message:
          "تم الربط. استخدم البريد وكلمة المرور لتسجيل الدخول في لوحة Hyperswitch (Control Center).",
        dev_hyperswitch_jwt: devJwt,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
