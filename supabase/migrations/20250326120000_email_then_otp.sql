-- تدفق: تأكيد بريد ثم OTP قبل اعتبار الحساب جاهزاً لربط Hyperswitch
-- شغّل: supabase db push   أو   نفّذ من SQL Editor في لوحة Supabase

create extension if not exists "pgcrypto";

-- جلسة إعداد بالبريد (قبل أو بالتوازي مع auth.users)
create table if not exists public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_verified boolean not null default false,
  email_token_hash text,
  email_token_expires_at timestamptz,
  otp_code_hash text,
  otp_expires_at timestamptz,
  otp_attempts smallint not null default 0,
  completed_at timestamptz,
  hyperswitch_merchant_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- البريد يُخزَّن دائماً lowercase من Edge Functions
create unique index if not exists onboarding_sessions_email_unique
  on public.onboarding_sessions (email);

create index if not exists onboarding_sessions_email_unverified_idx
  on public.onboarding_sessions (email)
  where email_verified = false;

-- سجل الرسائل (قنوات عبر بوابتكم)
create table if not exists public.message_outbox (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email', 'sms')),
  recipient text not null,
  template_key text not null,
  payload jsonb not null default '{}',
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  provider_status int,
  provider_body jsonb,
  created_at timestamptz not null default now()
);

create index if not exists message_outbox_status_idx on public.message_outbox (status, created_at desc);

-- لا وصول مباشر من المتصفح — كل شيء عبر Edge Functions بمفتاح الخدمة أو JWT خلفكم
alter table public.onboarding_sessions enable row level security;
alter table public.message_outbox enable row level security;

-- سياسات افتراضية: منع الكل على anon/authenticated المباشر
drop policy if exists "deny_all_onboarding_sessions" on public.onboarding_sessions;
create policy "deny_all_onboarding_sessions"
  on public.onboarding_sessions
  for all
  using (false)
  with check (false);

drop policy if exists "deny_all_message_outbox" on public.message_outbox;
create policy "deny_all_message_outbox"
  on public.message_outbox
  for all
  using (false)
  with check (false);

comment on table public.onboarding_sessions is 'Email verify then OTP; link Hyperswitch merchant id after completion.';
comment on table public.message_outbox is 'Audit trail for gateway-sent messages (email/sms).';
