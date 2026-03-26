# فهرس الوثائق

اقرأ بالترتيب المناسب لدورك (تشغيل، نشر، أو تصميم).

## البداية السريعة

| المستند | الموضوع |
|---------|---------|
| [../README.md](../README.md) | نظرة عامة، أوامر الواجهة، السكربتات |
| [complete-runbook-ar.md](complete-runbook-ar.md) | إكمال وحلقة بريد → OTP → Hyperswitch |
| [DEPLOY_ORDER_AR.md](DEPLOY_ORDER_AR.md) | ترتيب النشر (سحابي / ذاتي الاستضافة) |

## معمارية وتكامل

| المستند | الموضوع |
|---------|---------|
| [ARCHITECTURE_AR.md](ARCHITECTURE_AR.md) | مبدأ Supabase + Hyperswitch + بوابة الرسائل |
| [GATEWAY_HYPERSWITCH_AR.md](GATEWAY_HYPERSWITCH_AR.md) | عقد بوابة الرسائل + تسجيل التاجر في Hyperswitch |
| [PAYMENT_GATEWAY_TRIAL_AR.md](PAYMENT_GATEWAY_TRIAL_AR.md) | تجربة OAuth2 لبوابة الدفع (مسار probe على خادم API) |
| [OPEN_SOURCE_INTERFACES_AR.md](OPEN_SOURCE_INTERFACES_AR.md) | عقود الواجهة الثابتة، محاذاة Hyperswitch، اعتماديات OSS |

## استضافة

| المستند | الموضوع |
|---------|---------|
| [HOSTINGER_SELFHOSTED_AR.md](HOSTINGER_SELFHOSTED_AR.md) | Supabase ذاتي + Hostinger |
| [../deploy/hostinger/README.md](../deploy/hostinger/README.md) | Docker: واجهة SPA فقط + Traefik |

## قاعدة البيانات والـ API

| المستند | الموضوع |
|---------|---------|
| [../prisma/README.md](../prisma/README.md) | Postgres مباشر عبر Prisma |
| [../server/README.md](../server/README.md) | خادم Hono (بديل Edge Functions محلياً) |
| [DOCKER_STACK_AR.md](DOCKER_STACK_AR.md) | Docker: Postgres + API + بوابة وهمية، المتغيرات، النشر خلف Traefik |
| [../supabase/migrations/](../supabase/migrations/) | مسار Supabase الأصلي (SQL) |
| [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) | حزم npm والتراخيص (توليد: `npm run licenses:notices`) |
