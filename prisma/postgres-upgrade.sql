-- ─────────────────────────────────────────────────────────────────────────────
-- GrowthRush — DATABASE UPGRADE (Neon / PostgreSQL)
-- ─────────────────────────────────────────────────────────────────────────────
-- Paste this whole file into the Neon SQL Editor and run it ONCE.
--
-- · 100% idempotent: safe to run again at any time (nothing breaks if a
--   column/table already exists).
-- · Keeps ALL your data: only ADDS what is missing, never deletes or renames.
--
-- Why you may need this: deploys after your first install expect new columns
-- (e.g. Service."cost" for the provider cost / sell price pair). If the
-- database was created from an older schema, every service query fails with
-- "Internal server error" until this upgrade is applied.
-- ─────────────────────────────────────────────────────────────────────────────

-- Service: provider cost per 1k (the "Cost /1k" column shown next to the sell rate)
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "cost" DOUBLE PRECISION;

-- Ticket messages: multimedia attachments stored on the platform
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "fileMime" TEXT;
ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;

-- CMS pages: SEO metadata for the rich page editor
ALTER TABLE "CmsPage" ADD COLUMN IF NOT EXISTS "metaTitle" TEXT;
ALTER TABLE "CmsPage" ADD COLUMN IF NOT EXISTS "metaDescription" TEXT;

-- Media: uploaded files (ticket attachments, blog covers, CMS assets).
-- Bytes live in the database so the platform works on serverless hosting
-- (Vercel + Neon) with no external storage service.
CREATE TABLE IF NOT EXISTS "Media" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Media_id_key" ON "Media"("id");

-- ─────────────────────────────────────────────────────────────────────────────
-- Platform subscriptions: auto-expiry + 30-day grace before deletion
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "Platform" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "Platform" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);

-- AI Agents: bring-your-own-key (the reseller's own model API key, encrypted)
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "apiKey" TEXT;
