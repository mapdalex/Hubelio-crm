-- Migration: Reinigungstage fuer Mietobjekte + RENTAL_CLEANING Kalendertypen

-- 1. cleaningDays Spalte zu RentalItem hinzufuegen
ALTER TABLE "RentalItem" ADD COLUMN IF NOT EXISTS "cleaningDays" INTEGER;

-- 2. RENTAL_CLEANING zu CalendarType Enum hinzufuegen
ALTER TYPE "CalendarType" ADD VALUE IF NOT EXISTS 'RENTAL_CLEANING';

-- 3. RENTAL_CLEANING zu CalendarEventType Enum hinzufuegen
ALTER TYPE "CalendarEventType" ADD VALUE IF NOT EXISTS 'RENTAL_CLEANING';
