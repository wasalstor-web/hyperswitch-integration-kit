# Prisma — Postgres مباشر

هذا المجلد يضيف **طبقة قاعدة بيانات احترافية** يمكن الاتصال بها عبر `DATABASE_URL` (DBeaver، `psql`، `prisma studio`)، بجانب مسار **Supabase** الموجود في `supabase/migrations/`.

## الفرق بين المسارين

| المسار | الاستخدام |
|--------|-----------|
| `supabase/migrations/*.sql` | نشر على **Supabase** (لوحة أو `supabase db push`) — جداول `text` + `check` كما في المشروع الأصلي. |
| `prisma/` | **PostgreSQL** مستقل — أنواع `ENUM` في Postgres، نفس الجداول منطقياً، مهاجرات عبر `prisma migrate`. |

لا تشغّل المسارين على **نفس** قاعدة البيانات إلا إذا خططت للتوحيد يدوياً (تعارض أنواع الأعمدة محتمل).

## الأوامر (من جذر المستودع)

```powershell
copy .env.example .env
# عدّل DATABASE_URL

npm install
npm run db:generate
npm run db:migrate
# أو للإنتاج بعد مراجعة SQL:
# npm run db:deploy
```

**التحقق بدون قاعدة:** عيّن مؤقتاً:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres"
npm run db:validate
```

## الملفات

- `schema.prisma` — النموذج والأنواع.
- `migrations/20260326140000_init/` — أول هجرة متوافقة مع المخطط.
