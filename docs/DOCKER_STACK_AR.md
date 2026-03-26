# Docker: Postgres + API + بوابة وهمية

## المكدس

| الخدمة | الدور |
|--------|--------|
| `db` | Postgres 16، بيانات دائمة في volume `hs_kit_pg_data` |
| `mock-gateway` | يطبع طلبات الرسائل ويرد `200` — `MESSAGE_GATEWAY_URL=http://mock-gateway:8787` |
| `api` | صورة `docker/Dockerfile.api`: `prisma migrate deploy` عند الإقلاع ثم `node server/dist/index.js` |

## التشغيل السريع

```bash
cp .env.docker.example .env.docker
# عدّل PUBLIC_APP_VERIFY_URL إن لزم
docker compose --env-file .env.docker up -d --build
```

الواجهة: `web/.env.local` مع `VITE_API_BASE_URL=http://localhost:8788` (أو عنوان السيرفر).

## محلي: تعريض Postgres على المضيف

```bash
cp docker-compose.override.example.yml docker-compose.override.yml
```

يضيف `5433:5432` لخدمة `db`.

## الإنتاج على VPS

- **لا** تفتح منفذ Postgres للإنترنت؛ فقط `api` خلف Traefik/nginx.
- عطّل `DANGEROUS_*`؛ عرّف `CORS_ORIGIN`، `INTERNAL_API_KEY`، `HYPERSWITCH_*`.
- لبوابة حقيقية: اضبط `MESSAGE_GATEWAY_URL` وأزل خدمة `mock-gateway` من compose محلياً أو استبدلها.

## ربط مع `deploy/hostinger`

الواجهة الثابتة يمكن أن تبقى كما في [deploy/hostinger/README.md](../deploy/hostinger/README.md)؛ وجّه نطاق الـ API إلى حاوية `api` على الشبكة الداخلية أو منفذ منشور بجدار ناري.
