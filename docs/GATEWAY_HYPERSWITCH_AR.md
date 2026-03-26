# بوابة الرسائل + تسجيل العميل في Hyperswitch

## 1) بوابة الرسائل (`MESSAGE_GATEWAY_URL`)

عند ضبط `MESSAGE_GATEWAY_URL` (واختياري `MESSAGE_GATEWAY_KEY`)، تستدعي الدوال `request-email-verification` و `request-otp` عنوانك بـ **POST** وJSON مثل:

**تحقق البريد**

```json
{
  "channel": "email",
  "to": "user@example.com",
  "template": "email_verification",
  "data": {
    "verifyLink": "https://your-app/verify?email=...&token=...",
    "expires": "2025-03-26T12:00:00.000Z"
  }
}
```

**OTP**

```json
{
  "channel": "email",
  "to": "user@example.com",
  "template": "otp",
  "data": {
    "code": "123456",
    "expires": "2025-03-26T12:10:00.000Z"
  }
}
```

بوابتك ترسل البريد/SMS وتعيد `200`. بدون عنوان، تُسجَّل المحاولة فقط في `message_outbox`.

---

## 2) تسجيل العميل في Hyperswitch (`register-hyperswitch-merchant`)

بعد **`verify-otp` ناجح**، الواجهة تستدعي:

`POST /functions/v1/register-hyperswitch-merchant`

```json
{
  "email": "same@verified.com",
  "password": "كلمة_مرور_لوحة_Hyperswitch",
  "company_name": "اسم النشاط التجاري",
  "name": "اسم الشخص (اختياري)"
}
```

ترويسة عادية لـ Supabase: `Authorization: Bearer <anon>` و`apikey`.

### أسرار (Edge / Docker functions)

| المتغير | المعنى |
|--------|--------|
| `HYPERSWITCH_BASE_URL` | عنوان Router بدون شرطة أخيرة، مثل `http://hyperswitch-server:8080` |
| `HYPERSWITCH_ADMIN_API_KEY` | مفتاح **Admin** من إعدادات Hyperswitch (نفس `admin_api_key` في التكوين) |
| `HYPERSWITCH_REGISTRATION_MODE` | `public_signup` أو `admin_merchant`؛ إن لم يُضبط: يوجد admin key → `admin_merchant`، وإلا `public_signup` |
| `DANGEROUS_RETURN_HS_JWT` | `true` فقط للتطوير لإرجاع JWT Hyperswitch في الاستجابة |

### السلوك

- **`public_signup`**: `POST /user/signup` ثم `GET /user` — يعمل عادة عندما **لا** يكون بناء Hyperswitch معطّياً مسار التسجيل بسبب feature البريد فقط. يُحفظ `hyperswitch_merchant_id` في `onboarding_sessions`.
- **`admin_merchant`**: `POST /user/signup_with_merchant_id` مع ترويسة `api-key`. قد ترسل Hyperswitch بريداً للمستخدم؛ قد لا يُعاد `merchant_id` فوراً في الاستجابة — يُكمِل المستخدم التحقق حسب Hyperswitch ثم يسجّل الدخول للوحة.

### أمان

- لا تضع `HYPERSWITCH_ADMIN_API_KEY` في الواجهة الأمامية؛ فقط في أسرار الدالة.
- لا تفعّل `DANGEROUS_RETURN_HS_JWT` في الإنتاج.
