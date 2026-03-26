# تكامل منصة الدفع + Supabase: بريد ثم OTP (تحليل معماري)

## 1) المبدأ

- **Hyperswitch**: طبقة مدفوعات (تجار، معالجات، روابط دفع، API). لا يستبدل نظام الهوية الكامل لمنتجك.
- **Supabase**: مصدر حقيقة لتدفق **تأكيد البريد → OTP → جاهزية للربط مع Hyperswitch**، وسجل الرسائل.
- **بوابة الرسائل (الحالية أو لاحقاً)**: Edge Function تستدعي `MESSAGE_GATEWAY_URL`؛ اليوم بوابتكم، غداً Twilio/Unifonic/Resend دون تغيير الجداول.

## 2) تسلسل المستخدم

```
[واجهتكم] → طلب التحقق بالبريد
         → Edge: إنشاء token + حفظ hash + إرسال عبر البوابة (رابط أو رمز)
         → المستخدم يفتح الرابط أو يرسل الرمز إلى Edge confirm-email
         → email_verified = true
         → طلب OTP (المرحلة الثانية)
         → Edge: توليد 6 أرقام، hash، إرسال عبر البوابة
         → المستخدم يرسل الرمز          → verify-otp
         → register-hyperswitch-merchant (Edge + أسرار Hyperswitch) لإنشاء مستخدم/تاجر في البوابة
         → link-edfapay-profile (اختياري لكن موصى به) — حفظ رمز ملف مبسّط/EdfaPay في onboarding_sessions
         → إصدار جلسة (Supabase Auth اختياري)
         → [Backendكم] مفاتيح الدفع والمعالجات من Hyperswitch بأمان
```

## 3) حدود مسؤولية Hyperswitch للبريد

- إعدادات `[email]` في `docker_compose.toml` تخص **رسائل النظام داخل Hyperswitch** (مثل تدفقات المستخدمين على لوحة Hyperswitch إن كانت الصورة مبنية بميزة email).
- **تأكيد بريد عملائك/تجارك في منتجكم** يبقى في **Supabase + حزمتنا**؛ ثم تربطون الحساب بـ Hyperswitch عبر API عند الحاجة.

## 4) أمان

- لا تخزن OTP أو روابط تحقق **بشكل صريح**؛ خزّن **SHA-256** فقط.
- حدّ محاولات OTP؛ انتهاء صلاحية قصير (5–10 دقائق للـ OTP، 24 ساعة لرابط البريد).
- استخدم **Service Role** فقط داخل Edge Functions، لا تضع المفتاح في الواجهة.

## 5) ربط Hyperswitch بعد التحقق

بعد `verify-otp` ناجح:

1. استدعاء الدالة `register-hyperswitch-merchant` (تستخدم `HYPERSWITCH_BASE_URL` واختيارياً `HYPERSWITCH_ADMIN_API_KEY` و`HYPERSWITCH_REGISTRATION_MODE`) — انظر `docs/GATEWAY_HYPERSWITCH_AR.md`.
2. يُخزَّن `hyperswitch_merchant_id` في `onboarding_sessions` عند نجاح مسار `public_signup`؛ مسار `admin_merchant` قد يتطلب إكمال بريد Hyperswitch قبل ظهور التاجر في اللوحة.
3. مفاتيح **الدفع** وربط **المعالجات** تبقى عمليات لاحقة من لوحة Hyperswitch أو من backendكم — لا تُعرَض أسرار الإدارة للمتصفح.
