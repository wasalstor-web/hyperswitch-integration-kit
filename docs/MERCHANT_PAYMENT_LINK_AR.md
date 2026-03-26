# ربط التاجر: منصتك + Hyperswitch + مبسّط/EdfaPay

## الفكرة

1. **العميل** يُكمِل عندك على نطاقك: بريد → OTP → **Hyperswitch** (لوحة المدفوعات).
2. **الخطوة التالية** على نفس الواجهة: **ربط ملف الدفع** (رمز الملف من [بوابة مبسّط](https://mubasat.edfapay.com/login)) فيُحفَظ في **`onboarding_sessions`** لديك — بذلك يكون مسجّلاً **عندك** ومربوطاً **بمسار EdfaPay** الذي تضبطه على الخادم (مفاتيح المنصة).

الأسرار (`client_key`، كلمة مرور التجزئة) **لا تمرّ من المتصفح**؛ تبقى في `.env` / أسرار الدوال فقط. المتصفح يرسل **البريد** واختيارياً **`profile_code`**.

## API

`POST /functions/v1/link-edfapay-profile`

```json
{ "email": "merchant@example.com", "profile_code": "mubasatplatform_MF_BSF" }
```

- يتطلب إكمال **`completed_at`** (بعد `verify-otp`).
- يتطلب تهيئة المنصة: **`EDFAPAY_CLIENT_KEY`** + **`EDFAPAY_HASH_PASSWORD`** (أو أسماء `PAYMENT_GATEWAY_CLIENT_*` المتوافقة).
- إن **لم** يُرسل `profile_code`، يُستخدم **`EDFAPAY_MERCHANT_PROFILE`** أو **`EDFAPAY_MERCHANT_CODE`** من البيئة (حساب موحّد لكل التجار).

الاستجابة تتضمّن `edfapay_profile_code` و`hyperswitch_merchant_id` (إن وُجد) وروابط لوحة مبسّط والوثائق.

## قاعدة البيانات

| عمود | المعنى |
|------|--------|
| `edfapay_profile_code` | رمز الملف التجاري المرتبط بهذا التاجر |
| `edfapay_linked_at` | وقت تأكيد الربط على واجهتك |

هجرات: Prisma `20260327120000_onboarding_edfapay_link` و Supabase `20260327120000_onboarding_edfapay_link.sql`.

**تطوير محلي بـ PGlite:** عند تشغيل الخادم (`npm run server:dev`) يُضاف تلقائياً عمودا `edfapay_*` إن كان الجدول قديماً (`server/src/db.ts`). بديلاً: احذف `.data/pglite` لإعادة بناء كامل من هجرات Prisma.

**Postgres عبر Docker:** من جذر المشروع: `npm run db:deploy:dev` (يشغّل `docker-compose.dev.yml` ثم `prisma migrate deploy`) — يتطلب Docker Desktop.

## ما بعد الربط

- **معالجات الدفع** و **SALE** الفعلية تبقى من [وثائق EdfaPay](https://docs.edfapay.com/) و/أو **Hyperswitch** حسب تصميمكم.
- راجع [EDFAPAY_MUBASAT_AR.md](EDFAPAY_MUBASAT_AR.md) و [GATEWAY_HYPERSWITCH_AR.md](GATEWAY_HYPERSWITCH_AR.md).
