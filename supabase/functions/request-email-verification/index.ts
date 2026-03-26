import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { randomTokenHex, sha256Hex } from "../_shared/hash.ts";
import { outboxStatusFromGateway, sendViaGateway } from "../_shared/gateway.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let email: string;
  try {
    const j = await req.json();
    email = String(j.email ?? "").trim().toLowerCase();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ error: "Invalid email" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const rawToken = randomTokenHex(24);
  const tokenHash = await sha256Hex(rawToken);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error: upErr } = await supabase.from("onboarding_sessions").upsert(
    {
      email,
      email_verified: false,
      email_token_hash: tokenHash,
      email_token_expires_at: expires,
      otp_code_hash: null,
      otp_expires_at: null,
      otp_attempts: 0,
      completed_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );

  if (upErr) {
    console.error(upErr);
    return new Response(JSON.stringify({ error: "Database error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const base =
    Deno.env.get("PUBLIC_APP_VERIFY_URL") ??
    "https://your-frontend.example/verify-email";
  const verifyLink = `${base}?email=${encodeURIComponent(email)}&token=${rawToken}`;

  const gw = await sendViaGateway({
    channel: "email",
    to: email,
    template: "email_verification",
    data: { verifyLink, expires },
  });
  const outboxStatus = outboxStatusFromGateway(gw);
  await supabase.from("message_outbox").insert({
    channel: "email",
    recipient: email,
    template_key: "email_verification",
    payload: { verifyLink, expires },
    status: outboxStatus,
    provider_status: gw.httpStatus ?? null,
    provider_body: {
      ...(gw.providerBody && typeof gw.providerBody === "object" && gw.providerBody !== null
        ? (gw.providerBody as Record<string, unknown>)
        : {}),
      ...(gw.error ? { gateway_error: gw.error } : {}),
    },
  });

  const gatewayHint =
    outboxStatus === "skipped"
      ? " (لم يُرسل بريد: اضبط MESSAGE_GATEWAY_URL أو استخدم dev_token إن وُجد)"
      : outboxStatus === "failed"
        ? " (فشل الإرسال عبر البوابة — راجع message_outbox وإعدادات البوابة)"
        : "";

  return new Response(
    JSON.stringify({
      ok: true,
      gateway: outboxStatus,
      message:
        "If the email exists in our system, a verification link was sent." + gatewayHint,
      dev_token: Deno.env.get("DANGEROUS_RETURN_TOKEN") === "true" ? rawToken : undefined,
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
