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

## علاقة هذا المشروع

- **مشروع integration-kit** يسجّل التاجر في **Hyperswitch** ويدير بريد/OTP؛ **لا** يُنفّذ عملية SALE لـ EdfaPay تلقائياً.
- **ربط قبض الأموال** عبر EdfaPay يتم عادةً من **لوحة Hyperswitch** (موصل/connector إن وُجد) أو من خدمة خلفية تستدعي وثائق EdfaPay الرسمية.

## أمان

- لا ترفع مفاتيح EdfaPay إلى git؛ استخدم `.env.payment.local` أو أسرار السيرفر فقط.
- أي سر ظهر في محادثة أو لقطة شاشة يجب **تدويره** من اللوحة.
