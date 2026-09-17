import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCronAuth } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleSystemCleanup(request);
}

export async function POST(request: NextRequest) {
  return handleSystemCleanup(request);
}

async function handleSystemCleanup(request: NextRequest) {
  try {
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: 'غير مصرح للوصول إلى مهمة تنظيف وصيانة النظام' }, { status: 401 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // 1. تنظيف تحديات OTP المنتهية (Expired OtpChallenge)
    const deletedOtp = await prisma.otpChallenge.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { createdAt: { lt: thirtyDaysAgo } },
        ],
      },
    });

    // 2. تنظيف أكواد التأكيد التفاعلي القديمة التي تجاوزت 30 يوماً
    const deletedVerificationCodes = await prisma.verificationCode.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    // 3. أرشفة محاولات الاختراق والمواقع المشبوهة القديمة القديمة جداً (> 90 يوماً)
    const deletedSuspicious = await prisma.suspiciousAttempt.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
      },
    });

    // توثيق عملية الصيانة الدورية في سجل التدقيق AuditLog
    await prisma.auditLog.create({
      data: {
        userId: 'SYSTEM_CRON',
        action: 'SYSTEM_CLEANUP',
        entity: 'SystemDatabase',
        reason: 'تنظيف أوتوماتيكي دوري لأكواد الـ OTP والرموز المنتهية لتحسين سرعة قاعدة البيانات',
        details: {
          cleanedOtpChallenges: deletedOtp.count,
          cleanedVerificationCodes: deletedVerificationCodes.count,
          cleanedSuspiciousAttempts: deletedSuspicious.count,
          timestamp: now.toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      cleanedOtpChallenges: deletedOtp.count,
      cleanedVerificationCodes: deletedVerificationCodes.count,
      cleanedSuspiciousAttempts: deletedSuspicious.count,
      message: `تم تنظيف وصيانة قاعدة البيانات بنجاح 🧹: (${deletedOtp.count}) OTP, (${deletedVerificationCodes.count}) أكواد تأكيد, (${deletedSuspicious.count}) محاولات قديمة.`,
    });
  } catch (error: any) {
    console.error('System Cleanup Cron Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تنفيذ مهمة تنظيف وصيانة النظام' }, { status: 500 });
  }
}
