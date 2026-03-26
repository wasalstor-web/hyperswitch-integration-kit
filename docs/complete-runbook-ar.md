# دليل الإكمال والنشر (عربي)

دليل خطوة بخطوة لإغلاق حلقة **البريد → OTP → Hyperswitch** من التطوير حتى الإنتاج.

## المتطلبات

- Node.js 20+ (مُفضّل 22) و npm
- حساب [Supabase](https://supabase.com) (سحابي أو ذاتي)
- مثيل **Hyperswitch** يمكن لدوال Edge الوصول إليه (`HYPERSWITCH_BASE_URL`)
- (اختياري) بوابة رسائل حقيقية أو وهمية للتطوير — راجع [GATEWAY_HYPERSWITCH_AR.md](GATEWAY_HYPERSWITCH_AR.md)

---

## 1) قاعدة البيانات

**سحابي:** بعد ربط المشروع:

```powershell
cd path\to\hyperswitch-integration-kit
.\scripts\deploy-supabase.ps1
```

يُنفَّذ `db push` لتطبيق `supabase/migrations/20250326120000_email_then_otp.sql`.

**يدوياً:** انسخ محتوى ملف الـ migration إلى **SQL Editor** في لوحة Supabase ونفّذه.

**ذاتي الاستضافة:** راجع [HOSTINGER_SELFHOSTED_AR.md](HOSTINGER_SELFHOSTED_AR.md).

---

## 2) نشر Edge Functions

```powershell
npx supabase functions deploy
```

أو عبر `.\scripts\deploy-supabase.ps1` (يشمل الربط والـ push والدوال).

**مرجع المشروع:** أنشئ ملف **`.supabase-project-ref`** (سطر واحد = ref المشروع) من نسخة **`.supabase-project-ref.example`**, أو عيّن `SUPABASE_PROJECT_REF`.

**رمز الوصول:** `.supabase-access-token` في جذر المشروع أو متغير `SUPABASE_ACCESS_TOKEN`.

---

## 3) أسرار الدوال (Secrets) — قائمة تحقق

| السر | وصف |
|------|-----|
| `PUBLIC_APP_VERIFY_URL` | **إلزامي للإنتاج:** نفس أصل الواجهة التي يفتحها المستخدم (مثال: `https://onboard.example.com` أو `http://localhost:5173` للتجربة). **بدون** `/` في النهاية. |
| `MESSAGE_GATEWAY_URL` | رابط بوابة إرسال البريد/الرسائل (JSON). |
| `MESSAGE_GATEWAY_KEY` | مفتاح اختياري للبوابة. |
| `HYPERSWITCH_BASE_URL` | عنوان Router/API لـ Hyperswitch (من الدالة إلى الشبكة الصحيحة). |
| `HYPERSWITCH_ADMIN_API_KEY` | إن استخدمت وضع `admin_merchant`. |
| `HYPERSWITCH_REGISTRATION_MODE` | عند الحاجة حسب [GATEWAY_HYPERSWITCH_AR.md](GATEWAY_HYPERSWITCH_AR.md). |
| `DANGEROUS_RETURN_TOKEN` / `DANGEROUS_RETURN_OTP` | **تطوير فقط** — لا تفعّل في الإنتاج. |

تعيين عبر لوحة Supabase → Edge Functions → Secrets، أو:

```bash
supabase secrets set --project-ref YOUR_REF PUBLIC_APP_VERIFY_URL="https://..."
```

---

## 4) الواجهة محلياً

```powershell
cd web
copy ..\.env.example .env.local
# عدّل VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

تحقق اختياري:

```powershell
.\scripts\preflight.ps1 -RequireEnvLocal
```

---

## 5) بناء الإنتاج وحزمة الرفع (استضافة مشتركة)

```powershell
cd path\to\hyperswitch-integration-kit
.\scripts\build-and-package-static.ps1 -ArabicUI
# أو حدد مجلداً على قرص واسع:
# .\scripts\build-and-package-static.ps1 -OutputDir "D:\deploy" -ArabicUI
```

- ارفع **محتويات** الأرشيف بحيث يكون **`index.html` داخل `public_html`** مباشرة (وليس داخل مجلد إضافي واحد).
- أعد بناء الواجهة بعد أي تغيير في `VITE_*` (قيم مدمجة وقت البناء).

**قبل أرشفة المستودع أو الرفع إلى git:** نفّذ `.\scripts\verify-publish-ready.ps1` (أو `-ArabicUI`) — يتحقق من تجاهل الأسرار ووجود `LICENSE` و`package-lock.json` وعدم تتبع ملفات حساسة، ثم يبني `dist` بقيم قالبية ويفحصها.

---

## 6) VPS + Docker + Traefik

من `deploy/hostinger`:

1. انسخ `.env.example` إلى `.env` واملأ `WEB_FQDN` و`VITE_SUPABASE_*` و`COMPOSE_PROJECT_NAME` الفريد.
2. `docker compose --env-file .env up -d --build`
3. إن ظهر **502** مع Traefik: راجع `TRAEFIK_DOCKER_NETWORK` وملف `docker-compose.traefik-network.yml` كما في [deploy/hostinger/README.md](../deploy/hostinger/README.md).

---

## 7) Hyperswitch

- شغّل الـ Router والخدمات المطلوبة.
- تأكد أن الدالة `register-hyperswitch-merchant` تصل إلى `HYPERSWITCH_BASE_URL` من شبكة الدوال (Docker/Kong).
- تفاصيل أوضاع التسجيل: [GATEWAY_HYPERSWITCH_AR.md](GATEWAY_HYPERSWITCH_AR.md).

---

## 8) استكشاف الأخطاء السريع

| العرض | إجراء |
|--------|--------|
| تنبيه Supabase في الواجهة | `web/.env.local` وقيم `VITE_*` صحيحة. |
| رابط البريد لا يعمل | `PUBLIC_APP_VERIFY_URL` يطابق **نفس** الـ host والبروتوكول. |
| CORS / حظر من المتصفح | إعدادات Kong/API وCORS للمشروع. |
| قرص C ممتلئ | استخدم `-OutputDir` على **D:** أو **E:**. |
| الدالة 401/403 | مفتاح anon في الواجهة؛ أسرار الخدمة داخل الدوال فقط. |

---

## مراجع

- [README.md](../README.md) — نظرة عامة ومخطط السكربتات
- [ARCHITECTURE_AR.md](ARCHITECTURE_AR.md) — المعمارية
- [HOSTINGER_SELFHOSTED_AR.md](HOSTINGER_SELFHOSTED_AR.md) — Supabase ذاتي على VPS
