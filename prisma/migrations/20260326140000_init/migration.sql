-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('email', 'sms');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('queued', 'sent', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "onboarding_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_token_hash" TEXT,
    "email_token_expires_at" TIMESTAMPTZ(6),
    "otp_code_hash" TEXT,
    "otp_expires_at" TIMESTAMPTZ(6),
    "otp_attempts" SMALLINT NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMPTZ(6),
    "hyperswitch_merchant_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_outbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channel" "MessageChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "template_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "OutboxStatus" NOT NULL DEFAULT 'queued',
    "provider_status" INTEGER,
    "provider_body" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_sessions_email_key" ON "onboarding_sessions"("email");

-- CreateIndex
CREATE INDEX "message_outbox_status_idx" ON "message_outbox"("status", "created_at" DESC);
