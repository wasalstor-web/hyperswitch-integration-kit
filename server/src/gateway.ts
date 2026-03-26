export type GatewaySendResult = {
  outcome: "skipped" | "sent" | "failed";
  httpStatus?: number;
  error?: string;
  providerBody?: unknown;
};

const DEFAULT_TIMEOUT_MS = 15_000;

export async function sendViaGateway(body: Record<string, unknown>): Promise<GatewaySendResult> {
  const url = process.env.MESSAGE_GATEWAY_URL?.trim();
  if (!url) {
    console.warn("MESSAGE_GATEWAY_URL missing; message not sent to external gateway");
    return { outcome: "skipped", error: "MESSAGE_GATEWAY_URL not set" };
  }

  const key = process.env.MESSAGE_GATEWAY_KEY ?? "";
  const raw = Number(process.env.MESSAGE_GATEWAY_TIMEOUT_MS);
  const timeoutMs = Math.min(Math.max(raw || DEFAULT_TIMEOUT_MS, 1000), 120_000);

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(id);

    const text = await res.text();
    let providerBody: unknown = undefined;
    if (text) {
      try {
        providerBody = JSON.parse(text) as unknown;
      } catch {
        providerBody = { raw: text.slice(0, 2000) };
      }
    }

    if (res.ok) {
      return { outcome: "sent", httpStatus: res.status, providerBody };
    }
    return {
      outcome: "failed",
      httpStatus: res.status,
      error: `Gateway HTTP ${res.status}`,
      providerBody,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isAbort = msg.includes("abort") || (e instanceof Error && e.name === "AbortError");
    return {
      outcome: "failed",
      error: isAbort ? `Gateway timeout after ${timeoutMs}ms` : msg,
    };
  }
}

export function outboxStatusFromGateway(gw: GatewaySendResult): "skipped" | "sent" | "failed" {
  return gw.outcome;
}
