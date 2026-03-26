# هيكل المشروع (مرجع سريع)

```
hyperswitch-integration-kit/
├── README.md                 # نقطة الدخول الرئيسية
├── package.json              # سكربتات الجذر: Prisma + مساعدة الويب
├── .env.example              # قالب DATABASE_URL (Prisma)
│
├── docs/                     # كل الوثائق العربية + الفهرس
│   ├── README.md             # فهرس الوثائق
│   ├── PROJECT_STRUCTURE_AR.md
│   ├── ARCHITECTURE_AR.md
│   ├── complete-runbook-ar.md
│   ├── DEPLOY_ORDER_AR.md
│   ├── GATEWAY_HYPERSWITCH_AR.md
│   └── HOSTINGER_SELFHOSTED_AR.md
│
├── prisma/                   # Postgres مباشر (وصول عبر DATABASE_URL)
│   ├── schema.prisma
│   ├── migrations/
│   └── README.md
│
├── server/                   # خادم Hono + Prisma (بديل Edge Functions محلياً)
│   ├── src/
│   └── README.md
│
├── docker-compose.dev.yml    # Postgres للتطوير المحلي
│
├── supabase/                 # مسار Supabase الكلاسيكي
│   ├── migrations/           # SQL للوحة Supabase / db push
│   └── functions/            # Edge Functions (Deno)
│
├── web/                      # واجهة Vite (SPA)
│   ├── src/
│   ├── index.html
│   └── package.json
│
├── scripts/                  # PowerShell: نشر، بناء، تحقق
├── tools/                    # بوابة رسائل وهمية للتطوير
├── deploy/hostinger/         # Docker: خدمة الواجهة فقط
└── build/                    # مخرجات مُولَّدة (لا تُعدَّل يدوياً) — في .gitignore
```

## مسؤوليات المجلدات

| مجلد | المسؤولية |
|------|-----------|
| **prisma/** | نموذج بيانات TypeScript + هجرات لـ **PostgreSQL** مستقل عن مزوّد واحد. |
| **supabase/** | نفس المنطق عند استضافة الجداول والدوال على **Supabase**. |
| **web/** | تجربة المستخدم؛ تتصل بـ `…/functions/v1/*` فقط، لا بقاعدة البيانات مباشرة. |
| **scripts/** | أتمتة النشر والتحقق على Windows (PowerShell). |
| **deploy/hostinger/** | حزمة عزل لنشر الواجهة خلف Traefik. |

## قاعدة بيانات: أي مسار أستخدم؟

- **مشروعك كله على Supabase:** نفّذ `supabase/migrations` وانشر الدوال من `supabase/functions`.
- **تريد Postgres مع وصول مباشر (CLI/GUI):** استخدم `prisma/` و`DATABASE_URL`؛ خادم API يربط بين الواجهة والـ DB (تطوير مستقبلي خارج هذا المستودع أو دمج لاحق).

لا تخلط المسارين على نفس قاعدة البيانات دون مراجعة اختلاف الأنواع (`ENUM` مقابل `text` + `check`).
