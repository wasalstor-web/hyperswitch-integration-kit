-- ربط جلسة الإعداد بملف مبسّط/EdfaPay (يتطابق مع Prisma)
alter table public.onboarding_sessions
  add column if not exists edfapay_profile_code text,
  add column if not exists edfapay_linked_at timestamptz;

comment on column public.onboarding_sessions.edfapay_profile_code is 'Merchant profile / sub-merchant code from Mubasat-EdfaPay portal.';
comment on column public.onboarding_sessions.edfapay_linked_at is 'When the merchant confirmed payment profile linkage on your platform.';
