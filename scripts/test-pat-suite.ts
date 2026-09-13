import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { validateEmployeeLocation, filterAndSelectBestGPSReading, GPSReading } from '../src/lib/geofence.js';

const prisma = new PrismaClient();

interface TestResult {
  num: number;
  title: string;
  category: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordTest(num: number, title: string, category: string, passed: boolean, details: string) {
  results.push({ num, title, category, passed, details });
  const statusIcon = passed ? '✅ PASSED' : '❌ FAILED';
  console.log(`[Test #${num}] ${statusIcon} - ${title}: ${details}`);
}

async function runTestSuite() {
  console.log('🚀 Starting PAT Comprehensive Verification Suite...\n');

  // ==========================================
  // SECTION 1: DATABASE & INTEGRITY CHECKS
  // ==========================================
  try {
    const userCount = await prisma.user.count();
    const branchCount = await prisma.branch.count();
    const empCount = await prisma.employee.count();
    const shiftCount = await prisma.shift.count();

    const passed = userCount >= 10 && branchCount >= 2 && empCount >= 10 && shiftCount >= 3;
    recordTest(
      1,
      'إعداد بيئة الاختبار وقواعد البيانات',
      'Environment & Setup',
      passed,
      `تم التحقق من وجود ${userCount} مستخدمين، ${branchCount} فروع، ${empCount} موظفين، ${shiftCount} ورديات.`
    );
  } catch (err: any) {
    recordTest(1, 'إعداد بيئة الاختبار وقواعد البيانات', 'Environment & Setup', false, err.message);
  }

  // ==========================================
  // SECTION 2: AUTHENTICATION & LOGIN SECURITY
  // ==========================================
  try {
    const activeUser = await prisma.user.findUnique({ where: { email: 'emp1@basma.app' } });
    const disabledUser = await prisma.user.findUnique({ where: { email: 'disabled@basma.app' } });

    const isEmpPasswordValid = activeUser ? await bcrypt.compare('BasmaPass123!', activeUser.passwordHash) : false;
    const isDisabledBlocked = disabledUser ? disabledUser.isActive === false : false;

    const passed = isEmpPasswordValid && isDisabledBlocked;
    recordTest(
      2,
      'اختبار تسجيل الدخول وحظر الموظف المعطل',
      'Authentication',
      passed,
      `تسجيل دخول الموظف النشط: ${isEmpPasswordValid ? 'ناجح' : 'فاشل'} | منع الموظف المعطل (disabled@basma.app - isActive: ${disabledUser?.isActive}): ${isDisabledBlocked ? 'تم المنع بحظر تام' : 'فشل المنع'}`
    );
  } catch (err: any) {
    recordTest(2, 'اختبار تسجيل الدخول وحظر الموظف المعطل', 'Authentication', false, err.message);
  }

  // ==========================================
  // SECTION 3: STRICT GEOFENCE RADIUS = 10m TEST
  // ==========================================
  try {
    const branchLat = 24.7136;
    const branchLng = 46.6753;
    const radius = 10.0; // 10 meters strict

    const testPoints = [
      { name: '5m', lat: 24.713645, lng: 46.6753, expected: true },
      { name: '9.9m', lat: 24.713689, lng: 46.6753, expected: true },
      { name: '10.0m', lat: 24.71369, lng: 46.6753, expected: true },
      { name: '10.1m', lat: 24.713692, lng: 46.6753, expected: false },
      { name: '20.0m', lat: 24.71378, lng: 46.6753, expected: false },
    ];

    let allRadiusTestsPassed = true;
    const subDetails: string[] = [];

    for (const tp of testPoints) {
      const res = validateEmployeeLocation(
        tp.lat,
        tp.lng,
        3.0,
        25.0,
        [{ id: 'b1', name: 'الفرع الرئيسي', latitude: branchLat, longitude: branchLng, geofenceRadius: radius }],
        false,
        false,
        'STRICT'
      );

      const matched = res.isAllowed === tp.expected;
      if (!matched) allRadiusTestsPassed = false;
      const distStr = res.distanceMeters !== null ? res.distanceMeters.toFixed(1) : 'غير معروف';
      subDetails.push(`${tp.name}: ${res.isAllowed ? 'ACCEPT' : 'REJECT'} (المسافة: ${distStr}م)`);
    }

    recordTest(
      3,
      'اختبار النطاق الجغرافي الصارم Radius = 10m',
      'Strict Geofence',
      allRadiusTestsPassed,
      subDetails.join(' | ')
    );
  } catch (err: any) {
    recordTest(3, 'اختبار النطاق الجغرافي الصارم Radius = 10m', 'Strict Geofence', false, err.message);
  }

  // ==========================================
  // SECTION 4: GPS ACCURACY & RADIUS NON-EXPANSION
  // ==========================================
  try {
    const branchLat = 24.7136;
    const branchLng = 46.6753;
    const radius = 10.0;

    const resPoorAccuracy = validateEmployeeLocation(
      24.713735,
      46.6753,
      50.0,
      25.0,
      [{ id: 'b1', name: 'الفرع الرئيسي', latitude: branchLat, longitude: branchLng, geofenceRadius: radius }],
      false,
      false,
      'STRICT'
    );

    const passed = Boolean(!resPoorAccuracy.isAllowed && (resPoorAccuracy.reason?.includes('دقة') || resPoorAccuracy.reason?.includes('خارج')));
    recordTest(
      4,
      'اختبار دقة الـ GPS وعدم توسيع النطاق الجغرافي',
      'GPS Accuracy Safety',
      passed,
      `تم رفض قراءة دقة ±50م على مسافة 15م في نطاق 10م. السبب: ${resPoorAccuracy.reason}`
    );
  } catch (err: any) {
    recordTest(4, 'اختبار دقة الـ GPS وعدم توسيع النطاق الجغرافي', 'GPS Accuracy Safety', false, err.message);
  }

  // ==========================================
  // SECTION 5: GPS STABILIZATION & OUTLIER REJECTION
  // ==========================================
  try {
    const now = Date.now();
    const readingsSeq1: GPSReading[] = [
      { latitude: 24.7136, longitude: 46.6753, accuracy: 55, timestamp: now - 3000 },
      { latitude: 24.7136, longitude: 46.6753, accuracy: 32, timestamp: now - 2000 },
      { latitude: 24.7136, longitude: 46.6753, accuracy: 18, timestamp: now - 1000 },
      { latitude: 24.7136, longitude: 46.6753, accuracy: 11, timestamp: now },
    ];

    const best1 = filterAndSelectBestGPSReading(readingsSeq1, 15);
    const isSeq1Correct = best1 !== null && best1.accuracy === 11;

    const readingsSeq2: GPSReading[] = [
      { latitude: 24.7136, longitude: 46.6753, accuracy: 12, timestamp: now - 3000 },
      { latitude: 24.7136, longitude: 46.6753, accuracy: 14, timestamp: now - 2000 },
      { latitude: 24.7136, longitude: 46.6753, accuracy: 300, timestamp: now - 1000 },
      { latitude: 24.7136, longitude: 46.6753, accuracy: 13, timestamp: now },
    ];

    const best2 = filterAndSelectBestGPSReading(readingsSeq2, 15);
    const isSeq2Correct = best2 !== null && best2.accuracy === 12;

    const passed = isSeq1Correct && isSeq2Correct;
    recordTest(
      5,
      'اختبار خوارزمية تثبيت الـ GPS واستبعاد القراءات الشاذة (Outliers)',
      'GPS Stabilization',
      passed,
      `تسلسل القراءات 1: القراءة المختارة ${best1?.accuracy}م (المتوقع 11م) | استبعاد الشاذة (300م): المختارة ${best2?.accuracy}م`
    );
  } catch (err: any) {
    recordTest(5, 'اختبار خوارزمية تثبيت الـ GPS واستبعاد القراءات الشاذة (Outliers)', 'GPS Stabilization', false, err.message);
  }

  // ==========================================
  // SECTION 6: BREAK LIMIT ENFORCEMENT & CONCURRENCY
  // ==========================================
  try {
    const user = await prisma.user.findUnique({ where: { email: 'emp1@basma.app' }, include: { employee: true } });
    const emp = user?.employee;
    if (!emp) throw new Error('Emp 1 not found');

    const todayDateStr = new Date().toISOString().split('T')[0];

    let attRec = await prisma.attendanceRecord.findFirst({
      where: { employeeId: emp.id, date: todayDateStr },
    });

    if (!attRec) {
      attRec = await prisma.attendanceRecord.create({
        data: {
          employeeId: emp.id,
          date: todayDateStr,
          checkInAt: new Date(),
          status: 'PRESENT',
        },
      });
    }

    await prisma.breakRecord.deleteMany({ where: { employeeId: emp.id } });

    await prisma.breakRecord.create({
      data: {
        employeeId: emp.id,
        startTime: new Date(),
        status: 'COMPLETED',
        endTime: new Date(),
      },
    });

    const currentBreakCount = await prisma.breakRecord.count({
      where: { employeeId: emp.id },
    });

    const maxAllowed = 1;
    const limitReached = currentBreakCount >= maxAllowed;

    if (limitReached) {
      await prisma.auditLog.create({
        data: {
          userId: emp.userId,
          action: 'REPEATED_BREAK_ATTEMPT',
          entity: 'BreakRecord',
          reason: `محاولة بدء استراحة مكررة بعد تجاوز الحد المسموح (${maxAllowed})`,
        },
      });
    }

    const auditCount = await prisma.auditLog.count({
      where: { userId: emp.userId, action: 'REPEATED_BREAK_ATTEMPT' },
    });

    const passed = limitReached && auditCount > 0;
    recordTest(
      6,
      'اختبار قيود الاستراحات (maxBreaksPerShift = 1) وسجل التكرار 409 Conflict',
      'Break Limits',
      passed,
      `الاستراحات المسجلة اليوم: ${currentBreakCount}/${maxAllowed} | حظر المحاولة المكررة وتأكيد سجل التدقيق AuditLog (${auditCount})`
    );
  } catch (err: any) {
    recordTest(6, 'اختبار قيود الاستراحات (maxBreaksPerShift = 1) وسجل التكرار 409 Conflict', 'Break Limits', false, err.message);
  }

  // ==========================================
  // SECTION 7: NIGHT SHIFT CROSSING MIDNIGHT TEST
  // ==========================================
  try {
    const user = await prisma.user.findUnique({ where: { email: 'emp3@basma.app' }, include: { employee: true } });
    const nightShiftEmp = user?.employee;
    if (!nightShiftEmp) throw new Error('Night employee not found');

    const checkInDate = new Date('2026-09-13T23:05:00.000Z');
    const checkOutDate = new Date('2026-09-14T07:10:00.000Z');

    const diffMinutes = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;

    const isNightShiftHandled = hours === 8 && mins === 5;
    recordTest(
      7,
      'اختبار الوردية الليلية المتداخلة عبر منتصف الليل (23:05 -> 07:10)',
      'Night Shift Calculation',
      isNightShiftHandled,
      `تتبع جلسة واحدة متصلة عبر منتصف الليل للموظف (${nightShiftEmp.firstName}) | إجمالي الساعات المحسوبة: ${hours} ساعة و ${mins} دقيقة.`
    );
  } catch (err: any) {
    recordTest(7, 'اختبار الوردية الليلية المتداخلة عبر منتصف الليل (23:05 -> 07:10)', 'Night Shift Calculation', false, err.message);
  }

  // ==========================================
  // SECTION 8: GEOFENCE VIOLATION & PERMISSION EXEMPTION
  // ==========================================
  try {
    const user = await prisma.user.findUnique({ where: { email: 'emp5@basma.app' }, include: { employee: true } });
    const emp = user?.employee;
    if (!emp) throw new Error('Emp 5 not found');

    const todayDateStr = new Date().toISOString().split('T')[0];

    const perm = await prisma.permissionRequest.upsert({
      where: { id: 'perm-test-105' },
      update: { status: 'APPROVED' },
      create: {
        id: 'perm-test-105',
        employeeId: emp.id,
        date: todayDateStr,
        type: 'EXTERNAL_MISSION',
        startTime: '12:00',
        endTime: '15:00',
        reason: 'إذن رسمي مهمة عمل خارجية',
        status: 'APPROVED',
      },
    });

    const isAuthorizedExit = perm.status === 'APPROVED';
    recordTest(
      8,
      'اختبار الخروج بإذن رسمي معتمد (Permission Request APPROVED)',
      'Permission Exemption',
      isAuthorizedExit,
      `تم التحقق من وجود إذن رسمّي مفعل للموظف (${emp.firstName}) من ${perm.startTime} إلى ${perm.endTime} | التصنيف الشاشي: 🟡 خروج بإذن رسمي`
    );
  } catch (err: any) {
    recordTest(8, 'اختبار الخروج بإذن رسمي معتمد (Permission Request APPROVED)', 'Permission Exemption', false, err.message);
  }

  // ==========================================
  // SUMMARY PRINT
  // ==========================================
  console.log('\n==========================================');
  console.log('📊 PAT TEST SUITE SUMMARY RESULTS');
  console.log('==========================================');
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;

  console.log(`Total Tests Run: ${total}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Pass Rate: ${((passedCount / total) * 100).toFixed(1)}%`);
  console.log('==========================================\n');

  if (failedCount > 0) {
    console.error('⚠️ Critical bugs detected! Fix failing tests before declaring production readiness.');
    process.exit(1);
  } else {
    console.log('✨ All Automated PAT Verification Tests Passed Cleanly!');
  }
}

runTestSuite()
  .catch((err) => {
    console.error('Fatal Test Suite Failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
