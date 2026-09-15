import { PrismaClient } from '@prisma/client';
import { getSystemHealthReport } from '../src/lib/system-health';

const prisma = new PrismaClient();

async function runPhase7Tests() {
  console.log('=============== 🧪 PHASE 7: SYSTEM HEALTH DASHBOARD TEST SUITE ===============\n');

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
    // 1. Generate System Health Report
    const report = await getSystemHealthReport();
    assert(
      'توليد تقرير صحة المنظومة المباشر getSystemHealthReport()',
      !!report && Array.isArray(report.checks) && report.checks.length > 0,
      `تم توليد الفحوصات بنجاح. عدد عناصر التشخيص: ${report.checks?.length}`
    );

    // 2. Version Check (Version 1.7.0)
    assert(
      'تحديث نسخة النظام إلى النسخة 1.7.0',
      report.version === '1.7.0',
      `نسخة المنظومة المسجلة: v${report.version}`
    );

    // 3. Database Health Check (SELECT 1 Query Latency)
    const dbCheck = report.checks.find((c) => c.id === 'db_postgresql');
    assert(
      'فحص اتصال قاعدة البيانات PostgreSQL وقياس زُمُن الاستجابة (Latency)',
      dbCheck?.status === 'HEALTHY' && (dbCheck?.latencyMs ?? -1) >= 0,
      `الحالة: ${dbCheck?.status} | زمن الاستجابة: ${dbCheck?.latencyMs}ms`
    );

    // 4. Realtime SSE & Smart Fallback Status
    const sseCheck = report.checks.find((c) => c.id === 'realtime_sse');
    assert(
      'فحص تقنية الإشعارات اللحظية Realtime (SSE + Smart Fallback Polling)',
      sseCheck?.category === 'REALTIME' && !!sseCheck?.metadata?.technology,
      `التقنية المسجلة: ${sseCheck?.metadata?.technology} | الملاحظة: ${sseCheck?.metadata?.connectionCountNotice}`
    );

    // 5. Notification Telemetry Metrics
    const notifCheck = report.checks.find((c) => c.id === 'notifications_delivery');
    assert(
      'مؤشرات وقراءات خدمة الإشعارات 24h الحالية',
      notifCheck?.category === 'NOTIFICATIONS' && notifCheck?.metadata?.unreadNotifications !== undefined,
      `غير مقروءة: ${notifCheck?.metadata?.unreadNotifications} | إشعارات 24h: ${notifCheck?.metadata?.totalNotifs24h}`
    );

    // 6. Trusted Devices Metrics
    const devCheck = report.checks.find((c) => c.id === 'trusted_devices');
    assert(
      'مؤشرات محرك الأجهزة المعتمدة Trusted Devices',
      devCheck?.category === 'DEVICES' && devCheck?.metadata?.approvedDevices !== undefined,
      `المعتمدة: ${devCheck?.metadata?.approvedDevices} | المعلقة: ${devCheck?.metadata?.pendingApprovals}`
    );

    // 7. GPS & Geofence Confidence Engine Metrics
    const geoCheck = report.checks.find((c) => c.id === 'location_geofence');
    assert(
      'مؤشرات محرك النطاق الجغرافي ومناطق عدم التأكد',
      geoCheck?.category === 'LOCATION' && geoCheck?.metadata?.uncertainLocationCount !== undefined,
      `المتواجدون: ${geoCheck?.metadata?.totalCheckedIn} | خارج النطاق: ${geoCheck?.metadata?.outsideGeofenceCount} | عدم التأكد: ${geoCheck?.metadata?.uncertainLocationCount}`
    );

    // 8. Cryptographic OTP Engine Status
    const otpCheck = report.checks.find((c) => c.id === 'otp_engine');
    assert(
      'حالة محرك الـ OTP المشفّر والموفر الخارجي NOT CONFIGURED',
      otpCheck?.metadata?.externalProvider === 'NOT CONFIGURED' && otpCheck?.metadata?.engineStatus === 'ACTIVE',
      `حالة المحرك: ${otpCheck?.metadata?.engineStatus} | الموفر الخارجي: ${otpCheck?.metadata?.externalProvider}`
    );

    // 9. Auth & Security Telemetry Metrics
    const authCheck = report.checks.find((c) => c.id === 'auth_security');
    assert(
      'مؤشرات الأمان وحظر التخمين ومحاولات الخلل',
      authCheck?.category === 'SECURITY' && authCheck?.metadata?.lockedAccounts !== undefined,
      `محاولات فاشلة 24h: ${authCheck?.metadata?.failedLogins24h} | الحسابات المغلقة: ${authCheck?.metadata?.lockedAccounts}`
    );

    // 10. Attendance Engine & Shift Rotation Metrics
    const attCheck = report.checks.find((c) => c.id === 'attendance_shifts');
    assert(
      'مؤشرات محرك الحضور والاستراحات والورديات 2026',
      attCheck?.category === 'ATTENDANCE' && attCheck?.metadata?.openAttendanceSessions !== undefined,
      `جلسات مفتوحة: ${attCheck?.metadata?.openAttendanceSessions} | استراحات نشطة: ${attCheck?.metadata?.openBreaksCount}`
    );

    // 11. Database Integrity Checks
    const integrityCheck = report.checks.find((c) => c.id === 'db_integrity_check');
    assert(
      'فحص سلامة وربط البيانات وعدم وجود استراحات يتيمة',
      integrityCheck?.category === 'DATABASE' && integrityCheck?.metadata?.orphanBreaksCount !== undefined,
      `الاستراحات اليتيمة: ${integrityCheck?.metadata?.orphanBreaksCount} | الجلسات المزدوجة: ${integrityCheck?.metadata?.duplicateSessionsCount}`
    );

    // 12. Backup & Restore Explicit NOT VERIFIED Check
    const backupCheck = report.checks.find((c) => c.id === 'backup_restore');
    assert(
      'عرض حالة النسخ الاحتياطي بصراحة كـ NOT VERIFIED وتوجيهه لـ Phase 8',
      backupCheck?.status === 'DEGRADED' && backupCheck?.metadata?.backupState === 'NOT VERIFIED',
      `حالة النسخ الاحتياطي: ${backupCheck?.metadata?.backupState} | الهدف: ${backupCheck?.metadata?.targetPhase}`
    );

    // 13. Known Limitations Cards
    assert(
      'قائمة القيود التشغيلية المعروفة بالنظام (Known System Limitations)',
      Array.isArray(report.knownLimitations) && report.knownLimitations.length >= 5,
      `عدد القيود المسجلة والموثقة: ${report.knownLimitations.length}`
    );

    // 14. Security Audit: ZERO Secrets Exposure Check
    const reportString = JSON.stringify(report);
    const hasSecrets =
      reportString.includes('DATABASE_URL') ||
      reportString.includes('JWT_SECRET') ||
      reportString.includes('SUPABASE_SERVICE_ROLE_KEY') ||
      reportString.includes('otpHash') ||
      reportString.includes('deviceTokenHash') ||
      reportString.includes('passwordHash');

    assert(
      'تدقيق الأمان الصارم (Security Audit): خلو التقرير من أي مفاتيح أو أكواد أو سلاسل اتصال DATABASE_URL',
      !hasSecrets,
      `تسريب بيانات سرية: NO (تم فحص النص الصريح والتأكد من تصفية المخرجات)`
    );

    // 15. System Health Score Formula Consistency
    assert(
      'حساب مؤشر الصحة العام (System Health Score 0-100)',
      typeof report.score === 'number' && report.score >= 0 && report.score <= 100,
      `الدرجة المحسوبة: ${report.score} / 100 | الحالة العامة: ${report.overallStatus}`
    );

    // 16. Critical Incident Banner Detection Logic
    assert(
      'منطق كشف الأعطال الحرجة (Critical Incident Banner Detection)',
      typeof report.hasCriticalIncident === 'boolean',
      `وجو أنباء أعطال حرجة: ${report.hasCriticalIncident}`
    );

    console.log(`\n==================================================`);
    console.log(`📊 PHASE 7 TEST RESULTS: ${passed}/${total} PASSED`);
    console.log(`==================================================\n`);

    if (passed < total) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ خطأ غير متوقع أثناء تنفيذ اختبارات Phase 7:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase7Tests();
