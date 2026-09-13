import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const company = await prisma.company.findFirst({
      include: {
        systemSettings: true,
      },
    });

    return NextResponse.json({
      company,
      settings: company?.systemSettings[0] || null,
    });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في جلب إعدادات المنظومة' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح لك بتعديل إعدادات النظام' }, { status: 403 });
    }

    const body = await request.json();
    const {
      companyName,
      timezone,
      maxAcceptedGpsAccuracy,
      suspiciousLocationPolicy,
      trustedDevicesPolicy,
      overtimePolicy,
    } = body;

    const company = await prisma.company.findFirst({
      include: { systemSettings: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 });
    }

    // 1. تحديث اسم الشركة والمنطقة الزمنية
    if (companyName || timezone) {
      await prisma.company.update({
        where: { id: company.id },
        data: {
          name: companyName ? companyName.trim() : company.name,
          timezone: timezone || company.timezone,
        },
      });
    }

    // 2. تحديث إعدادات الـ Geofence والأجهزة
    const existingSettings = company.systemSettings[0];
    const updatedSettings = await prisma.systemSetting.upsert({
      where: { companyId: company.id },
      update: {
        maxAcceptedGpsAccuracy: maxAcceptedGpsAccuracy !== undefined ? Number(maxAcceptedGpsAccuracy) : existingSettings?.maxAcceptedGpsAccuracy,
        suspiciousLocationPolicy: suspiciousLocationPolicy || existingSettings?.suspiciousLocationPolicy,
        trustedDevicesPolicy: trustedDevicesPolicy || existingSettings?.trustedDevicesPolicy,
        overtimePolicy: overtimePolicy || existingSettings?.overtimePolicy,
      },
      create: {
        companyId: company.id,
        maxAcceptedGpsAccuracy: Number(maxAcceptedGpsAccuracy) || 50.0,
        suspiciousLocationPolicy: suspiciousLocationPolicy || 'BLOCK',
        trustedDevicesPolicy: trustedDevicesPolicy || 'MULTI',
        overtimePolicy: overtimePolicy || 'AUTO_APPROVE',
      },
    });

    // 3. توثيق التعديل في AuditLog
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'UPDATE_SYSTEM_SETTINGS',
        entity: 'SystemSetting',
        entityId: updatedSettings.id,
        oldValue: JSON.stringify(existingSettings || {}),
        newValue: JSON.stringify(updatedSettings),
        reason: 'تعديل الإعدادات المركزية وسياسات الجغرافيا والأجهزة',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم حفظ إعدادات المنظومة بنجاح',
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم أثناء حفظ الإعدادات' }, { status: 500 });
  }
}
