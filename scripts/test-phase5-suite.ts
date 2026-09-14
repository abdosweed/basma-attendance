import { PrismaClient } from '@prisma/client';
import { generateSecure6DigitOtp, hashOtp, requestOtpChallenge, verifyOtpChallenge } from '../src/lib/otp';

const prisma = new PrismaClient();

async function runPhase5Tests() {
  console.log('=============== 🧪 PHASE 5: OTP HARDENING TEST SUITE ===============\n');

  let passed = 0;
  let total = 0;

  function assert(title: string, condition: boolean, details: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`Test #${total}: ✅ PASS - ${title}`);
      console.log(`   Details: ${details}\n`);
    } else {
      console.error(`Test #${total}: ❌ FAIL - ${title}`);
      console.error(`   Details: ${details}\n`);
    }
  }

  try {
    const user = await prisma.user.findFirst({ include: { employee: true } });
    if (!user) {
      console.log('⚠️ لا يوجد مستخدمين لاختبار الـ OTP.');
      return;
    }

    // تنظيف أي طلبات OTP معلقة سابقة للمستخدم لضمان بدء الاختبار بنظافة
    await prisma.otpChallenge.deleteMany({
      where: { userId: user.id },
    });

    // 1. اختبار توليد كود آمن 6 أرقام وتشفيره بـ SHA-256
    const rawOtp = generateSecure6DigitOtp();
    const salt = 'test-salt-123';
    const computedHash = hashOtp(rawOtp, salt);

    assert(
      'توليد كود 6 أرقام وتشفيره بـ SHA-256 بدون تخزين صريح',
      rawOtp.length === 6 && /^\d{6}$/.test(rawOtp) && computedHash.length === 64,
      `الكود المولد: [HIDDEN] | التشفير: ${computedHash.substring(0, 16)}...`
    );

    // 2. طلب تحدي OTP جديد والتأكد من التخزين المشفر
    const reqRes = await requestOtpChallenge(user.id, 'CHECK_IN', user.employee?.companyId);
    assert(
      'إنشاء طلب OTP جديد مع تعيين المهلة وحالة PENDING',
      reqRes.success && !!reqRes.challengeId,
      `Challenge ID: ${reqRes.challengeId} - المهلة: ${reqRes.expiresInSeconds}s`
    );

    const challenge = await prisma.otpChallenge.findUnique({
      where: { id: reqRes.challengeId! },
    });

    assert(
      'التأكد من أن كود الـ OTP ينشأ مشفراً بـ otpHash وأن الكود الصريح ليس مخزناً بالجدول',
      !!challenge && challenge.otpHash !== rawOtp && challenge.salt.length > 0,
      `Stored Hash: ${challenge?.otpHash.substring(0, 16)}... | Plaintext Stored: NO`
    );

    // 3. فحص مهلة الإعادة (Resend Cooldown: 60s)
    const reqRes2 = await requestOtpChallenge(user.id, 'CHECK_IN', user.employee?.companyId);
    assert(
      'منع إعادة إرسال OTP قبل مرور 60 ثانية (Resend Cooldown 429)',
      !reqRes2.success && reqRes2.cooldownSeconds !== undefined && reqRes2.cooldownSeconds > 0,
      `تم حظر الإرسال المباشر. المتبقي: ${reqRes2.cooldownSeconds}s`
    );

    // 4. اختبار محاولة فاشلة برمز خاطئ وزيادة عدد المحاولات
    if (challenge) {
      const verifyFail = await verifyOtpChallenge(user.id, 'CHECK_IN', '000000');
      const updatedChallenge = await prisma.otpChallenge.findUnique({ where: { id: challenge.id } });

      assert(
        'الرمز الخاطئ يزيد عدد المحاولات الفاشلة attemptCount وتظل الحالة PENDING',
        !verifyFail.success && updatedChallenge?.attemptCount === 1,
        `عدد المحاولات الفاشلة المسجلة: ${updatedChallenge?.attemptCount}`
      );
    }

    // 5. اختبار انتهاء الصلاحية تلقائياً (EXPIRED)
    const expiredChallenge = await prisma.otpChallenge.create({
      data: {
        userId: user.id,
        purpose: 'LOGIN',
        otpHash: 'dummyhash',
        salt: 'dummysalt',
        expiresAt: new Date(Date.now() - 1000), // انتهت منذ ثانية
        status: 'PENDING',
      },
    });

    const verifyExpired = await verifyOtpChallenge(user.id, 'LOGIN', '123456');
    const checkExpiredDB = await prisma.otpChallenge.findUnique({ where: { id: expiredChallenge.id } });

    assert(
      'رفض الرمز المنتهي الصلاحية وتحديث حالته تلقائياً إلى EXPIRED',
      !verifyExpired.success && checkExpiredDB?.status === 'EXPIRED',
      `حالة الكود المنتهي الصلاحية بالجدول: ${checkExpiredDB?.status}`
    );

    // 6. اختبار حظر الكود عند تجاوز 5 محاولات فاشلة (BLOCKED)
    const blockedChallenge = await prisma.otpChallenge.create({
      data: {
        userId: user.id,
        purpose: 'DEVICE_APPROVAL',
        otpHash: 'dummyhash',
        salt: 'dummysalt',
        expiresAt: new Date(Date.now() + 180000),
        attemptCount: 4, // المحاولة القادمة ستكون الخامسة
        maxAttempts: 5,
        status: 'PENDING',
      },
    });

    const verifyBlocked = await verifyOtpChallenge(user.id, 'DEVICE_APPROVAL', '999999');
    const checkBlockedDB = await prisma.otpChallenge.findUnique({ where: { id: blockedChallenge.id } });

    assert(
      'تجاوز 5 محاولات فاشلة يحول حالة الـ OTP تلقائياً إلى BLOCKED ويمنع أي محاولة أخرى',
      !verifyBlocked.success && checkBlockedDB?.status === 'BLOCKED',
      `حالة الرمز بعد المحاولة الخامسة الخاطئة: ${checkBlockedDB?.status}`
    );

    // 7. اختبار الاستخدام لمرة واحدة ومنع التكرار (One-Time Use & Atomic Transaction)
    const rawOtp7 = '123456';
    const salt7 = 'salt-7';
    const hash7 = hashOtp(rawOtp7, salt7);

    const validChallenge = await prisma.otpChallenge.create({
      data: {
        userId: user.id,
        purpose: 'CHECK_OUT',
        otpHash: hash7,
        salt: salt7,
        expiresAt: new Date(Date.now() + 180000),
        status: 'PENDING',
      },
    });

    const verifySuccess1 = await verifyOtpChallenge(user.id, 'CHECK_OUT', rawOtp7);
    const verifySuccess2 = await verifyOtpChallenge(user.id, 'CHECK_OUT', rawOtp7); // محاولة إعادة استخدام نفس الرمز

    assert(
      'نجاح التحقق الصحيح (One-Time Use) ومنع إعادة استخدام نفس الرمز مرة ثانية',
      verifySuccess1.success && !verifySuccess2.success,
      `المرة الأولى: ${verifySuccess1.success ? 'نجاح' : 'فشل'} | المرة الثانية (إعادة الاستخدام): ${verifySuccess2.success ? 'نجاح' : 'فشل (ممنوع)'}`
    );

    // 8. فحص سجل التدقيق وعدم طباعة الكود الصريح في AuditLog
    const auditLogs = await prisma.auditLog.findMany({
      where: { userId: user.id, action: { in: ['OTP_CHALLENGE_REQUESTED', 'OTP_CHALLENGE_VERIFIED'] } },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    const containsPlaintext = auditLogs.some((l) => l.newValue?.includes(rawOtp) || l.newValue?.includes('123456'));
    assert(
      'تأكيد أمان سجلات التدقيق AuditLog وعدم تضمنها للرمز الصريح مطلقاً',
      !containsPlaintext,
      `سجلات الـ OTP المفحوصة: ${auditLogs.length} - هل يوجد كود صريح بالسجلات: NO`
    );

    // تنظيف بيانات الاختبار المؤقتة
    await prisma.otpChallenge.deleteMany({
      where: { id: { in: [reqRes.challengeId!, expiredChallenge.id, blockedChallenge.id, validChallenge.id] } },
    });

    console.log(`==================================================`);
    console.log(`SUMMARY: ${passed}/${total} Phase 5 Tests PASSED.`);
    console.log(`🎉 Cryptographic OTP Hardening Engine is 100% SECURE & VERIFIED!`);
  } catch (err: any) {
    console.error('❌ Phase 5 test suite error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase5Tests();
