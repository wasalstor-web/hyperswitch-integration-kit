-- توافق إصدارات Postgres + فهرس جزئي + تعليقات (لا يغيّر منطق Prisma)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE INDEX "onboarding_sessions_email_unverified_idx" ON "onboarding_sessions"("email")
  WHERE "email_verified" = false;

COMMENT ON TABLE "onboarding_sessions" IS 'Email verify then OTP; Hyperswitch merchant id after completion.';
COMMENT ON TABLE "message_outbox" IS 'Outbound messages audit (email/sms) via gateway.';
