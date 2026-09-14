import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashDeviceToken, parseDeviceInfo } from '@/lib/device';
import { broadcastNotificationToUser } from '@/lib/sse-notifications';

export const dynamic = 'force-dynamic';

// GET: جلب قائمة أجهزة الموظف الحالي
export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح للوصول.' }, { status: 401 });
    }

    const devices = await prisma.trustedDevice.findMany({
      where: { employeeId: session.employeeId },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        browser: true,
        os: true,
        platform: true,
        status: true,
        isApproved: true,
        reviewNote: true,
        firstSeenAt: true,
        lastSeenAt: true,
      },
      orderBy: { lastSeenAt: 'desc' },
    });

    return NextResponse.json({ devices });
  } catch (error: any) {
    return NextResponse.json({ error: 'تعذر جلب أجهزة الموظف' }, { status: 500 });
  }
}

// POST: تقديم طلب اعتماد يدوي للجهاز الخاص بالموظف الحالي
export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح للوصول.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { deviceId, trustedDeviceId } = body;
    const rawDevId = trustedDeviceId || deviceId || 'UNKNOWN_DEV';
    const userAgent = request.headers.get('user-agent') || '';

    const deviceHash = hashDeviceToken(rawDevId);
    const lookupKey = deviceHash || rawDevId;

    const employee = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      include: { company: true },
    });

    if (!employee || employee.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'حساب الموظف غير نشط.' }, { status: 403 });
    }

    // فحص طلبات المعلقة الحالية لنفس الجهاز والاطلاع على عدم تكرار PENDING
    const existingPending = await prisma.trustedDevice.findFirst({
      where: {
        employeeId: session.employeeId,
        deviceId: lookupKey,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      return NextResponse.json({
        success: true,
        message: 'طلب اعتماد الجهاز قيد المراجعة بالفعل من قبل الإدارة.',
        deviceStatus: 'PENDING',
        device: existingPending,
      });
    }

    // فحص ما إذا كان الجهاز معتمداً بالفعل
    const existingApproved = await prisma.trustedDevice.findFirst({
      where: {
        employeeId: session.employeeId,
        deviceId: lookupKey,
        status: 'APPROVED',
      },
    });

    if (existingApproved) {
      return NextResponse.json({
        success: true,
        message: 'هذا الجهاز معتمد ومقترن بالفعل.',
        deviceStatus: 'APPROVED',
        device: existingApproved,
      });
    }

    const { browser, os, platform, deviceName } = parseDeviceInfo(userAgent);

    // تحديث أو إنشاء سجل الجهاز المعلق
    const deviceRecord = await prisma.trustedDevice.upsert({
      where: { deviceId: lookupKey },
      create: {
        employeeId: session.employeeId,
        deviceId: lookupKey,
        deviceTokenHash: deviceHash,
        deviceName,
        browser,
        os,
        platform,
        status: 'PENDING',
        isApproved: false,
      },
      update: {
        status: 'PENDING',
        isApproved: false,
        lastSeenAt: new Date(),
        deviceName,
        browser,
        os,
        platform,
      },
    });

    // إرسال إشعارات لحظية لجميع مدراء الشركة
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
              message: `قدم الموظف ${employee.firstName} ${employee.lastName} طلباً لاعتماد جهازه (${deviceName}).`,
              type: 'WARNING',
            },
          });
          broadcastNotificationToUser(m.employee.id, notif);
        } catch (e) {}
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'DEVICE_APPROVAL_REQUESTED',
        entity: 'TrustedDevice',
        entityId: deviceRecord.id,
        newValue: JSON.stringify({
          employeeId: session.employeeId,
          deviceName,
          deviceId: lookupKey,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم إرسال طلب اعتماد الجهاز إلى الإدارة بنجاح وهو قيد المراجعة.',
      deviceStatus: 'PENDING',
      device: deviceRecord,
    });
  } catch (error: any) {
    console.error('Request device approval error:', error);
    return NextResponse.json({ error: 'حدث خطأ في تقديم طلب اعتماد الجهاز.' }, { status: 500 });
  }
}
