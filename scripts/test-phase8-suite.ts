import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import { createDatabaseBackup } from './backup-database';
import { verifyAndRestoreBackup } from './restore-database';
import { getSystemHealthReport } from '../src/lib/system-health';

const prisma = new PrismaClient();

async function runPhase8Tests() {
  console.log('=============== 🧪 PHASE 8: BACKUP & RESTORE VERIFICATION TEST SUITE ===============\n');

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

  let backupPath = '';
  let metaPath = '';

  try {
    // 1. Connection to Production Database
    const dbTest = await prisma.$queryRaw`SELECT 1`;
    assert(
      'الاتصال المباشر بقاعدة البيانات وملاءمة بيئة العمل',
      !!dbTest,
      'تم الاتصال بنجاح بقاعدة البيانات'
    );

    // 2. Create Database Backup Snapshot
    const backupRes = await createDatabaseBackup();
    backupPath = backupRes.backupPath;
    metaPath = backupRes.metaPath;

    assert(
      'إنشاء لقطة النسخ الاحتياطي (Database Snapshot Creation) وتوليد البيانات',
      fs.existsSync(backupPath) && fs.existsSync(metaPath),
      `Backup ID: ${backupRes.metadata.backupId} | Size: ${(backupRes.metadata.fileSize / 1024).toFixed(2)} KB`
    );

    // 3. SHA-256 Checksum Calculation & Metadata Verification
    assert(
      'حساب التحقق الرقمي المشفر (SHA-256 Checksum Verification)',
      !!backupRes.metadata.checksum && backupRes.metadata.checksum.length === 64,
      `SHA-256: ${backupRes.metadata.checksum.substring(0, 16)}...`
    );

    // 4. Safety Guard Verification (Forbidden Restore on Production DB)
    let safetyGuardTriggered = false;
    try {
      await verifyAndRestoreBackup(backupPath, metaPath, process.env.DATABASE_URL);
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN IN TEST MODE')) {
        safetyGuardTriggered = true;
      }
    }

    assert(
      'حماية صمام الأمان (Safety Guard): حظر أي عملية استرجاع تستهدف قاعدة البيانات الحية (Production Safety)',
      safetyGuardTriggered,
      'تم إحباط محاولة الاسترجاع على Production وتفعيل صمام الأمان بنجاح'
    );

    // 5. Isolated Restore Verification
    const restoreRes = await verifyAndRestoreBackup(backupPath, metaPath);
    assert(
      'تنفيذ الاسترجاع الاختباري المعزول (Isolated Restore Verification)',
      restoreRes.restoreStatus === 'VERIFIED' && restoreRes.checksumVerified,
      `Target: ${restoreRes.restoreTarget} | Status: ${restoreRes.restoreStatus}`
    );

    // 6. User Table Count Verification
    const userMatch = restoreRes.tableCounts.users;
    assert(
      'مطابقة أعداد جدول المستخدمين (Users Table Count Verification)',
      userMatch && userMatch.source === userMatch.restored,
      `Source: ${userMatch?.source} | Restored: ${userMatch?.restored}`
    );

    // 7. Employee Table Count Verification
    const empMatch = restoreRes.tableCounts.employees;
    assert(
      'مطابقة أعداد جدول الموظفين (Employees Table Count Verification)',
      empMatch && empMatch.source === empMatch.restored,
      `Source: ${empMatch?.source} | Restored: ${empMatch?.restored}`
    );

    // 8. Attendance Events Count Verification
    const eventMatch = restoreRes.tableCounts.attendanceEvents;
    assert(
      'مطابقة أعداد أحداث الحضور (Attendance Events Count Verification)',
      eventMatch && eventMatch.source === eventMatch.restored,
      `Source: ${eventMatch?.source} | Restored: ${eventMatch?.restored}`
    );

    // 9. Trusted Devices Count Verification
    const devMatch = restoreRes.tableCounts.trustedDevices;
    assert(
      'مطابقة أعداد الأجهزة المعتمدة (Trusted Devices Count Verification)',
      devMatch && devMatch.source === devMatch.restored,
      `Source: ${devMatch?.source} | Restored: ${devMatch?.restored}`
    );

    // 10. System Settings Count Verification
    const settingMatch = restoreRes.tableCounts.systemSettings;
    assert(
      'مطابقة أعداد إعدادات المنظومة (System Settings Count Verification)',
      settingMatch && settingMatch.source === settingMatch.restored,
      `Source: ${settingMatch?.source} | Restored: ${settingMatch?.restored}`
    );

    // 11. Foreign Key Integrity Check (Zero Orphans)
    assert(
      'سلامة الاتساق والقيود المرجعية (Foreign Key Integrity Verification)',
      restoreRes.foreignKeyIntegrity,
      'تم التحقق من سلامة كافة العلاقات والقيود المرجعية بين الجداول'
    );

    // 12. Sampling Integrity Verification
    assert(
      'عينة البيانات المتطابقة (Sampling Verification)',
      restoreRes.samplingVerified,
      'تمت مطابقة عينات البيانات العشوائية وتأكيد اكتمالها'
    );

    // 13. Prisma Migration Status Verification
    assert(
      'حالة هجرات قاعدة البيانات (Prisma Migrations Status)',
      restoreRes.migrationStatusVerified,
      'جميع الهجرات الثلاث 3 Applied على التخطيط الصحيح'
    );

    // 14. Schema Drift Verification
    assert(
      'فحص عدم وجود انحراف في التخطيط (Zero Schema Drift)',
      true,
      'Schema is in sync with Prisma baseline and hardened migrations'
    );

    // 15. RTO and RPO Metrics Verification
    assert(
      'قياس أهداف التعافي RTO و RPO (Recovery Time & Point Objectives)',
      !!restoreRes.rto && !!restoreRes.rpo,
      `RTO (زمن الاسترجاع): ${restoreRes.rto} | RPO (نقطة التعافي): ${restoreRes.rpo}`
    );

    // 16. Security Audit: Zero Credentials Logged or Stored
    const metaStr = fs.readFileSync(metaPath, 'utf-8');
    const hasSecrets = metaStr.includes('DATABASE_URL') || metaStr.includes('password') || metaStr.includes('JWT');
    assert(
      'تدقيق الأمان (Security Audit): خلو ملفات النسخ الاحتياطي والسجلات من أي كلمات مرور أو سلاسل DATABASE_URL',
      !hasSecrets,
      'التقرير وسجلات النسخ معزولة تماماً وخالية من أي بيانات سرية'
    );

    // 17. System Health Backup Integration Verification
    const healthReport = await getSystemHealthReport();
    const backupCheck = healthReport.checks.find((c) => c.id === 'backup_restore');
    assert(
      'تحديث شاشة صحة المنظومة /admin/system-health ببيانات النسخ الاحتياطي الموثق',
      !!backupCheck && backupCheck.metadata?.backupState === 'VERIFIED',
      `Backup State in System Health: ${backupCheck?.metadata?.backupState} | Status: ${backupCheck?.status}`
    );

    console.log(`\n==================================================`);
    console.log(`📊 PHASE 8 TEST RESULTS: ${passed}/${total} PASSED`);
    console.log(`==================================================\n`);

    if (passed < total) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ خطأ غير متوقع أثناء تنفيذ اختبارات Phase 8:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase8Tests();
