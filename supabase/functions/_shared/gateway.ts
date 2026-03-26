/** إرسال عبر بوابتكم؛ لاحقاً استبدلوا الجسم حسب عقد API المزوّد */
export async function sendViaGateway(body: Record<string, unknown>): Promise<Response> {
  const url = Deno.env.get("MESSAGE_GATEWAY_URL");
  if (!url) {
    console.warn("MESSAGE_GATEWAY_URL missing; message logged only");
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }
  const key = Deno.env.get("MESSAGE_GATEWAY_KEY") ?? "";
  return await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify(body),
  });
}
