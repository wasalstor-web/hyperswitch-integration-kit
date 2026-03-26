# تجربة ربط بوابة الدفع (OAuth2) — خادم API فقط

هذا المسار **ليس** [بوابة الرسائل](GATEWAY_HYPERSWITCH_AR.md) (`MESSAGE_GATEWAY_URL`) ولا يستبدل إعداد **موصل الدفع** داخل **Hyperswitch**. الهدف: التحقق أن **معرّف العميل** و**السر** يعملان مع **نقطة طلب التوكن** التي يزوّدكم بها مزود «ادفع» أو البنك.

## الأمان

- لا ترفع **السر** أو **معرّف العميل** إلى git. ضعها فقط في `.env` محلياً أو أسرار السيرفر / Docker.
- إذا ظهر السر في محادثة أو لقطة شاشة، **دوّره** من لوحة المزود فوراً.
- بعد نجاح التجربة، عطّل المسار: احذف `PAYMENT_GATEWAY_PROBE_ENABLED` أو اضبطه على `false`.

## المتغيرات

| المتغير | المعنى |
|--------|--------|
| `PAYMENT_GATEWAY_TOKEN_URL` | عنوان **POST** لطلب التوكن (من وثائق المزود؛ غالباً `…/oauth/token` أو ما يعادله). **إلزامي** للفحص. |
| `PAYMENT_GATEWAY_CLIENT_ID` | معرّف العميل |
| `PAYMENT_GATEWAY_CLIENT_SECRET` | السر |
| `PAYMENT_GATEWAY_SCOPE` | اختياري؛ إن طلبه المزود |
| `PAYMENT_GATEWAY_AUTH_MODE` | `form` (افتراضي): `client_id` و`client_secret` في جسم النموذج. أو `basic`: `Authorization: Basic` مع نفس الجسم لـ `grant_type`. |
| `PAYMENT_GATEWAY_MERCHANT_PROFILE` | اختياري؛ يُذكَر في الاستجابة كـ «مضبوط أم لا» فقط — لا يُرسل تلقائياً لكل المزودين (ربط Hyperswitch/المزود يبقى من لوحة التحكم). |
| `PAYMENT_GATEWAY_PROBE_ENABLED` | `true` **فقط** أثناء التجربة لتفعيل المسار أدناه. |

## الفحص

1. شغّل الخادم (`npm run server:dev` أو Docker مع تمرير المتغيرات للخدمة `api`).
2. إن وُجد `INTERNAL_API_KEY` في `.env`، أرسل الترويسة: `Authorization: Bearer <INTERNAL_API_KEY>`.
3. طلب:

```http
GET /functions/v1/payment-gateway-probe
```

- استجابة `ok: true` و`access_token_received: true` تعني أن الاتصال بنقطة التوكن نجح (دون إرجاع التوكن في JSON).
- إن فشل، جرّب `PAYMENT_GATEWAY_AUTH_MODE=basic` أو راجع `body_preview` (مختصر) مع وثائق المزود.

## الخطوة التالية (إنتاج)

- ربط قبول الدفع الفعلي يتم عادةً عبر **Hyperswitch** (موصل المزود) أو خدمة خلفية منفصلة تستخدم التوكن — وليس عبر مسار الـ probe.
- زوّد فريق التطوير بـ **رابط Token URL الرسمي** من مزود «ادفع» إن لم يكن مذكوراً في العقد.
