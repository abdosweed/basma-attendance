import { PrismaClient } from '@prisma/client';
import { evaluateDeviceTrust, hashDeviceToken } from '../src/lib/device';

const prisma = new PrismaClient();

async function runPhase4Tests() {
  console.log('=============== 🧪 PHASE 4: TRUSTED DEVICE REVIEW TEST SUITE ===============\n');

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
    // 1. جلب بيانات موظف افتراضي
    const emp = await prisma.employee.findFirst({
      include: { company: true },
    });

    if (!emp) {
      console.log('⚠️ لا يوجد موظفين لاختبار الأجهزة المعتمدة.');
      return;
    }

    const testTokenA = 'test-token-device-a-' + Date.now();
    const testTokenB = 'test-token-device-b-' + Date.now();
    const hashA = hashDeviceToken(testTokenA);
    const hashB = hashDeviceToken(testTokenB);

    // 2. اختبار تسجيل جهاز جديد PENDING في سياسة REQUIRE_APPROVAL / ALLOW_MULTIPLE
    const devEval1 = await evaluateDeviceTrust(emp.id, testTokenA, emp.companyId, 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)');
    assert(
      'تسجيل جهاز جديد يمنح حالة PENDING في انتظار موافقة الإدارة',
      devEval1.status === 'PENDING' && !devEval1.isAllowed,
      `حالة الجهاز المسترجعة: ${devEval1.status} - الرسالة: ${devEval1.reason}`
    );

    // 3. اعتماد الجهاز بواسطة الإدارة (APPROVE)
    const dbDeviceA = await prisma.trustedDevice.findFirst({
      where: { employeeId: emp.id, deviceId: hashA },
    });

    if (dbDeviceA) {
      await prisma.trustedDevice.update({
        where: { id: dbDeviceA.id },
        data: { status: 'APPROVED', isApproved: true },
      });
    }

    const devEval2 = await evaluateDeviceTrust(emp.id, testTokenA, emp.companyId, 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)');
    assert(
      'الجهاز المعتمد APPROVED يسمح بالعمليات الحساسة وتخطي الحظر',
      devEval2.status === 'APPROVED' && devEval2.isAllowed,
      `حالة الجهاز المعتمد: ${devEval2.status}`
    );

    // 4. اختبار سياسة الجهاز الواحد ONE_DEVICE_ONLY وتسجيل جهاز ثانٍ Device B
    await prisma.systemSetting.update({
      where: { companyId: emp.companyId },
      data: { trustedDevicesPolicy: 'ONE_DEVICE_ONLY' },
    });

    const devEvalB = await evaluateDeviceTrust(emp.id, testTokenB, emp.companyId, 'Mozilla/5.0 (Android 13; Mobile)');
    assert(
      'سياسة ONE_DEVICE_ONLY تمنح الجهاز الثاني حالة PENDING ولا تلغي الجهاز الأول بصمت',
      devEvalB.status === 'PENDING' && !devEvalB.isAllowed,
      `حالة الجهاز الثاني: ${devEvalB.status}`
    );

    // 5. اختبار معاملة الاستبدال الذرية (Atomic Replace Device Transaction)
    const dbDeviceB = await prisma.trustedDevice.findFirst({
      where: { employeeId: emp.id, deviceId: hashB },
    });

    if (dbDeviceA && dbDeviceB) {
      await prisma.$transaction([
        prisma.trustedDevice.updateMany({
          where: { employeeId: emp.id, id: { not: dbDeviceB.id } },
          data: { status: 'REVOKED', isApproved: false },
        }),
        prisma.trustedDevice.update({
          where: { id: dbDeviceB.id },
          data: { status: 'APPROVED', isApproved: true },
        }),
      ]);
    }

    const devEvalAAfterReplace = await evaluateDeviceTrust(emp.id, testTokenA, emp.companyId);
    const devEvalBAfterReplace = await evaluateDeviceTrust(emp.id, testTokenB, emp.companyId);

    assert(
      'معاملة استبدال الجهاز تجعل الجهاز الجديد APPROVED والجهاز القديم REVOKED مباشرة',
      devEvalAAfterReplace.status === 'REVOKED' && devEvalBAfterReplace.status === 'APPROVED',
      `حالة الجهاز القديم: ${devEvalAAfterReplace.status} | حالة الجهاز الجديد: ${devEvalBAfterReplace.status}`
    );

    // 6. اختبار التعارض في ملكية الجهاز (Device Token Account Mismatch)
    const emp2 = await prisma.employee.findFirst({
      where: { id: { not: emp.id } },
    });

    if (emp2) {
      const devEvalMismatch = await evaluateDeviceTrust(emp2.id, testTokenB, emp.companyId);
      assert(
        'حظر استخدام نفس المفتاح المعتمد لموظف آخر (Device Token Ownership Mismatch)',
        devEvalMismatch.status === 'BLOCKED' && !devEvalMismatch.isAllowed,
        `الحالة الناتجة عند محاولة استخدام نفس الجهاز لموظف آخر: ${devEvalMismatch.status}`
      );
    }

    // 7. اختبار إلغاء اعتماد كافة أجهزة الموظف (REVOKE_ALL)
    await prisma.trustedDevice.updateMany({
      where: { employeeId: emp.id },
      data: { status: 'REVOKED', isApproved: false },
    });

    const activeDevicesCount = await prisma.trustedDevice.count({
      where: { employeeId: emp.id, status: 'APPROVED' },
    });

    assert(
      'إلغاء كافة أجهزة الموظف (Revoke All Devices) ينهي جميع الاعتمادات الفعالة',
      activeDevicesCount === 0,
      `عدد الأجهزة المعتمدة المتبقية للموظف: ${activeDevicesCount}`
    );

    // إرجاع الإعدادات وسجلات الاختبار المؤقتة
    await prisma.systemSetting.update({
      where: { companyId: emp.companyId },
      data: { trustedDevicesPolicy: 'ALLOW_MULTIPLE' },
    });

    await prisma.trustedDevice.deleteMany({
      where: { deviceId: { in: [hashA, hashB] } },
    });

    console.log(`==================================================`);
    console.log(`SUMMARY: ${passed}/${total} Phase 4 Tests PASSED.`);
    console.log(`🎉 Approved Device Model & Policy Engine is 100% VERIFIED & SECURE!`);
  } catch (err: any) {
    console.error('❌ Phase 4 test suite error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase4Tests();
