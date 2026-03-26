/**
 * تشغيل يدوي: يتحقق من اتصال EdfaPay بدون تشغيل خادم Hono كامل.
 * من جذر المشروع، مع متغيرات البيئة (لا تُخزَّن في git):
 *   npx tsx scripts/edfapay-live-probe.ts
 */
import { config } from "dotenv";
import path from "node:path";
import { probeEdfapaySale, readEdfapayConfig } from "../server/src/edfapay.js";

config({ path: path.join(process.cwd(), ".env") });

async function main() {
  const cfg = readEdfapayConfig();
  if (!cfg) {
    console.error("Missing EDFAPAY_CLIENT_KEY + EDFAPAY_HASH_PASSWORD (or PAYMENT_GATEWAY_CLIENT_ID/SECRET).");
    process.exit(1);
  }
  const mask = (s: string) => `${s.slice(0, 8)}…`;
  console.error(`[edfapay-live-probe] ${cfg.baseUrl} client_key=${mask(cfg.clientKey)}`);
  const r = await probeEdfapaySale(cfg);
  const out = {
    httpStatus: r.httpStatus,
    ok: r.ok,
    result: r.parsed && typeof r.parsed.result === "string" ? r.parsed.result : null,
    status: r.parsed && typeof r.parsed.status === "string" ? r.parsed.status : null,
    error_code: r.parsed && (r.parsed.error_code ?? r.parsed.code),
    bodyPreview: r.bodyPreview,
  };
  console.log(JSON.stringify(out, null, 2));
  process.exit(r.ok ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
