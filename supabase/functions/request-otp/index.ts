import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { randomOtp6, sha256Hex } from "../_shared/hash.ts";
import { sendViaGateway } from "../_shared/gateway.ts";

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

  const { data: row, error } = await supabase
    .from("onboarding_sessions")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error || !row || !row.email_verified) {
    return new Response(
      JSON.stringify({ error: "Email not verified. Complete email step first." }),
      { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  if (row.completed_at) {
    return new Response(JSON.stringify({ error: "Onboarding already completed" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const otp = randomOtp6();
  const otpHash = await sha256Hex(otp);
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await supabase
    .from("onboarding_sessions")
    .update({
      otp_code_hash: otpHash,
      otp_expires_at: otpExpires,
      otp_attempts: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email);

  const gw = await sendViaGateway({
    channel: "email",
    to: email,
    template: "otp",
    data: { code: otp, expires: otpExpires },
  });

  await supabase.from("message_outbox").insert({
    channel: "email",
    recipient: email,
    template_key: "otp",
    payload: { expires: otpExpires },
    status: gw.ok ? "sent" : "failed",
    provider_status: gw.status,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      message: "OTP sent (dev: set DANGEROUS_RETURN_OTP=true to include code)",
      dev_otp: Deno.env.get("DANGEROUS_RETURN_OTP") === "true" ? otp : undefined,
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
