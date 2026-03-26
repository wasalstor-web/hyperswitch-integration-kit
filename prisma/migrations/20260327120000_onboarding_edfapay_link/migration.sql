-- ربط تاجر الواجهة بملف الدفع (مبسّط / EdfaPay) بعد إكمال التحقق
ALTER TABLE "onboarding_sessions" ADD COLUMN IF NOT EXISTS "edfapay_profile_code" TEXT;
ALTER TABLE "onboarding_sessions" ADD COLUMN IF NOT EXISTS "edfapay_linked_at" TIMESTAMPTZ(6);
