import crypto from 'crypto';
import { prisma } from './prisma';
import { broadcastNotificationToUser } from './sse-notifications';

export function hashDeviceToken(token: string): string {
  if (!token) return '';
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

export interface DeviceEvaluationResult {
  isAllowed: boolean;
  status: 'PENDING' | 'APPROVED' | 'REVOKED' | 'BLOCKED';
  reason?: string;
  device?: any;
}

export function parseDeviceInfo(userAgent: string = ''): { browser: string; os: string; platform: string; deviceName: string } {
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let platform = 'Web PWA';

  if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Edg')) browser = 'Edge';

  if (userAgent.includes('Android')) {
    os = 'Android';
    platform = 'Mobile PWA';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
    platform = 'Mobile PWA';
  } else if (userAgent.includes('Windows')) {
    os = 'Windows';
    platform = 'Desktop';
  } else if (userAgent.includes('Macintosh')) {
    os = 'macOS';
    platform = 'Desktop';
  }

  const deviceName = `${platform} (${os} - ${browser})`;
  return { browser, os, platform, deviceName };
}

export async function evaluateDeviceTrust(
  employeeId: string,
  rawDeviceId: string,
  companyId: string,
  userAgent: string = ''
): Promise<DeviceEvaluationResult> {
  const settings = await prisma.systemSetting.findUnique({ where: { companyId } });
  const policy = settings?.trustedDevicesPolicy || 'ALLOW_MULTIPLE';

  if (policy === 'DISABLED') {
    return { isAllowed: true, status: 'APPROVED' };
  }

  const deviceHash = hashDeviceToken(rawDeviceId || 'UNKNOWN');
  const lookupKey = deviceHash || rawDeviceId;

  // 1. فحص ما إذا كان نفس مفتاح الجهاز مسجلاً لموظف آخر (Device Token Ownership Mismatch)
  const otherEmployeeDevice = await prisma.trustedDevice.findFirst({
    where: {
      deviceId: lookupKey,
      employeeId: { not: employeeId },
      status: 'APPROVED',
    },
    include: { employee: true },
  });

  if (otherEmployeeDevice) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    await prisma.auditLog.create({
      data: {
        userId: employee?.userId || 'SYSTEM',
        action: 'DEVICE_TOKEN_ACCOUNT_MISMATCH',
        entity: 'TrustedDevice',
        entityId: otherEmployeeDevice.id,
        newValue: JSON.stringify({
          attemptedEmployeeId: employeeId,
          registeredEmployeeId: otherEmployeeDevice.employeeId,
          deviceId: lookupKey,
        }),
      },
    });

    return {
      isAllowed: false,
      status: 'BLOCKED',
      reason: '⚠️ هذا الجهاز مقترن بالفعل بحساب موظف آخر. لا يمكنك استخدام نفس الجهاز لأكثر من موظف.',
    };
  }

  // 2. فحص السجل الخاص بالموظف الحالي
  const existingDevice = await prisma.trustedDevice.findFirst({
    where: {
      employeeId,
      deviceId: lookupKey,
    },
  });

  if (existingDevice) {
    // تحديث توقيت آخر استخدام
    await prisma.trustedDevice.update({
      where: { id: existingDevice.id },
      data: { lastSeenAt: new Date() },
    });

    if (existingDevice.status === 'APPROVED' || existingDevice.isApproved) {
      return { isAllowed: true, status: 'APPROVED', device: existingDevice };
    }

    if (existingDevice.status === 'PENDING') {
      return {
        isAllowed: false,
        status: 'PENDING',
        reason: '📱 هذا الجهاز المعتمد بانتظار موافقة الإدارة قبل البدء في تسجيل الحضور.',
        device: existingDevice,
      };
    }

    if (existingDevice.status === 'REVOKED') {
      return {
        isAllowed: false,
        status: 'REVOKED',
        reason: '❌ تم إلغاء اعتماد هذا الجهاز من قبل الإدارة. يرجى طلب إعادة الاقتران.',
        device: existingDevice,
      };
    }

    if (existingDevice.status === 'BLOCKED') {
      return {
        isAllowed: false,
        status: 'BLOCKED',
        reason: '🚫 هذا الجهاز محظور من قبل إدارة المنظومة.',
        device: existingDevice,
      };
    }
  }

  // 3. التسجيل الأولي لجهاز جديد غير معروف
  const { browser, os, platform, deviceName } = parseDeviceInfo(userAgent);

  if (policy === 'BLOCK_UNKNOWN') {
    const newBlocked = await prisma.trustedDevice.create({
      data: {
        employeeId,
        deviceId: lookupKey,
        deviceTokenHash: deviceHash,
        deviceName,
        browser,
        os,
        platform,
        status: 'BLOCKED',
        isApproved: false,
      },
    });

    await prisma.suspiciousAttempt.create({
      data: {
        employeeId,
        deviceId: lookupKey,
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        reason: 'UNAPPROVED_DEVICE_ATTEMPT',
        riskLevel: 'HIGH',
        actionTaken: 'BLOCKED',
      },
    });

    return {
      isAllowed: false,
      status: 'BLOCKED',
      reason: '🚫 هذا الجهاز غير معتمد ويمنع سياسة الشركة البصمة من أجهزة غير مسجلة.',
      device: newBlocked,
    };
  }

  // سياسة ONE_DEVICE_ONLY أو REQUIRE_APPROVAL أو ALLOW_MULTIPLE
  const hasExistingApproved = await prisma.trustedDevice.findFirst({
    where: {
      employeeId,
      status: 'APPROVED',
    },
  });

  const newDeviceStatus = 'PENDING';
  const newDevice = await prisma.trustedDevice.create({
    data: {
      employeeId,
      deviceId: lookupKey,
      deviceTokenHash: deviceHash,
      deviceName,
      browser,
      os,
      platform,
      status: newDeviceStatus,
      isApproved: false,
    },
  });

  // إرسال إشعارات للإدارة
  const employeeObj = await prisma.employee.findUnique({ where: { id: employeeId } });
  const managers = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'] }, isActive: true },
    include: { employee: true },
  });

  for (const m of managers) {
    if (m.employee) {
      try {
        const notif = await prisma.notification.create({
          data: {
            employeeId: m.employee.id,
            title: '📱 طلب اعتماد جهاز جديد',
            message: `قام الموظف ${employeeObj?.firstName} ${employeeObj?.lastName} بالتسجيل من جهاز جديد (${deviceName}). بانتظار الاعتماد.`,
            type: 'WARNING',
          },
        });
        broadcastNotificationToUser(m.employee.id, notif);
      } catch (e) {}
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: employeeObj?.userId || 'SYSTEM',
      action: 'DEVICE_REGISTERED',
      entity: 'TrustedDevice',
      entityId: newDevice.id,
      newValue: JSON.stringify({
        employeeId,
        deviceName,
        policy,
        hasApprovedDevice: !!hasExistingApproved,
      }),
    },
  });

  let reasonMsg = '📱 تم تسجيل جهازك بنجاح وهو الآن بانتظار موافقة الإدارة للاعتماد.';
  if (policy === 'ONE_DEVICE_ONLY' && hasExistingApproved) {
    reasonMsg = '📱 لديك جهاز رئيسي معتمد بالفعل. تم تقديم طلب استبدال الجهاز إلى الإدارة للمراجعة.';
  }

  return {
    isAllowed: false,
    status: 'PENDING',
    reason: reasonMsg,
    device: newDevice,
  };
}
