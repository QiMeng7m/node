-- AlterTable
ALTER TABLE "User" ADD COLUMN "proAccess" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AiModel" ADD COLUMN "requiresPermission" BOOLEAN NOT NULL DEFAULT false;
