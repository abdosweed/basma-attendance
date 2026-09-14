-- AlterTable
ALTER TABLE "TrustedDevice" ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "rejectedBy" TEXT,
ADD COLUMN "reviewNote" TEXT;
