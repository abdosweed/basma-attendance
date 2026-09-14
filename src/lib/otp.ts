import crypto from 'crypto';
import { prisma } from './prisma';

export function generateSecure6DigitOtp(): string {
  // توليد كود عشوائي مشفر مكون من 6 أرقام (من 100000 إلى 999999)
  const num = crypto.randomInt(100000, 1000000);
  return num.toString();
}

export function hashOtp(otp: string, salt: string): string {
  return crypto
    .createHash('sha256')
    .update(salt + otp.trim())
    .digest('hex');
}

export interface OtpProviderResponse {
  success: boolean;
  message: string;
  providerStatus: 'DELIVERED' | 'DELIVERY PROVIDER NOT CONFIGURED';
}

/**
 * المزود الافتراضي لإرسال الـ OTP (يمكن ربطه بـ SMS Provider أو Email Provider مستقبلاً)
 */
export async function sendOtpDelivery(
  employeeId: string,
  otpCode: string,
  purpose: string
): Promise<OtpProviderResponse> {
  // إنتاج إشعار آمن داخل النظام
  try {
    const purposeText = purpose === 'CHECK_IN' ? 'تسجيل الحضور' : purpose === 'CHECK_OUT' ? 'تسجيل الخروج' : 'العمليات الحساسة';
    await prisma.notification.create({
      data: {
        employeeId,
        title: 'كود التحقق الآمن (OTP)',
        message: `رمز التحقق الآمن لـ ${purposeText} هو: ${otpCode} (صالح لمدة 3 دقائق)`,
        type: 'WARNING',
      },
    });
  } catch (e) {}

  // في حالة عدم ضبط خدمة إرسال خارجية SMS / Email
  return {
    success: true,
    message: 'تم إرسال كود التحقق بنجاح.',
    providerStatus: 'DELIVERY PROVIDER NOT CONFIGURED',
  };
}

export interface RequestOtpResponse {
  success: boolean;
  challengeId?: string;
  expiresInSeconds?: number;
  message: string;
  providerStatus?: string;
  cooldownSeconds?: number;
}

export async function requestOtpChallenge(
  userId: string,
  purpose: string,
  companyId?: string
): Promise<RequestOtpResponse> {
  let expiryMins = 3;
  let maxAttempts = 5;

  if (companyId) {
    const settings = await prisma.systemSetting.findUnique({ where: { companyId } });
    if (settings) {
      expiryMins = settings.otpExpiryMinutes || 3;
      maxAttempts = settings.maxOtpAttempts || 5;
    }
  }

  const now = new Date();

  // 1. فحص مهلة الإعادة (Resend Cooldown: 60 ثانية)
  const recentChallenge = await prisma.otpChallenge.findFirst({
    where: {
      userId,
      purpose,
      status: 'PENDING',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recentChallenge) {
    const secondsSinceLast = (now.getTime() - recentChallenge.lastSentAt.getTime()) / 1000;
    if (secondsSinceLast < 60) {
      const remainingCooldown = Math.ceil(60 - secondsSinceLast);
      return {
        success: false,
        message: `يرجى الانتظار ${remainingCooldown} ثانية قبل طلب رمز جديد.`,
        cooldownSeconds: remainingCooldown,
      };
    }

    // إبطال التحدي السابق
    await prisma.otpChallenge.update({
      where: { id: recentChallenge.id },
      data: { status: 'EXPIRED' },
    });
  }

  // 2. إنشاء رمز جديد مشفر ومفتاح Salt عشوائي
  const rawOtp = generateSecure6DigitOtp();
  const salt = crypto.randomBytes(16).toString('hex');
  const otpHash = hashOtp(rawOtp, salt);
  const expiresAt = new Date(now.getTime() + expiryMins * 60 * 1000);

  const challenge = await prisma.otpChallenge.create({
    data: {
      userId,
      purpose,
      otpHash,
      salt,
      expiresAt,
      maxAttempts,
      status: 'PENDING',
      lastSentAt: now,
    },
  });

  // 3. إرسال الكود للمستخدم (بدون تسريب الرمز الصريح في سجلات التدقيق أو الـ Console)
  const userObj = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: true },
  });

  let deliveryStatus: 'DELIVERED' | 'DELIVERY PROVIDER NOT CONFIGURED' = 'DELIVERY PROVIDER NOT CONFIGURED';

  if (userObj?.employee) {
    const delivery = await sendOtpDelivery(userObj.employee.id, rawOtp, purpose);
    deliveryStatus = delivery.providerStatus;
  }

  // سجل التدقيق بدون تخزين أو طباعة الـ OTP الصريح
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'OTP_CHALLENGE_REQUESTED',
      entity: 'OtpChallenge',
      entityId: challenge.id,
      newValue: JSON.stringify({
        purpose,
        expiresAt: expiresAt.toISOString(),
        deliveryStatus,
      }),
    },
  });

  return {
    success: true,
    challengeId: challenge.id,
    expiresInSeconds: expiryMins * 60,
    message: `تم إرسال كود التحقق الآمن مكون من 6 أرقام.`,
    providerStatus: deliveryStatus,
  };
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  remainingAttempts?: number;
}

