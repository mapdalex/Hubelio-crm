-- Migration Script: Add Rental Tables for Vermietungssystem
-- Run this script to create the rental tables in your database

-- ============================================
-- ENUM TYPES
-- ============================================

-- Add RENTAL to CalendarType enum (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RENTAL' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CalendarType')) THEN
    ALTER TYPE "CalendarType" ADD VALUE 'RENTAL';
  END IF;
END $$;

-- Add RENTAL to CalendarEventType enum (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RENTAL' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CalendarEventType')) THEN
    ALTER TYPE "CalendarEventType" ADD VALUE 'RENTAL';
  END IF;
END $$;

-- Create RentalBookingStatus enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RentalBookingStatus') THEN
    CREATE TYPE "RentalBookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

-- ============================================
-- RENTAL CATEGORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "RentalCategory" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "color" TEXT NOT NULL DEFAULT '#3b82f6',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RentalCategory_pkey" PRIMARY KEY ("id")
);

-- Indexes for RentalCategory
CREATE INDEX IF NOT EXISTS "RentalCategory_companyId_idx" ON "RentalCategory"("companyId");
CREATE INDEX IF NOT EXISTS "RentalCategory_isActive_idx" ON "RentalCategory"("isActive");

-- Foreign Key for RentalCategory
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RentalCategory_companyId_fkey') THEN
    ALTER TABLE "RentalCategory" ADD CONSTRAINT "RentalCategory_companyId_fkey" 
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================
-- RENTAL ITEM TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "RentalItem" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "categoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "image" TEXT,
  "pricePerHour" DECIMAL(10, 2),
  "pricePerDay" DECIMAL(10, 2),
  "pricePerWeek" DECIMAL(10, 2),
  "pricePerMonth" DECIMAL(10, 2),
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RentalItem_pkey" PRIMARY KEY ("id")
);

-- Indexes for RentalItem
CREATE INDEX IF NOT EXISTS "RentalItem_companyId_idx" ON "RentalItem"("companyId");
CREATE INDEX IF NOT EXISTS "RentalItem_categoryId_idx" ON "RentalItem"("categoryId");
CREATE INDEX IF NOT EXISTS "RentalItem_isActive_idx" ON "RentalItem"("isActive");

-- Foreign Keys for RentalItem
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RentalItem_companyId_fkey') THEN
    ALTER TABLE "RentalItem" ADD CONSTRAINT "RentalItem_companyId_fkey" 
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RentalItem_categoryId_fkey') THEN
    ALTER TABLE "RentalItem" ADD CONSTRAINT "RentalItem_categoryId_fkey" 
      FOREIGN KEY ("categoryId") REFERENCES "RentalCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================
-- RENTAL BOOKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "RentalBooking" (
  "id" TEXT NOT NULL,
  "bookingNumber" TEXT NOT NULL,
  "companyId" TEXT,
  "itemId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "totalPrice" DECIMAL(10, 2),
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "status" "RentalBookingStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "calendarEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RentalBooking_pkey" PRIMARY KEY ("id")
);

-- Unique constraint for bookingNumber
ALTER TABLE "RentalBooking" ADD CONSTRAINT IF NOT EXISTS "RentalBooking_bookingNumber_key" UNIQUE ("bookingNumber");

-- Indexes for RentalBooking
CREATE INDEX IF NOT EXISTS "RentalBooking_companyId_idx" ON "RentalBooking"("companyId");
CREATE INDEX IF NOT EXISTS "RentalBooking_itemId_idx" ON "RentalBooking"("itemId");
CREATE INDEX IF NOT EXISTS "RentalBooking_customerId_idx" ON "RentalBooking"("customerId");
CREATE INDEX IF NOT EXISTS "RentalBooking_startDate_idx" ON "RentalBooking"("startDate");
CREATE INDEX IF NOT EXISTS "RentalBooking_endDate_idx" ON "RentalBooking"("endDate");
CREATE INDEX IF NOT EXISTS "RentalBooking_status_idx" ON "RentalBooking"("status");

-- Foreign Keys for RentalBooking
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RentalBooking_companyId_fkey') THEN
    ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_companyId_fkey" 
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RentalBooking_itemId_fkey') THEN
    ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_itemId_fkey" 
      FOREIGN KEY ("itemId") REFERENCES "RentalItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RentalBooking_customerId_fkey') THEN
    ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_customerId_fkey" 
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RentalBooking_calendarEventId_fkey') THEN
    ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_calendarEventId_fkey" 
      FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================
-- DONE
-- ============================================

-- After running this script, run: npx prisma generate
-- to regenerate the Prisma client with the new models
