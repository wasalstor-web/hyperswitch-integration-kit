# الالتزام بالواجهات مفتوحة المصدر داخل المشروع

هذا المستند يحدّد **ما الذي يجب عدم كسره** عند التعديل: عقود HTTP/JSON التي تربط الواجهة بالخلفية، ومحاذاة الكود مع **مشاريع OSS خارجية** (Hyperswitch وSupabase وغيرها).

## 1) رخصة هذا المستودع

- الكود والوثائق هنا تحت **MIT** — انظر [../LICENSE](../LICENSE).
- عند التوزيع انسخ إشعار حقوق النسخ والإذن كما في الملف.

## 2) عقد «واجهة الدوال» (Edge / خادم Hono)

الواجهة (`web/src/main.js`) تستدعي دائماً:

`POST {base}/functions/v1/{name}`

حيث `{base}` إما `VITE_API_BASE_URL` أو `VITE_SUPABASE_URL`، و`{name}` أحد الأسماء أدناه.

| الاسم (`invokeFn`) | جسم الطلب (JSON) المتوقع من الواجهة | ملاحظات الالتزام |
|---------------------|--------------------------------------|-------------------|
| `request-email-verification` | `{ "email": string }` | لا تغيّر اسم الحقل `email` دون تحديث الواجهة والوثائق معاً. |
| `confirm-email` | `{ "email", "token" }` | متوافق مع رابط التحقق `?email=&token=`. |
| `request-otp` | `{ "email" }` | يتطلب بريداً مؤكداً مسبقاً. |
| `verify-otp` | `{ "email", "code" }` | `code` ستة أرقام. |
| `register-hyperswitch-merchant` | `{ "email", "password", "company_name", "name?" }` | الحقول الإلزامية ثابتة للتوافق مع خطوة الواجهة 5. |

**قاعدة المشروع:** مسار `server/src/app.ts` ودوال `supabase/functions/*` يجب أن يبقيا **متطابقين** في أسماء المسارات والحقول والأكواد المعنونة (4xx/403/500) قدر الإمكان؛ أي اختلاف يُوثَّق في [GATEWAY_HYPERSWITCH_AR.md](GATEWAY_HYPERSWITCH_AR.md) ويُحدَّث `main.js` في نفس التغيير.

## 3) واجهة Hyperswitch (مشروع مفتوح المصدر)

الملفان المرجعيان (يجب أن يبقيا متطابقين):

- `server/src/hyperswitch.ts`
- `supabase/functions/_shared/hyperswitch.ts`

يستدعيان **REST Router** العام لـ Hyperswitch (وليس واجهة خاصة بهذا المستودع):

| عملية | HTTP | مسار |
|--------|------|------|
| تسجيل عام | `POST` | `/user/signup` |
| بيانات المستخدم | `GET` | `/user` (ترويسة `Authorization: Bearer …`) |
| تسجيل مع تاجر (أدمن) | `POST` | `/user/signup_with_merchant_id` (ترويسة `api-key`) |

إذا غيّر مشروع **Hyperswitch** upstream شكلاً رسمياً لهذه النقاط، يجب تحديث الملفين أعلاه معاً والإشارة في سجل التغيير أو الوثائق. المرجع لرخصة ومشروع Hyperswitch: [juspay/hyperswitch](https://github.com/juspay/hyperswitch) (Apache-2.0).

## 4) عقد بوابة الرسائل (اختياري، مفتوح التنفيذ)

أي خادم تضعه في `MESSAGE_GATEWAY_URL` يجب أن يقبل الجسم الموصوف في [GATEWAY_HYPERSWITCH_AR.md](GATEWAY_HYPERSWITCH_AR.md) (`channel`, `to`, `template`, `data`). هذا **عقد هذا المستودع** — ليس معياراً خارجياً — لكن كسره يكسر التكامل مع أدوات مثل `tools/mock-message-gateway.mjs`.

## 5) اعتماديات npm (تراخيص الطرف الثالث)

- **قائمة مُولَّدة تلقائياً:** [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) — حدّثها بعد كل `npm install` ذي تأثير على القفل:

```bash
npm run licenses:notices
```

- الجدول يُستخرج من حقول `license` في `package-lock.json` (الجذر + `web/`). للتدقيق الإضافي راجع `node_modules/<pkg>/package.json` لكل حزمة حرجة.

- اعتماديات رئيسية (ملخّص — لا يغني عن `THIRD_PARTY_NOTICES.md`):

| حزمة | دور تقريبي |
|------|------------|
| `hono`, `@hono/node-server` | إطار HTTP للخادم المحلي |
| `@prisma/client`, `prisma` | ORM و Postgres |
| `@electric-sql/pglite`, `pglite-prisma-adapter` | Postgres مضمن للتطوير |
| `vite` (في `web/`) | بناء وتطوير الواجهة |
| `dotenv` | تحميل `.env` |

## 6) خطوط وموارد الواجهة

- خط **Tajawal** يُحمَّل من Google Fonts — التزم بشروط استخدام الخط والـ CDN عند النشر.
- الشعار والأصول في `web/public/` تبقى ضمن سياسة العلامة لديك؛ لا تخلطها مع شعارات مشاريع أخرى بطريقة تُضلل المستخدم.

## 7) فحص جاهزية النشر

سكربت `scripts/verify-publish-ready.ps1` يتحقق من وجود `LICENSE` و`THIRD_PARTY_NOTICES.md` و`docs/OPEN_SOURCE_INTERFACES_AR.md` (مع بقية الفحوصات). بعد تغيير الاعتماديات:

```bash
npm run licenses:notices
.\scripts\verify-publish-ready.ps1
```

## 8) خلاصة للمساهمين

1. **لا تغيّر** أسماء دوال `functions/v1/*` أو حقول JSON للواجهة دون تحديث متزامن لـ `web/src/main.js` والوثائق.
2. **حافظ على تطابق** `hyperswitch.ts` بين `server/` و`supabase/functions/_shared/`.
3. **التزم برخص MIT** لهذا المستودع عند النسخ، و**برخص كل طرف ثالث** عند التوزيع الثنائي.
4. **أعد توليد** `THIRD_PARTY_NOTICES.md` عند تحديث `package-lock.json` أو `web/package-lock.json`.
