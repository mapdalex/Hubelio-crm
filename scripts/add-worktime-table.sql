-- Arbeitszeit-Tracking Tabelle hinzufuegen
-- Migration fuer WorkTime Feature

-- Enum fuer WorkTime-Typen erstellen
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkTimeType') THEN
        CREATE TYPE "WorkTimeType" AS ENUM ('WORK', 'HOME_OFFICE', 'DOCTOR_VISIT');
    END IF;
END $$;

-- WorkTime Tabelle erstellen
CREATE TABLE IF NOT EXISTS "WorkTime" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT NOT NULL,
    "type" "WorkTimeType" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkTime_pkey" PRIMARY KEY ("id")
);

-- Foreign Key Constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'WorkTime_companyId_fkey'
    ) THEN
        ALTER TABLE "WorkTime" ADD CONSTRAINT "WorkTime_companyId_fkey" 
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'WorkTime_userId_fkey'
    ) THEN
        ALTER TABLE "WorkTime" ADD CONSTRAINT "WorkTime_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Indexes fuer Performance
CREATE INDEX IF NOT EXISTS "WorkTime_companyId_idx" ON "WorkTime"("companyId");
CREATE INDEX IF NOT EXISTS "WorkTime_userId_idx" ON "WorkTime"("userId");
CREATE INDEX IF NOT EXISTS "WorkTime_startTime_idx" ON "WorkTime"("startTime");
CREATE INDEX IF NOT EXISTS "WorkTime_type_idx" ON "WorkTime"("type");
