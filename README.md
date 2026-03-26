# Hyperswitch + Supabase — بريد ثم OTP

**تجربة بوابة دفع (OAuth، ملف محلي):** انسخ [env.payment.local.template](env.payment.local.template) إلى `.env.payment.local` — التفاصيل في [docs/PAYMENT_GATEWAY_TRIAL_AR.md](docs/PAYMENT_GATEWAY_TRIAL_AR.md).

**EdfaPay / مبسّط:** [بوابة الدخول](https://mubasat.edfapay.com/login) — شرح التكامل والوثائق في [docs/EDFAPAY_MUBASAT_AR.md](docs/EDFAPAY_MUBASAT_AR.md). **ربط التاجر بمنصتك + الدفع:** [docs/MERCHANT_PAYMENT_LINK_AR.md](docs/MERCHANT_PAYMENT_LINK_AR.md).

**دليل الإكمال والنشر بالعربية:** [docs/complete-runbook-ar.md](docs/complete-runbook-ar.md)  
**ترتيب النشر (سحابي ↔ سيرفر):** [docs/DEPLOY_ORDER_AR.md](docs/DEPLOY_ORDER_AR.md)  
**فهرس الوثائق:** [docs/README.md](docs/README.md)  
**هيكل المجلدات (مرجع):** [docs/PROJECT_STRUCTURE_AR.md](docs/PROJECT_STRUCTURE_AR.md)  
**الالتزام بالواجهات مفتوحة المصدر (عقود API + محاذاة Hyperswitch):** [docs/OPEN_SOURCE_INTERFACES_AR.md](docs/OPEN_SOURCE_INTERFACES_AR.md)  
**إشعارات تراخيص npm:** [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) — حدّثها بـ `npm run licenses:notices`

## هيكل المشروع (مختصر)

| المسار | الدور |
|--------|--------|
| `docs/` | كل الأدلة العربية + [فهرس](docs/README.md) |
| `prisma/` | **PostgreSQL مباشر** — `schema.prisma` + هجرات (`npm run db:migrate`) — انظر [prisma/README.md](prisma/README.md) |
| `supabase/` | مسار **Supabase**: migrations + Edge Functions |
| `web/` | واجهة Vite |
| `scripts/` | سكربتات PowerShell للنشر والتحقق |
| `deploy/hostinger/` | Docker للواجهة فقط |

## ما الذي أُنجز

1. **مخطط قاعدة بيانات** — مساران متوازيان:
   - **Supabase:** `supabase/migrations/…sql` مع RLS يمنع الوصول المباشر من المتصفح.
   - **Postgres + Prisma:** `prisma/schema.prisma` + `prisma/migrations/` للوصول المباشر عبر `DATABASE_URL` (DBeaver / `psql` / تطبيق خلفي).
2. **خمس Edge Functions (Deno)**:
   - `request-email-verification` — رابط تحقق عبر **بوابة الرسائل** (`MESSAGE_GATEWAY_URL`) أو تسجيل في `message_outbox`.
   - `confirm-email` — تأكيد البريد.
   - `request-otp` — إرسال OTP عبر البوابة.
   - `verify-otp` — إكمال التحقق (`completed_at`).
   - `register-hyperswitch-merchant` — بعد الخطوة السابقة: إنشاء مستخدم/تاجر في **Hyperswitch** وحفظ `hyperswitch_merchant_id` (وضع `public_signup` أو `admin_merchant`). التفاصيل: [docs/GATEWAY_HYPERSWITCH_AR.md](docs/GATEWAY_HYPERSWITCH_AR.md).
3. **بوابة الرسائل**: `MESSAGE_GATEWAY_URL` / `MESSAGE_GATEWAY_KEY` — عقد JSON في [docs/GATEWAY_HYPERSWITCH_AR.md](docs/GATEWAY_HYPERSWITCH_AR.md).
4. **Hyperswitch محلياً**: ملف `docker-compose.mailpit.yml` + تعديل SMTP إلى `mailpit` + تفعيل `email=true` في لوحة التحكم لرسائل النظام داخل Hyperswitch (إن دعمتها الصورة).
5. **واجهة ويب جاهزة** (`web/`): تمرّ بكل الخطوات حتى ربط Hyperswitch؛ **الهوية البصرية موحّدة** مع بوابة التجار (خط Tajawal، ألوان فيروزية، شعار `public/logo-mobassat.svg`).
6. **بوابة وهمية للتطوير** (`tools/mock-message-gateway.mjs`): تطبع رسائل JSON بدل إرسال بريد حقيقي.

## النشر المستقل (حزمة نظيفة)

قبل رفع المستودع أو أرشفة المشروع لسيرفرك:

1. **لا تُرفع أسراراً:** تأكد أن `.supabase-access-token`، `.supabase-project-ref`، و`web/.env.local` غير موجودة في git (مذكورة في `.gitignore`).
2. **أعد بناء الواجهة** بعد ضبط `web/.env.local` بمشروعك (`VITE_*`)؛ القيم تُدمج في `dist` وقت البناء — لا تستخدم مراجع مشاريع قديمة.
3. **نفّذ الـ migration** على قاعدة بياناتك وانشر Edge Functions ثم اضبط أسرار الدوال حسب [docs/complete-runbook-ar.md](docs/complete-runbook-ar.md).
4. راجع **الترخيص:** [LICENSE](LICENSE) (MIT).
5. محلياً: `.\scripts\verify-publish-ready.ps1` (أو `-ArabicUI` للرسائل العربية).

## التشغيل الكامل محلياً (Prisma + خادم API + الواجهة)

```powershell
cd path\to\hyperswitch-integration-kit
docker compose -f docker-compose.dev.yml up -d
copy .env.example .env
# عدّل DATABASE_URL مثلاً: postgresql://app:app@127.0.0.1:5433/onboarding
npm install
npm run db:deploy
npm run server:dev
```

في طرفية أخرى:

```powershell
cd path\to\hyperswitch-integration-kit\web
copy .env.example .env.local
# فعّل السطر: VITE_API_BASE_URL=http://localhost:8788
npm install
npm run dev
```

التفاصيل: [server/README.md](server/README.md)

## Docker: Postgres + API + بوابة وهمية

لتشغيل **قاعدة البيانات** و**خادم API** و**بوابة رسائل وهمية** معاً (بدون `docker-compose.dev.yml` المنفصل):

```powershell
cd path\to\hyperswitch-integration-kit
copy .env.docker.example .env.docker
# عدّل PUBLIC_APP_VERIFY_URL و API_PUBLISH_PORT إن لزم
docker compose --env-file .env.docker up --build
```

- المنفذ الافتراضي للـ API على المضيف: **8788** (قابل للتغيير عبر `API_PUBLISH_PORT`).
- للإنتاج خلف Traefik أو على VPS: ابنِ الصورة من `docker/Dockerfile.api` واضبط `CORS_ORIGIN` و`DATABASE_URL` وأسرار البوابة كما في المثال.
- الشرح الكامل والمتغيرات: [docs/DOCKER_STACK_AR.md](docs/DOCKER_STACK_AR.md).

## واجهة الويب (تدفق كامل — Supabase)

```powershell
cd path\to\hyperswitch-integration-kit\web
copy .env.example .env.local
# عدّل VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

- افتح العنوان الذي يظهره Vite (غالباً `http://localhost:5173`).
- في أسرار Edge Functions اضبط **`PUBLIC_APP_VERIFY_URL`** على نفس العنوان (بدون شرطة أخيرة)، مثلاً `http://localhost:5173` حتى يعمل رابط البريد.
- للتطوير السريع بدون بريد: فعّل `DANGEROUS_RETURN_TOKEN=true` و`DANGEROUS_RETURN_OTP=true` في أسرار الدوال ليظهر التوكن/OTP في الاستجابة والواجهة تملأهما تلقائياً عند توفرهما.

## بوابة رسائل وهمية (محلي)

في طرفية منفصلة:

```powershell
cd path\to\hyperswitch-integration-kit
node tools/mock-message-gateway.mjs
```

ثم في أسرار الدوال: `MESSAGE_GATEWAY_URL=http://host.docker.internal:8787` إذا كانت الدوال داخل Docker على Windows، أو `http://127.0.0.1:8787` إن عملت الدوال على نفس الجهاز بدون عزل شبكة.

## Hostinger VPS (معزول عن مشاريع أخرى)

تخطيط جاهز: **`deploy/hostinger/`** — شبكة Docker خاصة، `COMPOSE_PROJECT_NAME` فريد، Traefik فقط (بدون منافذ مكشوفة على المضيف). يبني ويخدم واجهة `web` فقط؛ Supabase وHyperswitch يبقيان منفصلين. التفاصيل: [deploy/hostinger/README.md](deploy/hostinger/README.md).

## مسار إنتاج احترافي (سكربتات)

| السكربت | الغرض |
|--------|--------|
| `.\scripts\Complete-Production-Ar.ps1` | بناء + أرشيف للرفع مع **رسائل عربية** (يستدعي `build-and-package-static.ps1 -ArabicUI`). |
| `.\scripts\Show-SecretsChecklist-Ar.ps1` | طباعة **قائمة أسرار** الدوال للمراجعة (بدون قيم). |
| `.\scripts\preflight.ps1` | التحقق من Node/npm ومساحة القرص؛ `-RequireEnvLocal` قبل التطوير المحلي؛ `-ArabicUI` لرسائل عربية. |
| `.\scripts\build-and-package-static.ps1` | `npm run build` ثم أرشيف `onboardingspa_*.zip` للرفع إلى استضافة مشتركة؛ يختار تلقائياً `D:\` أو `E:\` إذا كان قرص المشروع ضيقاً (`-OutputDir` لتثبيت المسار). |
| `.\scripts\complete-setup.ps1` | بناء الويب + تجميع الدوال للذاتي؛ نشر سحابي عند وجود الرمز. `-SkipPreflight` اختياري. |
| `.\scripts\deploy-supabase.ps1` | ربط المشروع و`db push` و`functions deploy`. مرجع المشروع: `SUPABASE_PROJECT_REF` أو ملف **`.supabase-project-ref`** (انسخ من `.supabase-project-ref.example`). |
| `.\scripts\verify-publish-ready.ps1` | قبل الرفع أو الأرشفة: يتحقق من `.gitignore` و`LICENSE` و`THIRD_PARTY_NOTICES.md` و`docs/OPEN_SOURCE_INTERFACES_AR.md` و`package-lock` (الجذر + `web/`) وعدم تتبع أسرار في git، ثم يبني الواجهة بقيم `VITE_*` قالبية ويفحص `dist`. خيارات: `-SkipBuild`، `-ScanDistOnly`، `-ArabicUI`. |
| `npm run licenses:notices` | يحدّث [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) من ملفات القفل — نفّذه بعد `npm install` الذي يغيّر الاعتماديات. |

**CI:** عند رفع المستودع إلى GitHub، سير **`web-ci.yml`** يشغّل `server:build` و`npm test` وبناء صورة **`docker/Dockerfile.api`** ثم يحدّث تراخيص npm ويفحص **`THIRD_PARTY_NOTICES.md`**، ثم يبني الواجهة بمتغيرات قالبية ويرفع **`dist`** كـ artifact باسم `onboarding-spa-dist`.

## قائمة تحقق لـ «إكمال كل شيء»

| الخطوة | الإجراء |
|--------|---------|
| قاعدة البيانات | **Supabase:** تنفيذ `supabase/migrations/*.sql` — **أو Postgres:** `npm run db:deploy` بعد ضبط `DATABASE_URL` في `.env` |
| الدوال / API | **Supabase:** `.\scripts\deploy-supabase.ps1` أو `build/selfhosted-edge-functions` — **أو محلي:** `npm run server:dev` + [server/README.md](server/README.md) |
| الأسرار | `PUBLIC_APP_VERIFY_URL` (جذر `.env` للخادم أو أسرار Supabase)، اختياري `MESSAGE_GATEWAY_*`، `HYPERSWITCH_*`، `INTERNAL_API_KEY`، تطوير `DANGEROUS_*` |
| الواجهة | `web/.env.local` (`VITE_API_BASE_URL` أو `VITE_SUPABASE_*`) + `npm run dev` |
| Hyperswitch | تشغيل الـ Router وضبط `HYPERSWITCH_BASE_URL` (من الدوال إلى الحاوية/النطاق) |

ما لا يمكن تنفيذه من هنا تلقائياً: ربط مشروع Supabase السحابي (إن كان متوقفاً أو بدون رمز وصول)، وDNS/HTTPS على الإنتاج.

## تشغيل Mailpit مع Hyperswitch

من مجلد مستودع **Hyperswitch** لديك (ليس هذا المستودع):

```powershell
docker compose -f docker-compose.yml -f docker-compose.mailpit.yml --env-file .oneclick-setup.env up -d
```

- واجهة البريد الوهمي: http://localhost:18025 (إن كان 8025 مشغولاً عندك)  
- أعد تشغيل `hyperswitch-control-center` و`hyperswitch-server` إذا كانا يعملان قبل إضافة Mailpit.

## Supabase

**استضافة ذاتية على Hostinger / VPS (Docker):** راجع [docs/HOSTINGER_SELFHOSTED_AR.md](docs/HOSTINGER_SELFHOSTED_AR.md) — ربط Kong مع BookCars، نسخ الدوال إلى `volumes/functions/`، وتشغيل الـ migration بدون `*.supabase.co`.

**السحابة (Supabase Hosted):** أنشئ [رمز وصول](https://supabase.com/dashboard/account/tokens) ثم:

```powershell
cd path\to\hyperswitch-integration-kit
# كل شيء محلياً + نشر سحابي إن وُجد الرمز:
.\scripts\complete-setup.ps1
# أو بدون محاولة Supabase:
# .\scripts\complete-setup.ps1 -SkipSupabase
# نشر سحابي فقط:
# إما ضع الرمز في .supabase-access-token أو $env:SUPABASE_ACCESS_TOKEN
.\scripts\deploy-supabase.ps1
```

**يدوياً:** 1) نفّذ محتوى `supabase/migrations/20250326120000_email_then_otp.sql` في **SQL Editor**، أو `supabase db push` بعد `supabase link`. 2) انشر الدوال:

```bash
cd hyperswitch-integration-kit
npx supabase functions deploy
```

3. أضف الأسرار في لوحة Supabase → Edge Functions (أو `.env.functions` للذاتي):
   - `MESSAGE_GATEWAY_URL` / `MESSAGE_GATEWAY_KEY` (اختياري)
   - `PUBLIC_APP_VERIFY_URL` — صفحة التحقق من البريد
   - **Hyperswitch:** `HYPERSWITCH_BASE_URL`، و`HYPERSWITCH_ADMIN_API_KEY` إن استخدمت `admin_merchant`، و`HYPERSWITCH_REGISTRATION_MODE` عند الحاجة
   - تطوير فقط: `DANGEROUS_RETURN_TOKEN` / `DANGEROUS_RETURN_OTP` / `DANGEROUS_RETURN_HS_JWT`

## تسلسل استدعاء الواجهة

1. `POST /functions/v1/request-email-verification` — `{ "email": "u@x.com" }`
2. المستخدم يفتح الرابط → الواجهة تستدعي `POST /functions/v1/confirm-email` — `{ "email", "token" }`
3. `POST /functions/v1/request-otp` — `{ "email" }`
4. `POST /functions/v1/verify-otp` — `{ "email", "code" }`
5. `POST /functions/v1/register-hyperswitch-merchant` — `{ "email", "password", "company_name", "name"? }` لربط التاجر في Hyperswitch (انظر [docs/GATEWAY_HYPERSWITCH_AR.md](docs/GATEWAY_HYPERSWITCH_AR.md)).
6. مفاتيح API للدفع وربط المعالجات تبقى من **لوحة Hyperswitch** أو من سيرفركم بمفاتيح سرية — لا تضعها في المتصفح.

## ملاحظة تقنية

صورة Docker الرسمية `hyperswitch-router` قد لا تتضمن كل ميزات البريد في البناء؛ إن فشل الإرسال من Hyperswitch رغم Mailpit، راجع سجلات الحاوية ووثائق الإصدار. تدفق **منتجكم** (Supabase) مستقل ويعمل طالما الدوال والبوابة مهيأة.
