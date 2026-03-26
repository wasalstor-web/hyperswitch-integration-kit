# ربط Hyperswitch Integration Kit مع Supabase على Hostinger (Docker ذاتي)

على نفس الـ VPS الذي يشغّل **Traefik + BookCars** يمكن تشغيل **Supabase الرسمي عبر Docker** ([دليل Self-Hosting](https://supabase.com/docs/guides/self-hosting/docker)). لا تحتاج مشروع `*.supabase.co`؛ الربط يكون عبر **Kong** (البوابة `:8000` أو `:8443`) والمفاتيح من ملف `.env` الخاص بمجلد `docker` لـ Supabase.

## 1) عنوان الـ API العام (Kong)

- محلياً على السيرفر: غالباً `http://127.0.0.1:8000`.
- من الإنترنت: إما تنشر منفذ Kong، أو (مُفضّل) **Traefik** يوجّه نطاقاً مثل `sb-api.example.com` إلى حاوية Kong.

في `.env` لـ Supabase اضبط نفس القيمة التي سيراها المتصفح والتطبيق:

- `SUPABASE_PUBLIC_URL=https://sb-api.example.com` (بدون مسار إضافي)
- `API_EXTERNAL_URL` بنفس المنطق إن وثّقت ذلك في الإعداد

هذا الرابط هو ما تضعه في BookCars كـ `SUPABASE_PUBLIC_URL`.

## 2) ربط BookCars (نفس الـ VPS)

في `deploy/hostinger/.env`:

- `SUPABASE_PUBLIC_URL` = نفس `SUPABASE_PUBLIC_URL` أعلاه (HTTPS إن أمكن).
- `SUPABASE_ANON_KEY` = قيمة `ANON_KEY` من `.env` الخاص بـ Supabase Docker.

في `deploy/hostinger/secrets/backend.env`:

- `BC_SUPABASE_JWT_SECRET` يجب أن يطابق **`JWT_SECRET`** في `.env` لـ Supabase (وليس مفتاح anon).

بعد تغيير المفاتيح أو الـ URL أعد بناء الواجهات: `docker compose ... up -d --build` لـ `bc-frontend` / `bc-admin`.

## 3) قاعدة البيانات (migration)

على السيرفر داخل مجلد Supabase Docker:

**من Studio:** افتح `https://<نفس-بوابة-Kong>` → تسجيل الدخول الأساسي → **SQL Editor** → الصق محتوى  
`hyperswitch-integration-kit/supabase/migrations/20250326120000_email_then_otp.sql` → نفّذ.

**أو من الطرفية:**

```bash
cd /path/to/your-supabase-docker
docker compose exec -T db psql -U postgres -d postgres -f - < /path/to/20250326120000_email_then_otp.sql
```

(عدّل المسارات؛ كلمة مرور قاعدة البيانات مضبوطة في `.env` لـ Supabase.)

## 4) Edge Functions (ذاتي الاستضافة)

على المنصة السحابية يستخدم الـ CLI `supabase functions deploy`. على **Docker الذاتي** الدوال تُقرأ من **`volumes/functions`** على القرص.

1. على جهازك التطويري، من جذر `hyperswitch-integration-kit`:

   ```powershell
   .\scripts\package-for-selfhosted.ps1
   ```

2. انسخ **محتويات** `build/selfhosted-edge-functions/` إلى `volumes/functions/` على السيرفر **بجانب** المجلدات الافتراضية مثل `main` و`hello` **دون حذفها**.

3. أضف متغيرات البيئة لخدمة `functions` في `docker-compose.yml` (أو `env_file` مثل `.env.functions`):

   - `PUBLIC_APP_VERIFY_URL` — رابط صفحة واجهتك التي تستقبل `?email=&token=` وتستدعي `confirm-email`.
   - اختياري: `MESSAGE_GATEWAY_URL`، `MESSAGE_GATEWAY_KEY`.
   - **Hyperswitch:** `HYPERSWITCH_BASE_URL` (من داخل Docker غالباً `http://hyperswitch-hyperswitch-server-1:8080`)، و`HYPERSWITCH_ADMIN_API_KEY` إن لزم، و`HYPERSWITCH_REGISTRATION_MODE` عند الحاجة.
   - تطوير فقط: `DANGEROUS_RETURN_TOKEN`، `DANGEROUS_RETURN_OTP`، `DANGEROUS_RETURN_HS_JWT`.

   ثم:

   ```bash
   docker compose up -d --force-recreate --no-deps functions
   ```

4. الاستدعاء من الواجهة:  
   `POST https://<Kong>/functions/v1/...` مع `Authorization: Bearer <ANON_KEY>` إذا كان التحقق من JWT مفعّلاً.

## 5) واجهة onboarding معزولة على Hostinger

لتشغيل واجهة التسجيل فقط في **مكدس Docker مستقل** (شبكة `hs_onboard_isolated` + Traefik، بدون تعارض مع مشاريع أخرى): راجع **`deploy/hostinger/README.md`** في هذا المستودع.

## 6) Hyperswitch

Hyperswitch يبقى منفصلاً. بعد نجاح `verify-otp`، استدعِ واجهات Hyperswitch من **سيرفرك الخلفي** بمفاتيح سرية، وليس من المتصفح.

## مرجع سريع

| المكوّن | المتغير / المسار |
|--------|------------------|
| واجهة onboarding (هذا المشروع) | `deploy/hostinger/` — `VITE_SUPABASE_*` + `WEB_FQDN` |
| BookCars frontend | `SUPABASE_PUBLIC_URL`, `SUPABASE_ANON_KEY` في `bookcars/deploy/hostinger/.env` |
| BookCars backend | `BC_SUPABASE_JWT_SECRET` = `JWT_SECRET` لـ Supabase |
| دوال البريد/OTP | نسخ إلى `supabase/docker/volumes/functions/` + إعادة تشغيل `functions` |
| الجداول | تنفيذ ملف الـ migration في Postgres الخاص بـ Supabase |
