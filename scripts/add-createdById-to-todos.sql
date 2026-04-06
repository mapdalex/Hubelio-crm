-- Migration: Add createdById to todos table
-- This field tracks who created the todo (important for "assign to all" feature)

-- Add the createdById column
ALTER TABLE "Todo" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- Set existing todos to have createdById = userId (the creator is the same as assignee for existing records)
UPDATE "Todo" SET "createdById" = "userId" WHERE "createdById" IS NULL;

-- Make the column required after populating existing data
ALTER TABLE "Todo" ALTER COLUMN "createdById" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_createdById_fkey" 
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "Todo_createdById_idx" ON "Todo"("createdById");
