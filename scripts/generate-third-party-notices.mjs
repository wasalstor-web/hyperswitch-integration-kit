#!/usr/bin/env node
/**
 * يبني THIRD_PARTY_NOTICES.md من package-lock.json (الجذر + web/).
 * لا يحتاج حزماً إضافية — يقرأ حقل license من npm lockfile v3.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

/**
 * @param {string} lockPath
 * @param {"root"|"web"} scope
 * @returns {Map<string, { name: string, version: string, licenses: Set<string>, scopes: Set<string>, dev: boolean }>}
 */
function collectFromLock(lockPath, scope) {
  const map = new Map();
  let lock;
  try {
    lock = JSON.parse(readFileSync(lockPath, "utf8"));
  } catch {
    return map;
  }
  const packages = lock.packages || {};
  for (const [key, meta] of Object.entries(packages)) {
    if (key === "" || !key.startsWith("node_modules/")) continue;
    const rel = key.slice("node_modules/".length);
    if (rel.includes("/node_modules/")) continue;
    const name = rel;
    const version = meta.version;
    if (!version) continue;
    const id = `${name}@${version}`;
    const lic =
      typeof meta.license === "string"
        ? meta.license
        : Array.isArray(meta.license)
          ? meta.license.map((x) => x.type || x).join(", ")
          : meta.license?.type || "SEE_PACKAGE";
    const dev = meta.dev === true;
    let row = map.get(id);
    if (!row) {
      row = {
        name,
        version,
        licenses: new Set(),
        scopes: new Set(),
        dev: false,
      };
      map.set(id, row);
    }
    row.licenses.add(lic);
    row.scopes.add(scope);
    row.dev = row.dev || dev;
  }
  return map;
}

function mergeMaps(a, b) {
  const out = new Map(a);
  for (const [id, row] of b) {
    const ex = out.get(id);
    if (!ex) {
      out.set(id, {
        ...row,
        licenses: new Set(row.licenses),
        scopes: new Set(row.scopes),
      });
    } else {
      for (const l of row.licenses) ex.licenses.add(l);
      for (const s of row.scopes) ex.scopes.add(s);
      ex.dev = ex.dev || row.dev;
    }
  }
  return out;
}

const rootLock = join(root, "package-lock.json");
const webLock = join(root, "web", "package-lock.json");

let combined = collectFromLock(rootLock, "root");
if (combined.size === 0) {
  console.error("No packages found in root package-lock.json");
  process.exit(1);
}
combined = mergeMaps(combined, collectFromLock(webLock, "web"));

const rows = [...combined.values()].sort((x, y) =>
  x.name.localeCompare(y.name, "en") || x.version.localeCompare(y.version, "en"),
);

const today = new Date().toISOString().slice(0, 10);

const table = [
  "| الحزمة | الإصدار | الترخيص (من npm) | النطاق | dev |",
  "|--------|---------|------------------|--------|-----|",
  ...rows.map((r) => {
    const lic = [...r.licenses].sort().join(" / ");
    const sc = [...r.scopes].sort().join(", ");
    return `| \`${r.name}\` | ${r.version} | ${lic} | ${sc} | ${r.dev ? "نعم" : "لا"} |`;
  }),
].join("\n");

const body = `# إشعارات الطرف الثالث (npm)

> توليد آلي: \`npm run licenses:notices\` — لا يُحرَّر يدوياً إلا عند الحاجة؛ أعد التوليد بعد \`npm install\`.

**تاريخ التوليد:** ${today}

## حزم npm (من package-lock.json)

${table}

## خدمات ومشاريع خارجية (ليست من npm)

| المكوّن | ملاحظة |
|---------|--------|
| **Hyperswitch** | واجهة Router مفتوحة المصدر — راجع [juspay/hyperswitch](https://github.com/juspay/hyperswitch) وترخيص Apache-2.0. |
| **Supabase** (اختياري) | Edge Functions / Auth — راجع [supabase/supabase](https://github.com/supabase/supabase) والوثائق الرسمية. |
| **خط Tajawal** | يُحمَّل من Google Fonts في الواجهة — التزم بشروط الاستخدام عند الإنتاج. |

---

انظر أيضاً: [docs/OPEN_SOURCE_INTERFACES_AR.md](docs/OPEN_SOURCE_INTERFACES_AR.md) و [LICENSE](LICENSE).
`;

const outPath = join(root, "THIRD_PARTY_NOTICES.md");
writeFileSync(outPath, body, "utf8");
console.log(`Wrote ${outPath} (${rows.length} packages).`);
