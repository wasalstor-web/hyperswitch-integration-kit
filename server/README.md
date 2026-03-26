# خادم API (Hono + Prisma)

يستبدل **Edge Functions** عند العمل مع **PostgreSQL مباشرة** بنفس مسارات الطلبات:  
`POST /functions/v1/request-email-verification` … إلخ (متوافق مع الواجهة عند ضبط `VITE_API_BASE_URL`).

## التشغيل السريع

1. من جذر المستودع: `docker compose -f docker-compose.dev.yml up -d`
2. أنشئ `.env` من `.env.example` واضبط `DATABASE_URL` (مثال: `postgresql://app:app@127.0.0.1:5433/onboarding`)
3. `npm run db:deploy` ثم `npm run server:dev`
4. في `web/.env.local`: `VITE_API_BASE_URL=http://localhost:8788` ثم `npm run web:dev` من مجلد `web` أو `npm run web:dev` من الجذر

## Docker (Postgres + API + mock gateway)

من جذر المستودع:

```powershell
copy .env.docker.example .env.docker
docker compose --env-file .env.docker up --build
```

الصورة تُشغّل `prisma migrate deploy` ثم `node server/dist/index.js`. التفاصيل والمتغيرات (بما فيها `CORS_ORIGIN` و`MESSAGE_GATEWAY_URL`): [../docs/DOCKER_STACK_AR.md](../docs/DOCKER_STACK_AR.md).

## الأمان

- `INTERNAL_API_KEY` في `.env` الجذر: يتطلب ترويسة `Authorization: Bearer …` على كل طلبات `/functions/v1/*`. عندها ضع نفس القيمة في `VITE_INTERNAL_API_KEY` في الواجهة.
- لا تفعّل `DANGEROUS_*` في الإنتاج.

## الملفات

| ملف | الدور |
|-----|--------|
| `src/index.ts` | نقطة الدخول والمنفذ |
| `src/app.ts` | المسارات |
| `src/db.ts` | عميل Prisma |
| `src/hash.ts` / `gateway.ts` / `hyperswitch.ts` | منطق مشترك مع Edge |
