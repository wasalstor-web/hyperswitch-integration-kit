import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function edfapayPlatformConfigured(): boolean {
  const k =
    Deno.env.get("EDFAPAY_CLIENT_KEY")?.trim() || Deno.env.get("PAYMENT_GATEWAY_CLIENT_ID")?.trim();
  const p =
    Deno.env.get("EDFAPAY_HASH_PASSWORD")?.trim() ||
    Deno.env.get("PAYMENT_GATEWAY_CLIENT_SECRET")?.trim();
  return Boolean(k && p);
}

/**
 * بعد verify-otp (ويفضّل بعد register-hyperswitch-merchant): حفظ ربط ملف مبسّط/EdfaPay للتاجر.
 * أسرار المنصة: EDFAPAY_CLIENT_KEY + EDFAPAY_HASH_PASSWORD (أو أسماء PAYMENT_GATEWAY_*).
 * اختياري افتراضي للملف: EDFAPAY_MERCHANT_PROFILE أو EDFAPAY_MERCHANT_CODE.
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

  if (!edfapayPlatformConfigured()) {
    return new Response(
      JSON.stringify({
        error:
          "منصة الدفع غير مهيأة في أسرار الدوال (EDFAPAY_CLIENT_KEY + EDFAPAY_HASH_PASSWORD).",
      }),
      { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  let email: string;
  let profileFromBody = "";
  try {
    const j = await req.json();
    email = String(j.email ?? "").trim().toLowerCase();
    const raw = j.profile_code ?? j.edfapay_profile_code;
    if (raw != null) profileFromBody = String(raw).trim();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!email) {
    return new Response(JSON.stringify({ error: "email required" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const envProfile =
    Deno.env.get("EDFAPAY_MERCHANT_PROFILE")?.trim() ||
    Deno.env.get("EDFAPAY_MERCHANT_CODE")?.trim() ||
    "";
  const profileCode = profileFromBody || envProfile;
  if (!profileCode) {
    return new Response(
      JSON.stringify({
        error:
          "أدخل profile_code أو اضبط EDFAPAY_MERCHANT_PROFILE في أسرار الدوال.",
      }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: row, error: selErr } = await supabase
    .from("onboarding_sessions")
    .select("completed_at, hyperswitch_merchant_id, edfapay_linked_at")
    .eq("email", email)
    .maybeSingle();

  if (selErr || !row?.completed_at) {
    return new Response(
      JSON.stringify({ error: "أكمل التحقق (بريد + OTP) قبل ربط ملف الدفع" }),
      { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const hadLink = Boolean(row.edfapay_linked_at);

  const { error: upErr } = await supabase
    .from("onboarding_sessions")
    .update({
      edfapay_profile_code: profileCode,
      edfapay_linked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("email", email);

  if (upErr) {
    return new Response(JSON.stringify({ error: upErr.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      updated: hadLink,
      message:
        "تم تسجيل ربط ملف الدفع على منصتك. أكمل إعداد المعالج في Hyperswitch ولوحة مبسّط.",
      edfapay_profile_code: profileCode,
      hyperswitch_merchant_id: row.hyperswitch_merchant_id,
      portals: {
        mubasat: "https://mubasat.edfapay.com/login",
        edfapay_docs: "https://docs.edfapay.com/",
      },
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
