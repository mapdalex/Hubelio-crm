-- Migration: Add Folder model and folderId to File
-- Run this SQL directly on your PostgreSQL database

-- Create Folder table
CREATE TABLE IF NOT EXISTS "Folder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- Add folderId column to File table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'File' AND column_name = 'folderId'
    ) THEN
        ALTER TABLE "File" ADD COLUMN "folderId" TEXT;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "Folder_companyId_idx" ON "Folder"("companyId");
CREATE INDEX IF NOT EXISTS "Folder_parentId_idx" ON "Folder"("parentId");
CREATE INDEX IF NOT EXISTS "Folder_createdById_idx" ON "Folder"("createdById");
CREATE INDEX IF NOT EXISTS "File_folderId_idx" ON "File"("folderId");

-- Add foreign key constraints
DO $$
BEGIN
    -- Folder -> Company
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Folder_companyId_fkey'
    ) THEN
        ALTER TABLE "Folder" ADD CONSTRAINT "Folder_companyId_fkey" 
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- Folder -> Folder (parent)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Folder_parentId_fkey'
    ) THEN
        ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" 
        FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Folder -> User (createdBy)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Folder_createdById_fkey'
    ) THEN
        ALTER TABLE "Folder" ADD CONSTRAINT "Folder_createdById_fkey" 
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- File -> Folder
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'File_folderId_fkey'
    ) THEN
        ALTER TABLE "File" ADD CONSTRAINT "File_folderId_fkey" 
        FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
