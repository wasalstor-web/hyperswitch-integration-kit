import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sha256Hex } from "../_shared/hash.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;

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
  let code: string;
  try {
    const j = await req.json();
    email = String(j.email ?? "").trim().toLowerCase();
    code = String(j.code ?? "").replace(/\D/g, "").slice(0, 6);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!email || code.length !== 6) {
    return new Response(JSON.stringify({ error: "email and 6-digit code required" }), {
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
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if ((row.otp_attempts ?? 0) >= MAX_ATTEMPTS) {
    return new Response(JSON.stringify({ error: "Too many attempts. Request a new OTP." }), {
      status: 429,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (
    !row.otp_code_hash ||
    !row.otp_expires_at ||
    new Date(row.otp_expires_at) < new Date()
  ) {
    return new Response(JSON.stringify({ error: "No valid OTP. Request a new one." }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const hash = await sha256Hex(code);
  if (hash !== row.otp_code_hash) {
    await supabase
      .from("onboarding_sessions")
      .update({
        otp_attempts: (row.otp_attempts ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);
    return new Response(JSON.stringify({ error: "Wrong code" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const now = new Date().toISOString();
  await supabase
    .from("onboarding_sessions")
    .update({
      completed_at: now,
      otp_code_hash: null,
      otp_expires_at: null,
      otp_attempts: 0,
      updated_at: now,
    })
    .eq("email", email);

  return new Response(
    JSON.stringify({
      ok: true,
      verified: true,
      message:
        "OTP OK. Next: create Supabase Auth session from your backend or call Hyperswitch APIs with server-side keys.",
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
