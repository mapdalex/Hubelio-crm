-- Migration: E-Mail Messages und Ticket-Integration
-- Datum: 2026-04-04

-- 1. Enum für EmailAccountType erstellen
DO $$ BEGIN
    CREATE TYPE "EmailAccountType" AS ENUM ('STANDARD', 'TICKET_SYSTEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. EmailSettings erweitern
ALTER TABLE "EmailSettings" 
ADD COLUMN IF NOT EXISTS "displayName" TEXT,
ADD COLUMN IF NOT EXISTS "accountType" "EmailAccountType" DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS "createTicketOnReceive" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "autoAssignToUserId" TEXT;

-- Foreign Key für autoAssignToUserId
DO $$ BEGIN
    ALTER TABLE "EmailSettings" 
    ADD CONSTRAINT "EmailSettings_autoAssignToUserId_fkey" 
    FOREIGN KEY ("autoAssignToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Index für accountType
CREATE INDEX IF NOT EXISTS "EmailSettings_accountType_idx" ON "EmailSettings"("accountType");

-- 3. EmailMessage Tabelle erstellen
CREATE TABLE IF NOT EXISTS "EmailMessage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "emailSettingsId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "threadId" TEXT,
    "folder" TEXT NOT NULL DEFAULT 'INBOX',
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "toAddress" TEXT NOT NULL,
    "toName" TEXT,
    "cc" TEXT,
    "bcc" TEXT,
    "replyTo" TEXT,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "snippet" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
    "ticketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- Unique constraint für messageId pro Account
ALTER TABLE "EmailMessage" 
ADD CONSTRAINT "EmailMessage_emailSettingsId_messageId_key" 
UNIQUE ("emailSettingsId", "messageId");

-- Foreign Keys für EmailMessage
ALTER TABLE "EmailMessage" 
ADD CONSTRAINT "EmailMessage_emailSettingsId_fkey" 
FOREIGN KEY ("emailSettingsId") REFERENCES "EmailSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailMessage" 
ADD CONSTRAINT "EmailMessage_ticketId_fkey" 
FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indices für EmailMessage
CREATE INDEX IF NOT EXISTS "EmailMessage_companyId_idx" ON "EmailMessage"("companyId");
CREATE INDEX IF NOT EXISTS "EmailMessage_emailSettingsId_idx" ON "EmailMessage"("emailSettingsId");
CREATE INDEX IF NOT EXISTS "EmailMessage_threadId_idx" ON "EmailMessage"("threadId");
CREATE INDEX IF NOT EXISTS "EmailMessage_ticketId_idx" ON "EmailMessage"("ticketId");
CREATE INDEX IF NOT EXISTS "EmailMessage_receivedAt_idx" ON "EmailMessage"("receivedAt");
CREATE INDEX IF NOT EXISTS "EmailMessage_isRead_idx" ON "EmailMessage"("isRead");
CREATE INDEX IF NOT EXISTS "EmailMessage_folder_idx" ON "EmailMessage"("folder");

-- 4. EmailAttachment Tabelle erstellen
CREATE TABLE IF NOT EXISTS "EmailAttachment" (
    "id" TEXT NOT NULL,
    "emailMessageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "contentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id")
);

-- Foreign Key für EmailAttachment
ALTER TABLE "EmailAttachment" 
ADD CONSTRAINT "EmailAttachment_emailMessageId_fkey" 
FOREIGN KEY ("emailMessageId") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index für EmailAttachment
CREATE INDEX IF NOT EXISTS "EmailAttachment_emailMessageId_idx" ON "EmailAttachment"("emailMessageId");

-- Migration abgeschlossen
SELECT 'Migration erfolgreich abgeschlossen: E-Mail Messages und Ticket-Integration' as status;