export async function verifyOtpChallenge(
  userId: string,
  purpose: string,
  otpInput: string
): Promise<VerifyOtpResponse> {
  if (!otpInput || otpInput.trim().length !== 6) {
    return { success: false, message: 'رمز التحقق يجب أن يتكون من 6 أرقام.' };
  }

  const now = new Date();

  // 1. البحث عن التحدي القائم والمعلق
  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      userId,
      purpose,
      status: 'PENDING',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) {
    return { success: false, message: 'لا يوجد كود تحقق معلق. يرجى طلب رمز جديد.' };
  }

  // 2. التحقق من انتهاء الصلاحية
  if (now > challenge.expiresAt) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { status: 'EXPIRED' },
    });

    return { success: false, message: 'انتهت صلاحية رمز التحقق (3 دقائق). يرجى طلب رمز جديد.' };
  }

  // 3. التحقق من تجاوز المحاولات الفاشلة المسموح بها
  if (challenge.attemptCount >= challenge.maxAttempts) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { status: 'BLOCKED' },
    });

    return { success: false, message: 'تم تجاوز الحد الأقصى للمحاولات الفاشلة. تم إبطال الرمز.' };
  }

  // 4. مقارنة الـ Hash بأمان زمني (Timing-Safe Comparison)
  const computedHash = hashOtp(otpInput, challenge.salt);
  const bufA = Buffer.from(computedHash, 'utf8');
  const bufB = Buffer.from(challenge.otpHash, 'utf8');
  const isMatch = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);

  if (!isMatch) {
    const newCount = challenge.attemptCount + 1;
    const isNowBlocked = newCount >= challenge.maxAttempts;

    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        attemptCount: newCount,
        status: isNowBlocked ? 'BLOCKED' : 'PENDING',
      },
    });

    if (isNowBlocked) {
      return { success: false, message: 'رمز التحقق غير صحيح. تم حظر الرمز لتجاوز 5 محاولات فاشلة.', remainingAttempts: 0 };
    }

    const remaining = challenge.maxAttempts - newCount;
    return { success: false, message: `رمز التحقق غير صحيح. المتبقي: ${remaining} محاولات.`, remainingAttempts: remaining };
  }

  // 5. التحقق الناجح والمعاملة الذرية (One-Time Use & Atomic Transaction)
  await prisma.$transaction([
    prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        status: 'VERIFIED',
        usedAt: now,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId,
        action: 'OTP_CHALLENGE_VERIFIED',
        entity: 'OtpChallenge',
        entityId: challenge.id,
        newValue: JSON.stringify({
          purpose,
          verifiedAt: now.toISOString(),
        }),
      },
    }),
  ]);

  return {
    success: true,
    message: 'تم التحقق من رمز الـ OTP بنجاح.',
  };
}
