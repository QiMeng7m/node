-- Rename dailyQuota -> quotaLimit; add lifetime usage fields
ALTER TABLE "User" RENAME COLUMN "dailyQuota" TO "quotaLimit";
ALTER TABLE "User" ADD COLUMN "quotaUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "registeredIp" TEXT;

-- Backfill lifetime usage from historical daily counters
UPDATE "User"
SET "quotaUsed" = COALESCE(
  (SELECT SUM("count") FROM "UsageDaily" WHERE "UsageDaily"."userId" = "User"."id"),
  0
);

-- CreateTable
CREATE TABLE "IpQuota" (
    "ip" TEXT NOT NULL PRIMARY KEY,
    "chatCount" INTEGER NOT NULL DEFAULT 0,
    "registerCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
