-- CreateEnum
CREATE TYPE "ModuleId" AS ENUM ('CORE', 'MESSAGE', 'SALES', 'SOCIALS', 'CAMPAIGNS', 'ANALYTICS');

-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('ACTIVE', 'BETA', 'DEPRECATED', 'COMING_SOON');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'TRIAL');

-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "logo" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" "ModuleId" NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "features" TEXT NOT NULL,
    "basePrice" DECIMAL NOT NULL,
    "status" "ModuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "seatLimit" INTEGER,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "trialEndsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE,
    CONSTRAINT "Subscription_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE CASCADE,
    UNIQUE("companyId", "moduleId")
);

-- CreateTable
CREATE TABLE "CompanyUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "CompanyRole" NOT NULL DEFAULT 'MEMBER',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompanyUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "CompanyUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE,
    UNIQUE("userId", "companyId")
);

-- CreateTable
CREATE TABLE "ModulePermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyUserId" TEXT NOT NULL,
    "moduleId" "ModuleId" NOT NULL,
    "canAccess" BOOLEAN NOT NULL DEFAULT true,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModulePermission_companyUserId_fkey" FOREIGN KEY ("companyUserId") REFERENCES "CompanyUser" ("id") ON DELETE CASCADE,
    UNIQUE("companyUserId", "moduleId")
);

-- AddColumn to ActivityLog
ALTER TABLE "ActivityLog" ADD COLUMN "companyId" TEXT;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id");

-- AddColumn to Customer
ALTER TABLE "Customer" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "companyName" TEXT;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id");

-- AddColumn to Ticket
ALTER TABLE "Ticket" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id");

-- AddColumn to Todo
ALTER TABLE "Todo" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id");

-- AddColumn to File
ALTER TABLE "File" ADD COLUMN "companyId" TEXT;
ALTER TABLE "File" ADD CONSTRAINT "File_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id");

-- AddColumn to EmailSettings
ALTER TABLE "EmailSettings" ADD COLUMN "companyId" TEXT;
ALTER TABLE "EmailSettings" ADD CONSTRAINT "EmailSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id");

-- AddColumn to User
ALTER TABLE "User" ADD COLUMN "companyUsers" TEXT; -- JSON relation, handled by Prisma

-- CreateIndex
CREATE INDEX "Company_slug_idx" ON "Company"("slug");
CREATE INDEX "Company_isActive_idx" ON "Company"("isActive");
CREATE INDEX "Module_moduleId_idx" ON "Module"("moduleId");
CREATE INDEX "Module_status_idx" ON "Module"("status");
CREATE INDEX "Subscription_companyId_idx" ON "Subscription"("companyId");
CREATE INDEX "Subscription_moduleId_idx" ON "Subscription"("moduleId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "CompanyUser_userId_idx" ON "CompanyUser"("userId");
CREATE INDEX "CompanyUser_companyId_idx" ON "CompanyUser"("companyId");
CREATE INDEX "ModulePermission_companyUserId_idx" ON "ModulePermission"("companyUserId");
CREATE INDEX "ActivityLog_companyId_idx" ON "ActivityLog"("companyId");
CREATE INDEX "Customer_companyId_idx" ON "Customer"("companyId");
CREATE INDEX "Ticket_companyId_idx" ON "Ticket"("companyId");
CREATE INDEX "Todo_companyId_idx" ON "Todo"("companyId");
CREATE INDEX "File_companyId_idx" ON "File"("companyId");
CREATE INDEX "EmailSettings_companyId_idx" ON "EmailSettings"("companyId");
