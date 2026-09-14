import { PrismaClient } from '@prisma/client';
import { evaluateDeviceTrust, hashDeviceToken } from '../src/lib/device';

const prisma = new PrismaClient();

async function runDeviceApprovalTestSuite() {
  console.log('=============== 🧪 HOTFIX PHASE 4.1: DEVICE APPROVAL WORKFLOW TEST SUITE ===============\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ Test #${totalTests}: ${testName} -> PASSED`);
      passedTests++;
    } else {
      console.error(`❌ Test #${totalTests}: ${testName} -> FAILED ${detail ? `(${detail})` : ''}`);
      process.exit(1);
    }
  }

  try {
    // تجهيز شركة وموظف اختبار
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: { name: 'شركة الاختبار الموحدة' },
      });
    }

    let branchA = await prisma.branch.findFirst({ where: { companyId: company.id } });
    if (!branchA) {
      branchA = await prisma.branch.create({
        data: {
          companyId: company.id,
          name: 'الفرع الرئيسي أ',
          latitude: 32.8872,
          longitude: 13.1913,
          geofenceRadius: 100,
        },
      });
    }

    let branchB = await prisma.branch.create({
      data: {
        companyId: company.id,
        name: 'فرع ثانوي ب',
        latitude: 32.8900,
        longitude: 13.2000,
        geofenceRadius: 100,
      },
    });

    let settings = await prisma.systemSetting.findUnique({ where: { companyId: company.id } });
    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: {
          companyId: company.id,
          trustedDevicesPolicy: 'ONE_DEVICE_ONLY',
        },
      });
    } else {
      await prisma.systemSetting.update({
        where: { id: settings.id },
        data: { trustedDevicesPolicy: 'ONE_DEVICE_ONLY' },
      });
    }

    // إنشاء مستخدم وموظف اختبار
    const testUser = await prisma.user.create({
      data: {
        email: `emp_test_${Date.now()}@basma.ly`,
        passwordHash: 'hash_test_123',
        role: 'EMPLOYEE',
      },
    });

    const testEmp = await prisma.employee.create({
      data: {
        userId: testUser.id,
        companyId: company.id,
        primaryBranchId: branchA.id,
        employeeNumber: `EMP_SUITE_${Date.now()}`,
        firstName: 'أحمد',
        lastName: 'التست',
      },
    });

    const devId1 = `DEV_TEST_A_${Date.now()}`;
    const devId2 = `DEV_TEST_B_${Date.now()}`;

    // 1. جهاز جديد → PENDING
    const eval1 = await evaluateDeviceTrust(testEmp.id, devId1, company.id, 'Mozilla/5.0 (Android Mobile)');
    assert(eval1.status === 'PENDING' && !eval1.isAllowed, 'تسجيل جهاز جديد يعود بحالة PENDING وغير مسموح بالتبصيم مباشرة');

    // 2. يظهر في قائمة الأجهزة المعلقة
    const dbDev1 = await prisma.trustedDevice.findFirst({
      where: { employeeId: testEmp.id, status: 'PENDING' },
    });
    assert(!!dbDev1, 'الجهاز ينشأ بنجاح في قاعدة البيانات بحالة PENDING');

    // 3. منع تكرار إنشاء PENDING لنفس الجهاز والموظف
    const eval1Repeat = await evaluateDeviceTrust(testEmp.id, devId1, company.id, 'Mozilla/5.0 (Android Mobile)');
    assert(eval1Repeat.status === 'PENDING' && eval1Repeat.device?.id === dbDev1?.id, 'منع تكرار طلبات الاعتماد لنفس الجهاز والموظف');

    // 4. اعتماد الجهاز أول مرة (APPROVE)
    const now = new Date();
    const approvedDev1 = await prisma.trustedDevice.update({
      where: { id: dbDev1!.id },
      data: {
        status: 'APPROVED',
        isApproved: true,
        approvedAt: now,
        approvedBy: 'ADMIN_TEST_ID',
      },
    });
    assert(approvedDev1.status === 'APPROVED' && approvedDev1.isApproved, 'اعتماد الجهاز يحوله إلى APPROVED مع تحديث التوقيت والمعتمد');

    // 5. الموظف يستطيع الحضور بعد الاعتماد
    const eval1AfterApprove = await evaluateDeviceTrust(testEmp.id, devId1, company.id, 'Mozilla/5.0 (Android Mobile)');
    assert(eval1AfterApprove.isAllowed && eval1AfterApprove.status === 'APPROVED', 'الموظف يستطيع تسجيل الحضور والانصراف بعد الاعتماد');

    // 6. تسجيل جهاز ثانٍ تحت سياسة ONE_DEVICE_ONLY → PENDING
    const eval2 = await evaluateDeviceTrust(testEmp.id, devId2, company.id, 'Mozilla/5.0 (iPhone iOS)');
    assert(eval2.status === 'PENDING' && !eval2.isAllowed, 'تسجيل جهاز ثانٍ يعود بطلب استبدال PENDING');

    const dbDev2 = await prisma.trustedDevice.findFirst({
      where: { employeeId: testEmp.id, deviceId: hashDeviceToken(devId2) },
    });
    assert(!!dbDev2 && dbDev2.status === 'PENDING', 'الجهاز الثاني ينشأ بحالة PENDING بانتظار موافقة الاستبدال');

    // 7. استبدال ذري (Atomic Replacement): Device 1 -> REVOKED, Device 2 -> APPROVED
    await prisma.$transaction([
      prisma.trustedDevice.updateMany({
        where: { employeeId: testEmp.id, id: { not: dbDev2!.id } },
        data: { status: 'REVOKED', isApproved: false, revokedAt: now, revokedBy: 'ADMIN_TEST_ID' },
      }),
      prisma.trustedDevice.update({
        where: { id: dbDev2!.id },
        data: { status: 'APPROVED', isApproved: true, approvedAt: now, approvedBy: 'ADMIN_TEST_ID' },
      }),
    ]);

    const checkDev1Revoked = await prisma.trustedDevice.findUnique({ where: { id: dbDev1!.id } });
    const checkDev2Approved = await prisma.trustedDevice.findUnique({ where: { id: dbDev2!.id } });

    assert(checkDev1Revoked?.status === 'REVOKED' && !checkDev1Revoked.isApproved, 'الجهاز الأول القديم أصبح REVOKED تلقائياً عند الاستبدال');
    assert(checkDev2Approved?.status === 'APPROVED' && checkDev2Approved.isApproved, 'الجهاز الثاني الجديد أصبح APPROVED كجهاز رئيسي جديد');

    // 8. الجهاز المرفوض/الملغى يمنع الموظف من الحضور (Active Session Enforcement)
    const eval1AfterRevoke = await evaluateDeviceTrust(testEmp.id, devId1, company.id, 'Mozilla/5.0 (Android Mobile)');
    assert(!eval1AfterRevoke.isAllowed && eval1AfterRevoke.status === 'REVOKED', 'الجهاز الملغى REVOKED يمنع فوراً التبصيم أداء الجلسات الحية');

    // 9. رفض الجهاز مع حفظ ملاحظة الإدارة reviewNote
    await prisma.trustedDevice.update({
      where: { id: dbDev1!.id },
      data: {
        status: 'REVOKED',
        rejectedAt: now,
        rejectedBy: 'ADMIN_TEST_ID',
        reviewNote: 'جهاز غير معروف من قِبل المشرف',
      },
    });

    const checkRejected = await prisma.trustedDevice.findUnique({ where: { id: dbDev1!.id } });
    assert(checkRejected?.reviewNote === 'جهاز غير معروف من قِبل المشرف', 'حفظ ملاحظة سبب الرفض/الإلغاء reviewNote بنجاح');

    // 10. حظر الجهاز (BLOCK)
    await prisma.trustedDevice.update({
      where: { id: dbDev1!.id },
      data: { status: 'BLOCKED', isApproved: false },
    });

    const eval1Blocked = await evaluateDeviceTrust(testEmp.id, devId1, company.id, 'Mozilla/5.0 (Android Mobile)');
    assert(!eval1Blocked.isAllowed && eval1Blocked.status === 'BLOCKED', 'حظر الجهاز BLOCKED يمنع التبصيم بالكامل ويعود بحالة BLOCKED');

    // 11. حظر استخدام نفس توكن الجهاز لموظف آخر (Device Token Ownership Protection)
    const testUser2 = await prisma.user.create({
      data: {
        email: `emp2_test_${Date.now()}@basma.ly`,
        passwordHash: 'hash_test_456',
        role: 'EMPLOYEE',
      },
    });

    const testEmp2 = await prisma.employee.create({
      data: {
        userId: testUser2.id,
        companyId: company.id,
        primaryBranchId: branchA.id,
        employeeNumber: `EMP2_SUITE_${Date.now()}`,
        firstName: 'محمود',
        lastName: 'الثاني',
      },
    });

    const evalMismatch = await evaluateDeviceTrust(testEmp2.id, devId2, company.id, 'Mozilla/5.0 (iPhone iOS)');
    assert(!evalMismatch.isAllowed && evalMismatch.status === 'BLOCKED', 'منع اقتران نفس توكن الجهاز المعتمد لموظف آخر (Device Token Account Mismatch)');

    // 12. تنظيف بيانات الاختبار
    await prisma.trustedDevice.deleteMany({ where: { employeeId: { in: [testEmp.id, testEmp2.id] } } });
    await prisma.employee.deleteMany({ where: { id: { in: [testEmp.id, testEmp2.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [testUser.id, testUser2.id] } } });
    await prisma.branch.delete({ where: { id: branchB.id } });

    console.log(`\n================================================================`);
    console.log(`🎉 HOTFIX PHASE 4.1 SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
    console.log(`================================================================\n`);
  } catch (err: any) {
    console.error('❌ Test suite execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDeviceApprovalTestSuite();
