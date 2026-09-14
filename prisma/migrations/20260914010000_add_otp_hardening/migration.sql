-- AlterTable
ALTER TABLE "LocationVerificationRequest" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SystemSetting" ADD COLUMN     "maxOtpAttempts" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "otpExpiryMinutes" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "otpRequiredForAdminLogin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otpRequiredForCheckIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otpRequiredForCheckOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otpRequiredForDeviceApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otpRequiredForLogin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "usedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpChallenge_userId_purpose_idx" ON "OtpChallenge"("userId", "purpose");

-- CreateIndex
CREATE INDEX "OtpChallenge_status_idx" ON "OtpChallenge"("status");

-- AddForeignKey
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
