-- Social Media Modul Migration
-- Fuegt Tabellen fuer Social Media Accounts, Posts und Workflow hinzu

-- ============================================
-- ENUMS
-- ============================================

-- Social Platform Enum
DO $$ BEGIN
    CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Social Post Type Enum
DO $$ BEGIN
    CREATE TYPE "SocialPostType" AS ENUM ('POST', 'REEL', 'STORY', 'VIDEO', 'CAROUSEL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Social Post Status Enum
DO $$ BEGIN
    CREATE TYPE "SocialPostStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add SOCIAL_POST to CalendarEventType if not exists
DO $$ BEGIN
    ALTER TYPE "CalendarEventType" ADD VALUE IF NOT EXISTS 'SOCIAL_POST';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLES
-- ============================================

-- Social Accounts (verbundene Social Media Konten pro Firma)
CREATE TABLE IF NOT EXISTS "SocialAccount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpires" TIMESTAMP(3),
    "profileUrl" TEXT,
    "profileImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- Social Posts
CREATE TABLE IF NOT EXISTS "SocialPost" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "postType" "SocialPostType" NOT NULL DEFAULT 'POST',
    "status" "SocialPostStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "calendarEventId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- Social Media (Medien-Dateien fuer Posts)
CREATE TABLE IF NOT EXISTS "SocialMedia" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "altText" TEXT,
    "duration" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialMedia_pkey" PRIMARY KEY ("id")
);

-- Social Post Accounts (Verknuepfung Post -> Accounts)
CREATE TABLE IF NOT EXISTS "SocialPostAccount" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "publishedAt" TIMESTAMP(3),
    "platformPostId" TEXT,
    "platformUrl" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "SocialPostAccount_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- INDEXES
-- ============================================

-- SocialAccount indexes
CREATE INDEX IF NOT EXISTS "SocialAccount_companyId_idx" ON "SocialAccount"("companyId");
CREATE UNIQUE INDEX IF NOT EXISTS "SocialAccount_companyId_platform_accountId_key" ON "SocialAccount"("companyId", "platform", "accountId");

-- SocialPost indexes
CREATE INDEX IF NOT EXISTS "SocialPost_companyId_idx" ON "SocialPost"("companyId");
CREATE INDEX IF NOT EXISTS "SocialPost_status_idx" ON "SocialPost"("status");
CREATE INDEX IF NOT EXISTS "SocialPost_scheduledFor_idx" ON "SocialPost"("scheduledFor");
CREATE INDEX IF NOT EXISTS "SocialPost_createdById_idx" ON "SocialPost"("createdById");

-- SocialMedia indexes
CREATE INDEX IF NOT EXISTS "SocialMedia_postId_idx" ON "SocialMedia"("postId");

-- SocialPostAccount indexes
CREATE INDEX IF NOT EXISTS "SocialPostAccount_postId_idx" ON "SocialPostAccount"("postId");
CREATE INDEX IF NOT EXISTS "SocialPostAccount_accountId_idx" ON "SocialPostAccount"("accountId");
CREATE UNIQUE INDEX IF NOT EXISTS "SocialPostAccount_postId_accountId_key" ON "SocialPostAccount"("postId", "accountId");

-- ============================================
-- FOREIGN KEYS
-- ============================================

-- SocialAccount foreign keys
DO $$ BEGIN
    ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_companyId_fkey" 
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- SocialPost foreign keys
DO $$ BEGIN
    ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_companyId_fkey" 
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_createdById_fkey" 
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_reviewedById_fkey" 
        FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_approvedById_fkey" 
        FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_calendarEventId_fkey" 
        FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- SocialMedia foreign keys
DO $$ BEGIN
    ALTER TABLE "SocialMedia" ADD CONSTRAINT "SocialMedia_postId_fkey" 
        FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- SocialPostAccount foreign keys
DO $$ BEGIN
    ALTER TABLE "SocialPostAccount" ADD CONSTRAINT "SocialPostAccount_postId_fkey" 
        FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "SocialPostAccount" ADD CONSTRAINT "SocialPostAccount_accountId_fkey" 
        FOREIGN KEY ("accountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
