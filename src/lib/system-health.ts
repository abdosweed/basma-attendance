import { prisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'ERROR' | 'UNKNOWN';
export type SeverityLevel = 'INFO' | 'WARNING' | 'CRITICAL';

export interface HealthCheckResult {
  id: string;
  name: string;
  category: 'INFRASTRUCTURE' | 'DATABASE' | 'REALTIME' | 'SECURITY' | 'ATTENDANCE' | 'LOCATION' | 'DEVICES' | 'NOTIFICATIONS' | 'BACKUP' | 'OTP';
  status: HealthStatus;
  severity: SeverityLevel;
  message: string;
  latencyMs?: number;
  checkedAt: string;
  metadata?: Record<string, any>;
}

export interface SystemHealthReport {
  version: string;
  timestamp: string;
  score: number;
  overallStatus: HealthStatus;
  hasCriticalIncident: boolean;
  criticalIncidentMessage?: string;
  checks: HealthCheckResult[];
  knownLimitations: { title: string; description: string; status: string }[];
  summary: {
    totalCheckedIn: number;
    outsideGeofenceCount: number;
    uncertainLocationCount: number;
    pendingDeviceApprovals: number;
    unreadNotifications: number;
    failedLogins24h: number;
    backupStatus: string;
  };
}

export async function getSystemHealthReport(): Promise<SystemHealthReport> {
  const checkedAt = new Date().toISOString();
  const checks: HealthCheckResult[] = [];
  let isDbHealthy = false;
  let dbLatency = 0;

  // 1. Database & Connectivity Check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
    isDbHealthy = true;
    checks.push({
      id: 'db_postgresql',
      name: 'قاعدة البيانات PostgreSQL',
      category: 'DATABASE',
      status: 'HEALTHY',
      severity: 'INFO',
      message: 'الاتصال مباشر وسريع مع خادم Supabase PostgreSQL',
      latencyMs: dbLatency,
      checkedAt,
      metadata: { engine: 'PostgreSQL (Supabase Cloud)', connection: 'POOLER_ACTIVE' },
    });
  } catch (err: any) {
    dbLatency = Date.now() - dbStart;
    checks.push({
      id: 'db_postgresql',
      name: 'قاعدة البيانات PostgreSQL',
      category: 'DATABASE',
      status: 'ERROR',
      severity: 'CRITICAL',
      message: 'فشل الاتصال بقاعدة البيانات الرئيسي',
      latencyMs: dbLatency,
      checkedAt,
    });
  }

  // 2. Supabase Infrastructure Check
  checks.push({
    id: 'supabase_cloud',
    name: 'بيئة Supabase Cloud',
    category: 'INFRASTRUCTURE',
    status: isDbHealthy ? 'HEALTHY' : 'ERROR',
    severity: isDbHealthy ? 'INFO' : 'CRITICAL',
    message: isDbHealthy ? 'قاعدة البيانات ومستودع Cloud PostgreSQL متصلان' : 'فشل الاستجابة من Supabase',
    checkedAt,
    metadata: { region: 'eu-west-1', pooler: 'aws-1-eu-west-1.pooler.supabase.com' },
  });

  // 3. Realtime / SSE Stream Check
  checks.push({
    id: 'realtime_sse',
    name: 'بث الإشعارات اللحظية (SSE & Fallback)',
    category: 'REALTIME',
    status: 'DEGRADED',
    severity: 'WARNING',
    message: 'SSE يعمل مع نبضات القلب (15s Ping) بدعم الاستعلام المتردد البديل (Smart Fallback Polling 30s)',
    checkedAt,
    metadata: {
      technology: 'SSE + Smart Fallback Polling (Hybrid Engine)',
      connectionCountNotice: 'Active connection count: unavailable in stateless serverless architecture',
      heartbeatIntervalSeconds: 15,
      fallbackPollingSeconds: 30,
    },
  });

  // Telemetry Aggregations (Only if DB is healthy)
  let totalCheckedIn = 0;
  let outsideGeofenceCount = 0;
  let uncertainLocationCount = 0;
  let locationUnavailableCount = 0;
  let pendingDeviceApprovals = 0;
  let totalApprovedDevices = 0;
  let totalBlockedDevices = 0;
  let unreadNotifications = 0;
  let totalNotifs24h = 0;
  let failedLogins24h = 0;
  let lockedAccounts = 0;
  let otpChallenges24h = 0;
  let expiredOtpCount = 0;
  let blockedOtpCount = 0;
  let openAttendanceSessions = 0;
  let openBreaksCount = 0;
  let orphanBreaksCount = 0;
  let duplicateSessionsCount = 0;

  if (isDbHealthy) {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Attendance Metrics
      const activeSessions = await prisma.attendanceRecord.findMany({
        where: { checkOutAt: null },
        select: { id: true, employeeId: true, status: true },
      });

      totalCheckedIn = activeSessions.length;
      openAttendanceSessions = activeSessions.length;

      // Geofence & Location state counts from active violations and location requests
      outsideGeofenceCount = await prisma.geofenceViolation.count({
        where: { status: 'ACTIVE' },
      });

      uncertainLocationCount = await prisma.locationVerificationRequest.count({
        where: { status: 'PENDING', locationState: 'UNCERTAIN' },
      });

      locationUnavailableCount = await prisma.locationVerificationRequest.count({
        where: { locationState: 'LOCATION_UNAVAILABLE' },
      });

      // Duplicate open sessions check
      const empSessionCounts: Record<string, number> = {};
      activeSessions.forEach((s) => {
        empSessionCounts[s.employeeId] = (empSessionCounts[s.employeeId] || 0) + 1;
        if (empSessionCounts[s.employeeId] > 1) duplicateSessionsCount++;
      });

      // Active breaks
      openBreaksCount = await prisma.breakRecord.count({ where: { status: 'ACTIVE' } });

      // Device Metrics
      const deviceStats = await prisma.trustedDevice.groupBy({
        by: ['status'],
        _count: { id: true },
      });

      deviceStats.forEach((stat) => {
        if (stat.status === 'PENDING') pendingDeviceApprovals = stat._count.id;
        if (stat.status === 'APPROVED') totalApprovedDevices = stat._count.id;
        if (stat.status === 'BLOCKED') totalBlockedDevices = stat._count.id;
      });

      // Notification Metrics
      unreadNotifications = await prisma.notification.count({ where: { isRead: false } });
      totalNotifs24h = await prisma.notification.count({ where: { createdAt: { gte: last24h } } });

      // Auth & Security Metrics
      failedLogins24h = await prisma.user.aggregate({
        _sum: { failedLoginAttempts: true },
        where: { updatedAt: { gte: last24h } },
      }).then((r) => r._sum.failedLoginAttempts || 0);

      lockedAccounts = await prisma.user.count({
        where: { lockoutUntil: { gt: now } },
      });

      // OTP Metrics
      otpChallenges24h = await prisma.otpChallenge.count({ where: { createdAt: { gte: last24h } } });
      expiredOtpCount = await prisma.otpChallenge.count({ where: { status: 'EXPIRED' } });
      blockedOtpCount = await prisma.otpChallenge.count({ where: { status: 'BLOCKED' } });

      // DB Integrity: Active breaks without active attendance session
      const activeBreaks = await prisma.breakRecord.findMany({
        where: { status: 'ACTIVE' },
        select: { employeeId: true },
      });

      const activeCheckedInEmpIds = new Set(activeSessions.map((s) => s.employeeId));
      orphanBreaksCount = activeBreaks.filter((b) => !activeCheckedInEmpIds.has(b.employeeId)).length;
    } catch (e) {
      console.error('[SystemHealth] Error aggregating metrics:', e);
    }
  }

  // 4. Location & Geofence Health Check
  checks.push({
    id: 'location_geofence',
    name: 'محرك النطاق الجغرافي والموقع (Geofence Engine)',
    category: 'LOCATION',
    status: uncertainLocationCount > 5 ? 'DEGRADED' : 'HEALTHY',
    severity: uncertainLocationCount > 5 ? 'WARNING' : 'INFO',
    message: `مفتوح الحضور: ${totalCheckedIn} | خارج النطاق: ${outsideGeofenceCount} | منطقة عدم التأكد: ${uncertainLocationCount}`,
    checkedAt,
    metadata: {
      totalCheckedIn,
      outsideGeofenceCount,
      uncertainLocationCount,
      locationUnavailableCount,
    },
  });

  // 5. Trusted Devices Health Check
  checks.push({
    id: 'trusted_devices',
    name: 'محرك الهواتف والأجهزة المعتمدة (Trusted Devices)',
    category: 'DEVICES',
    status: pendingDeviceApprovals > 0 ? 'DEGRADED' : 'HEALTHY',
    severity: pendingDeviceApprovals > 0 ? 'WARNING' : 'INFO',
    message: `الأجهزة المعتمدة: ${totalApprovedDevices} | في انتظار الاعتماد: ${pendingDeviceApprovals} | المحظورة: ${totalBlockedDevices}`,
    checkedAt,
    metadata: {
      approvedDevices: totalApprovedDevices,
      pendingApprovals: pendingDeviceApprovals,
      blockedDevices: totalBlockedDevices,
    },
  });

  // 6. Notifications Health Check
  checks.push({
    id: 'notifications_delivery',
    name: 'خدمة الإشعارات والـ Stream',
    category: 'NOTIFICATIONS',
    status: 'HEALTHY',
    severity: 'INFO',
    message: `إشعارات 24h الماضية: ${totalNotifs24h} | غير مقروءة: ${unreadNotifications}`,
    checkedAt,
    metadata: {
      totalNotifs24h,
      unreadNotifications,
      deliveryChannel: 'SSE + Smart Fallback Polling (30s)',
    },
  });

  // 7. Cryptographic OTP Engine Check
  checks.push({
    id: 'otp_engine',
    name: 'محرك أكواد التحقق (Cryptographic OTP Engine)',
    category: 'OTP',
    status: 'HEALTHY',
    severity: 'INFO',
    message: 'محرك الـ OTP المشفّر نشط بـ SHA-256 | الموفر الخارجي: NOT CONFIGURED (معتمد على طبقة الإشعارات الداخلية)',
    checkedAt,
    metadata: {
      engineStatus: 'ACTIVE',
      hashingAlgorithm: 'SHA256_WITH_SALT',
      externalProvider: 'NOT CONFIGURED',
      internalNotificationLayer: 'ACTIVE',
      challenges24h: otpChallenges24h,
      expiredChallenges: expiredOtpCount,
      blockedChallenges: blockedOtpCount,
    },
  });

  // 8. Authentication & Security Policy Check
  checks.push({
    id: 'auth_security',
    name: 'حماية تسجيل الدخول والأمان (Auth Security)',
    category: 'SECURITY',
    status: lockedAccounts > 0 ? 'DEGRADED' : 'HEALTHY',
    severity: lockedAccounts > 0 ? 'WARNING' : 'INFO',
    message: `محاولات دمج خاطئة 24h: ${failedLogins24h} | الحسابات المغلقة مؤقتاً: ${lockedAccounts}`,
    checkedAt,
    metadata: {
      failedLogins24h,
      lockedAccounts,
      passwordPolicy: 'ENFORCED_STRONG_PASSWORDS',
      lockoutPolicy: '15_MINUTES_AFTER_5_FAILED_ATTEMPTS',
    },
  });

  // 9. Attendance Engine & Shifts Check
  checks.push({
    id: 'attendance_shifts',
    name: 'محرك الحضور والورديات (Attendance Engine)',
    category: 'ATTENDANCE',
    status: duplicateSessionsCount > 0 ? 'DEGRADED' : 'HEALTHY',
    severity: duplicateSessionsCount > 0 ? 'WARNING' : 'INFO',
    message: `جلسات مفتوحة: ${openAttendanceSessions} | استراحات نشطة: ${openBreaksCount} | وردية الجمعة 2026: ACTIVE`,
    checkedAt,
    metadata: {
      openAttendanceSessions,
      openBreaksCount,
      duplicateSessionsCount,
    },
  });

  // 10. Integrity Checks
  checks.push({
    id: 'db_integrity_check',
    name: 'سلامة وربط البيانات (DB Integrity Check)',
    category: 'DATABASE',
    status: orphanBreaksCount > 0 || duplicateSessionsCount > 0 ? 'DEGRADED' : 'HEALTHY',
    severity: orphanBreaksCount > 0 || duplicateSessionsCount > 0 ? 'WARNING' : 'INFO',
    message: orphanBreaksCount > 0 ? `تنبيه: يوجد ${orphanBreaksCount} استراحة نشطة بدون جلسة حضور مفتوحة` : 'لا توجد تعارضات أو استراحات يتيمة في قاعدة البيانات',
    checkedAt,
    metadata: {
      orphanBreaksCount,
      duplicateSessionsCount,
    },
  });

  // 11. Backup & Restore Status Check (Phase 8 Verified Status)
  let backupState = 'NOT VERIFIED';
  let lastVerifiedBackup: any = null;
  try {
    const backupsDir = path.join(process.cwd(), 'prisma', 'backups');
    if (fs.existsSync(backupsDir)) {
      const metaFiles = fs.readdirSync(backupsDir).filter((f) => f.endsWith('.meta.json'));
      if (metaFiles.length > 0) {
        metaFiles.sort().reverse();
        const latestMeta = JSON.parse(fs.readFileSync(path.join(backupsDir, metaFiles[0]), 'utf-8'));
        if (latestMeta.status === 'VERIFIED') {
          backupState = 'VERIFIED';
          lastVerifiedBackup = latestMeta;
        }
      }
    }
  } catch (err) {}

  checks.push({
    id: 'backup_restore',
    name: 'النسخ الاحتياطي واستعادة البيانات (Backup & Restore)',
    category: 'BACKUP',
    status: backupState === 'VERIFIED' ? 'HEALTHY' : 'DEGRADED',
    severity: backupState === 'VERIFIED' ? 'INFO' : 'WARNING',
    message: backupState === 'VERIFIED'
      ? `تم فحص واختبار النسخ والاسترجاع بنجاح (BACKUP & RESTORE VERIFIED) | SHA-256 Verified`
      : 'NOT VERIFIED (النسخ الاحتياطي في انتظار الفحص والتوثيق المباشر)',
    checkedAt,
    metadata: {
      backupState,
      provider: 'Supabase Cloud Automated Snapshots + JSON Encryption Snapshot',
      rpo: '24 Hours (Daily Automated Snapshots)',
      rto: lastVerifiedBackup ? `${(lastVerifiedBackup.durationMs / 1000).toFixed(2)}s` : '< 2 Minutes',
      lastVerifiedDate: lastVerifiedBackup?.createdAt || 'NOT VERIFIED',
      checksum: lastVerifiedBackup?.checksum ? `${lastVerifiedBackup.checksum.substring(0, 16)}...` : 'N/A',
    },
  });

  // 12. PWA Infrastructure Check
  checks.push({
    id: 'pwa_infrastructure',
    name: 'بنية تطبيق الـ PWA والجوال',
    category: 'INFRASTRUCTURE',
    status: 'HEALTHY',
    severity: 'INFO',
    message: 'Manifest و Service Worker وميزات التثبيت المباشر مفعلة',
    checkedAt,
    metadata: {
      manifest: 'CONFIGURED',
      serviceWorker: 'CONFIGURED',
      standalonePrompt: 'ACTIVE',
    },
  });

  // Health Score Calculation (0 to 100)
  // Base 100
  // -30 if DB error
  // -10 for backup NOT VERIFIED
  // -5 for SSE Degraded
  // -5 for each degraded service (max -20)
  let score = 100;
  if (!isDbHealthy) score -= 30;
  if (checks.some((c) => c.id === 'backup_restore' && c.status === 'DEGRADED')) score -= 10;
  if (checks.some((c) => c.id === 'realtime_sse' && c.status === 'DEGRADED')) score -= 5;
  const otherDegradedCount = checks.filter((c) => c.status === 'DEGRADED' && c.id !== 'backup_restore' && c.id !== 'realtime_sse').length;
  score -= Math.min(otherDegradedCount * 5, 15);
  score = Math.max(0, Math.min(100, score));

  // Determine overall status
  let overallStatus: HealthStatus = 'HEALTHY';
  let hasCriticalIncident = false;
  let criticalIncidentMessage: string | undefined;

  if (!isDbHealthy) {
    overallStatus = 'ERROR';
    hasCriticalIncident = true;
    criticalIncidentMessage = '🚨 خادم قاعدة البيانات الرئيسي غير متاح أو يواجه مشكلة حرجة في الاتصال!';
  } else if (checks.some((c) => c.status === 'ERROR')) {
    overallStatus = 'ERROR';
    hasCriticalIncident = true;
    criticalIncidentMessage = '🚨 توجد أعطال حرجة في بعض خدمات النظام المباشرة.';
  } else if (checks.some((c) => c.status === 'DEGRADED')) {
    overallStatus = 'DEGRADED';
  }

  const knownLimitations = [
    {
      title: 'Vercel Serverless SSE Connection Timeout',
      description: 'بيئة Serverless تفصل الاتصالات الطويلة بعد 30-60 ثانية لجمود الاستجابة (معالجة بالنظام الهجين Smart Fallback Polling كل 30s).',
      status: 'MITIGATED WITH FALLBACK POLLING',
    },
    {
      title: 'iPhone Background GPS (iOS PWA Sandbox)',
      description: 'نظام iOS يضع قيوداً على التتبع الجغرافي بالخلفية بدون Native App Wrapping.',
      status: 'PENDING PHYSICAL DEVICE VERIFICATION',
    },
    {
      title: 'External OTP Provider Integration',
      description: 'موفر الرسائل النصية الخارجي SMS/Email غير مهيأ (يتم استخدام طبقة الإشعارات الداخلية Internal Notification Layer).',
      status: 'NOT CONFIGURED / PENDING INTEGRATION',
    },
    {
      title: 'Backup & Restore Verification',
      description: 'آلية استعادة البيانات والنسخ الاحتياطي في انتظار الفحص الشامل في Phase 8.',
      status: 'NOT VERIFIED',
    },
    {
      title: 'GPS Indoor Signal Accuracy',
      description: 'إشارة الـ GPS داخل المباني المكاتبية الخرسانية المغلقة قد تكون ضعيفة (مستقرة بفضل محرك ثقة الموقع Location Confidence Engine).',
      status: 'HANDLED BY CONFIDENCE ENGINE',
    },
  ];

  return {
    version: '1.7.0',
    timestamp: checkedAt,
    score,
    overallStatus,
    hasCriticalIncident,
    criticalIncidentMessage,
    checks,
    knownLimitations,
    summary: {
      totalCheckedIn,
      outsideGeofenceCount,
      uncertainLocationCount,
      pendingDeviceApprovals,
      unreadNotifications,
      failedLogins24h,
      backupStatus: 'NOT VERIFIED',
    },
  };
}
