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
-- and tables. If the database was created from an older schema, affected
-- queries fail with "Internal server error" until this upgrade is applied.
-- The same statements are available in-app: Admin → Settings → "Repair
-- database" runs exactly this, one click, no SQL needed.
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Remove payment cards entirely (PCI risk: raw card data must never touch
-- this server). Saved-card storage is gone; gateways (PayPal, MercadoPago,
-- Pix, Cryptomus, CoinPayments, Payoneer) process cards on THEIR side.
-- ─────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "PaymentMethod";

-- ─────────────────────────────────────────────────────────────────────────────
-- CRM (omnichannel inbox): channels, contacts, labels, quick replies,
-- AI agents, automations, conversations, messages.
-- Safe on fresh AND old databases — every statement is IF NOT EXISTS.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Channel" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "config" TEXT DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Contact" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "labels" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ownerId" TEXT,
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Label" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#f43f5e',
    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuickReply" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "shortcut" TEXT,
    CONSTRAINT "QuickReply_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AiAgent" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'OPENAI',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "prompt" TEXT,
    "knowledge" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "apiKey" TEXT,
    "baseUrl" TEXT,
    "channels" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "resolved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiAgent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Automation" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'KEYWORD',
    "matchValue" TEXT,
    "actions" TEXT DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedName" TEXT,
    "unread" INTEGER NOT NULL DEFAULT 0,
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'IN',
    "body" TEXT NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- AI Agents: bring-your-own-key (the reseller's own model API key, encrypted;
-- platform pays nothing) + optional custom OpenAI-compatible endpoint
-- (OpenRouter, Groq, Together, Ollama…)
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "apiKey" TEXT;
ALTER TABLE "AiAgent" ADD COLUMN IF NOT EXISTS "baseUrl" TEXT;

-- Hot-path indexes for the CRM queries
CREATE INDEX IF NOT EXISTS "Channel_platformId_idx" ON "Channel"("platformId");
CREATE INDEX IF NOT EXISTS "Contact_platformId_idx" ON "Contact"("platformId");
CREATE INDEX IF NOT EXISTS "Conversation_platformId_idx" ON "Conversation"("platformId");
CREATE INDEX IF NOT EXISTS "Message_conversationId_idx" ON "Message"("conversationId");
