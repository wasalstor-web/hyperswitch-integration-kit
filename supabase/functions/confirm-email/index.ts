import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sha256Hex } from "../_shared/hash.ts";

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
  let token: string;
  try {
    const j = await req.json();
    email = String(j.email ?? "").trim().toLowerCase();
    token = String(j.token ?? "").trim();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!email || !token) {
    return new Response(JSON.stringify({ error: "email and token required" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const hash = await sha256Hex(token);

  const { data: row, error: selErr } = await supabase
    .from("onboarding_sessions")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (selErr || !row) {
    return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (row.email_verified) {
    return new Response(JSON.stringify({ ok: true, alreadyVerified: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (
    !row.email_token_hash ||
    row.email_token_hash !== hash ||
    !row.email_token_expires_at ||
    new Date(row.email_token_expires_at) < new Date()
  ) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { error: updErr } = await supabase
    .from("onboarding_sessions")
    .update({
      email_verified: true,
      email_token_hash: null,
      email_token_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email);

  if (updErr) {
    return new Response(JSON.stringify({ error: "Update failed" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      nextStep: "request_otp",
      message: "Email verified. Call request-otp next.",
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
