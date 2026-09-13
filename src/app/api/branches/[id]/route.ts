import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: params.id },
      include: { company: true },
    });

    if (!branch) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ branch });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ في جلب بيانات الفرع' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.role)) {
      return NextResponse.json(
        { error: 'غير مصرح لك بتعديل بيانات الفروع والمواقع الجغرافية. مخصص للمدراء فقط.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, address, latitude, longitude, geofenceRadius, isActive, reason } = body;

    // 1. التحقق الخادم (Backend Validation)
    if (latitude === undefined || longitude === undefined || geofenceRadius === undefined) {
      return NextResponse.json(
        { error: 'يرجى تزويد خط العرض وخط الطول ونطاق الحضور الجغرافي بشكل صحيح.' },
        { status: 400 }
      );
    }

    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    const radiusNum = Number(geofenceRadius);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      return NextResponse.json({ error: 'خط العرض (Latitude) غير صالح.' }, { status: 400 });
    }

    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      return NextResponse.json({ error: 'خط الطول (Longitude) غير صالح.' }, { status: 400 });
    }

    if (isNaN(radiusNum) || radiusNum <= 0) {
      return NextResponse.json(
        { error: 'نطاق السماح بالحضور (Geofence Radius) يجب أن يكون أكبر من 0 متر.' },
        { status: 400 }
      );
    }

    // 2. جلب البيانات القديمة للفرع لحفظها في AuditLog
    const existingBranch = await prisma.branch.findUnique({
      where: { id: params.id },
    });

    if (!existingBranch) {
      return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }

    const oldValues = {
      name: existingBranch.name,
      address: existingBranch.address,
      latitude: existingBranch.latitude,
      longitude: existingBranch.longitude,
      geofenceRadius: existingBranch.geofenceRadius,
      isActive: existingBranch.isActive,
    };

    const newValues = {
      name: name !== undefined ? name : existingBranch.name,
      address: address !== undefined ? address : existingBranch.address,
      latitude: latNum,
      longitude: lngNum,
      geofenceRadius: radiusNum,
      isActive: isActive !== undefined ? isActive : existingBranch.isActive,
    };

    // 3. التحديث المباشر في قاعدة البيانات
    const updatedBranch = await prisma.branch.update({
      where: { id: params.id },
      data: newValues,
    });

    // 4. توثيق عملية التعديل في سجل التدقيق AuditLog
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'UPDATE_BRANCH_LOCATION',
        entity: 'Branch',
        entityId: updatedBranch.id,
        oldValue: JSON.stringify(oldValues),
        newValue: JSON.stringify(newValues),
        reason: reason || 'تعديل الموقع الجغرافي ونطاق الـ Geofence للفرع',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم تحديث موقع الفرع ونطاق الحضور بنجاح',
      branch: updatedBranch,
    });
  } catch (error: any) {
    console.error('Update branch location error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم أثناء تحديث موقع الفرع' }, { status: 500 });
  }
}
