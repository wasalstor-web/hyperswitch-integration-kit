# EdfaPay — بوابة مبسّط (`mubasat.edfapay.com`)

## تسجيل الدخول

- **بوابة التاجر / الشريك:** [https://mubasat.edfapay.com/login](https://mubasat.edfapay.com/login)

من هنا تدير الحساب، المفاتيح، وربما توليد **رموز API** أو الاطلاع على بيانات تكامل الشريك (حسب صلاحيات الحساب).

## كيف تتعامل EdfaPay مع المصادقة (وثائق عامة)

وفق [وثائق EdfaPay — Authentication](https://docs.edfapay.com/docs/authentication)، كثير من طلبات **الدفع** (مثل SALE) تعتمد على:

- **`client_key`** (مفتاح العميل)
- **كلمة مرور التجزئة (secret hash password)** المقدَّمة من EdfaPay
- توليد حقل **`hash`** من بريد المدفوع وأرقام البطاقة (صيغة MD5 موصوفة في الوثائق — **يُنفَّذ من الخادم فقط**)

هذا **ليس** نفس مسار **OAuth2 client_credentials** الذي يختبره مسار `payment-gateway-probe` في مشروعنا.

### رموز API (Token Management)

صفحة [Token Management](https://edfapay-payment-gateway-api.readme.io/docs/token) توضح أن **رموز API** تُدار من **الإعدادات (Settings)** في لوحة التحكم، وتُستخدم لتكاملات server-to-server. إن زوّدتكم اللوحة برمز جاهز للنسخ، فغالباً يُرسل كـ **Bearer** أو حقل مخصص حسب مرجع الـ API لكل طلب — راجع [بوابة المطورين](https://edfapay.com/developers/) و [docs.edfapay.com](https://docs.edfapay.com/).

## معرّف العميل + «السر» اللذان لديكما

إن كان الشكل يشبه **OAuth** (معرّف UUID + سر طويل)، فقد يكون ذلك **مسار شريك / بوابة خلفية** خاص بمبسّط وليس نفس صفحة الـ hash في وثائق البطاقة. في هذه الحالة:

1. من [بوابة الدخول](https://mubasat.edfapay.com/login) راجع **الإعدادات** أو **التكامل / API** إن وُجدت.
2. اطلب من **دعم EdfaPay / مبسّط** صراحةً: **عنوان طلب التوكن (Token URL)** و**نوع المصادقة** (OAuth مقابل رمز API ثابت).
3. إن حصلتم على **Token URL**، ضعوه في `PAYMENT_GATEWAY_TOKEN_URL` وجرّب [PAYMENT_GATEWAY_TRIAL_AR.md](PAYMENT_GATEWAY_TRIAL_AR.md).

## ربط الخادم (API) في هذا المستودع

يُعرَّف **معرّف العميل** الذي أرسلتَه كـ **`client_key`** في وثائق EdfaPay، والـ **السر** كـ **كلمة مرور التجزئة** داخل صيغة الـ `hash` (ليس Bearer OAuth). راجع [Authentication](https://docs.edfapay.com/docs/authentication) و [SALE](https://docs.edfapay.com/reference/sale).

### متغيرات البيئة

| المتغير | بديل متوافق | المعنى |
|--------|-------------|--------|
| `EDFAPAY_CLIENT_KEY` | `PAYMENT_GATEWAY_CLIENT_ID` | نفس **client_key** في طلبات EdfaPay |
| `EDFAPAY_HASH_PASSWORD` | `PAYMENT_GATEWAY_CLIENT_SECRET` | **Merchant password** لحساب الـ hash (السر الطويل من اللوحة) |
| `EDFAPAY_MERCHANT_PROFILE` | `PAYMENT_GATEWAY_MERCHANT_PROFILE` | معرّف الملف التجاري إن وُجد (مثل `mubasatplatform_MF_BSF`) — يُبلَّغ في الاستجابة كـ «مضبوط» فقط |
| `EDFAPAY_MERCHANT_CODE` | — | **رمز التاجر** إن زوّدكم المزود بحقل منفصل (اختياري) |
| `EDFAPAY_BASE_URL` | — | افتراضي sandbox: `https://apidev.edfapay.com` — للإنتاج: `https://api.edfapay.com` أو اضبط `EDFAPAY_USE_SANDBOX=false` |
| `EDFAPAY_PROBE_ENABLED` | — | `true` لتفعيل مسار التجربة فقط (أطفئه بعد التحقق) |

### مسار التجربة (SALE تجريبي)

1. ضع المتغيرات أعلاه في `.env` أو `.env.payment.local`.
2. شغّل الخادم ثم (مع `INTERNAL_API_KEY` إن وُجد):

```http
POST /functions/v1/edfapay-probe
```

3. يُرسَل طلب **SALE** إلى `…/payment/post` ببطاقة اختبار من الوثائق (قابلة للتعديل عبر `EDFAPAY_PROBE_TEST_PAN` إلخ). نجاح منطقي عندما تكون الاستجابة `result`/`status` = `REDIRECT` كما في أمثلة EdfaPay.

**أمان:** عطّل `EDFAPAY_PROBE_ENABLED` في الإنتاج؛ لا تعرض `body_preview` للعملاء.

---

## علاقة هذا المشروع

- **مشروع integration-kit** يسجّل التاجر في **Hyperswitch** ويدير بريد/OTP؛ مسار **edfapay-probe** للتحقق من أوراق الاعتماد فقط.
- **ربط قبض الأموال** الكامل عبر EdfaPay يبقى حسب [دليل الاختبار](https://docs.edfapay.com/docs/testing-guide) و [SALE](https://docs.edfapay.com/reference/sale) ولوحة Hyperswitch إن ربطتم الموصل هناك.

## أمان

- لا ترفع مفاتيح EdfaPay إلى git؛ استخدم `.env.payment.local` أو أسرار السيرفر فقط.
- أي سر ظهر في محادثة أو لقطة شاشة يجب **تدويره** من اللوحة.
