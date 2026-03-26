# ترتيب النشر (عربي) — Hyperswitch Integration Kit

اتبع الخطوات **بالترتيب**. اختر **أ** (سحابي) أو **ب** (سيرفر مفتوح المصدر) حسب بيئتك.

---

## تجهيز المستودع (مرة واحدة)

1. استنساخ المشروع وفتح الطرفية في جذره.
2. (اختياري) `.\scripts\preflight.ps1 -RequireEnvLocal` قبل التطوير المحلي للواجهة.

---

## أ) Supabase سحابي (`*.supabase.co`)

| # | الخطوة | الأمر / المكان |
|---|--------|----------------|
| 1 | إنشاء مشروع في [Supabase Dashboard](https://supabase.com/dashboard) | — |
| 2 | حفظ **Project ref** و **anon key** | Settings → API |
| 3 | ربط CLI ودفع المخطط | `$env:SUPABASE_ACCESS_TOKEN="sbp_..."` ثم `.\scripts\deploy-supabase.ps1`  
   أو يدويًا: `npx supabase link --project-ref <ref>` → `npx supabase db push` → `npx supabase functions deploy` |
| 4 | أسرار الدوال | Dashboard → Edge Functions → Secrets: `PUBLIC_APP_VERIFY_URL`، `MESSAGE_GATEWAY_URL` (إن وُجد)، `HYPERSWITCH_BASE_URL`، … — انظر [complete-runbook-ar.md](complete-runbook-ar.md) |
| 5 | واجهة الويب محليًا | `cd web` → نسخ `.env.example` إلى `.env.local` → ضبط `VITE_SUPABASE_*` → `npm install` → `npm run dev` |
| 6 | واجهة للإنتاج / Docker | بناء بقيم الإنتاج: `VITE_SUPABASE_URL` = عنوان مشروعك السحابي؛ انشر حاوية `deploy/hostinger` إن رغبت — [deploy/hostinger/README.md](../deploy/hostinger/README.md) |

---

## ب) Supabase مفتوح المصدر على السيرفر (Docker)

| # | الخطوة | المرجع |
|---|--------|--------|
| 1 | تشغيل مكدس Supabase الرسمي على الـ VPS | [Self-Hosting Docker](https://supabase.com/docs/guides/self-hosting/docker) |
| 2 | ضبط `SUPABASE_PUBLIC_URL` / Kong على HTTPS | [HOSTINGER_SELFHOSTED_AR.md](HOSTINGER_SELFHOSTED_AR.md) |
| 3 | تنفيذ **كل** ملفات `supabase/migrations/*.sql` على Postgres | SQL Editor أو `psql` |
| 4 | نسخ Edge Functions إلى `volumes/functions` | `.\scripts\package-for-selfhosted.ps1` ثم نسخ `build/selfhosted-edge-functions/` |
| 5 | متغيرات بيئة خدمة `functions` | نفس أسماء أسرار السحابي + `HYPERSWITCH_BASE_URL` داخل الشبكة الدocker |
| 6 | بناء الواجهة بـ `VITE_SUPABASE_URL` = عنوان **Kong** العام | ثم Docker `deploy/hostinger` أو استضافة ثابتة |

---

## ج) خادم API في Docker (Postgres مباشر، بدون Edge)

| # | الخطوة | المرجع |
|---|--------|---------|
| 1 | نسخ `.env.docker.example` → `.env` وضبط الأسرار والمنفذ | [DOCKER_STACK_AR.md](DOCKER_STACK_AR.md) |
| 2 | `docker compose --env-file .env.docker up --build` محلياً | نفس المستند |
| 3 | على VPS مع Traefik | صورة `docker/Dockerfile.api` خلف البروكسي؛ مجلد `deploy/hostinger` في هذا المشروع يبني **واجهة SPA فقط** — اربط الواجهة بعنوان الـ API العام (`VITE_API_BASE_URL`). |

---

## Hyperswitch (منفصل)

- بعد `verify-otp`، الدالة `register-hyperswitch-merchant` تحتاج **`HYPERSWITCH_BASE_URL`** تصل إليه حاوية الدوال.
- تشغيل Hyperswitch من [مستودع Hyperswitch](https://github.com/juspay/hyperswitch) — ليس داخل `docker-compose` الخاص بـ `deploy/hostinger` لهذا المشروع.

---

## بوابة الرسائل

- للتطوير: `node tools/mock-message-gateway.mjs` و`MESSAGE_GATEWAY_URL` يشير إليه (انظر README الجذر).
- للإنتاج: خدمة تلتزم بعقد [GATEWAY_HYPERSWITCH_AR.md](GATEWAY_HYPERSWITCH_AR.md).

---

## تحقق سريع بعد النشر

1. من المتصفح: فتح الواجهة → إرسال بريد → راجع `message_outbox` في Studio/SQL: توقّع `sent` أو `skipped` أو `failed` حسب إعداد البوابة.
2. استدعاء `confirm-email` ثم `request-otp` ثم `verify-otp` ثم `register-hyperswitch-merchant` (بعد ضبط Hyperswitch).

---

## ملاحظة

**لا أستطيع تنفيذ النشر على حسابك** من هنا بدون `SUPABASE_ACCESS_TOKEN` و`SUPABASE_PROJECT_REF` (سحابي) أو وصول SSH لسيرفرك. نفّذ الجدول أعلاه على جهازك أو الـ CI.
