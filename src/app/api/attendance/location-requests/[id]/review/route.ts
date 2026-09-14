import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح للوصول.' }, { status: 401 });
    }

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: 'ليس لديك صلاحية مراجعة طلبات تأكيد الموقع.' }, { status: 403 });
    }

    const requestId = params.id;
    const body = await request.json();
    const { action, reviewNote } = body; // action: 'APPROVE' | 'REJECT'

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'الإجراء المطلوب غير صالح (APPROVE أو REJECT).' }, { status: 400 });
    }

    const locReq = await prisma.locationVerificationRequest.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });

    if (!locReq) {
      return NextResponse.json({ error: 'طلب التأكيد غير موجود.' }, { status: 404 });
    }

    if (locReq.status !== 'PENDING') {
      return NextResponse.json(
        { error: `الطلب تمت معالجته سابقاً بحالة: ${locReq.status}` },
        { status: 400 }
      );
    }

    // 1. فحص انتهاء صلاحية الطلب (5 دقائق)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (locReq.requestedAt < fiveMinutesAgo) {
      await prisma.locationVerificationRequest.update({
        where: { id: locReq.id },
        data: { status: 'EXPIRED' },
      });

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'LOCATION_VERIFICATION_EXPIRED',
          entity: 'LocationVerificationRequest',
          entityId: locReq.id,
          newValue: JSON.stringify({ employeeId: locReq.employeeId }),
        },
      });

      return NextResponse.json({ error: 'انتهت صلاحية هذا الطلب (أكثر من 5 دقائق). يرجى طلب الموظف إعادة التقديم.' }, { status: 400 });
    }

    const now = new Date();
    const todayDateStr = now.toISOString().split('T')[0];

    if (action === 'APPROVE') {
      // 2. تحديث حالة الطلب إلى APPROVED
      await prisma.locationVerificationRequest.update({
        where: { id: locReq.id },
        data: {
          status: 'APPROVED',
          reviewedAt: now,
          reviewedBy: session.userId,
          reviewNote: reviewNote || 'تمت الموافقة وتأكيد التواجد من قبل الإدارة',
        },
      });

      // 3. تنفيذ عملية الحضور مع تسجيل المصدر بوضوح كـ ADMIN_VERIFIED
      if (locReq.operationType === 'CHECK_IN') {
        let attRecord = await prisma.attendanceRecord.findFirst({
          where: {
            employeeId: locReq.employeeId,
            date: todayDateStr,
          },
        });

        if (!attRecord) {
          attRecord = await prisma.attendanceRecord.create({
            data: {
              employeeId: locReq.employeeId,
              date: todayDateStr,
              checkInAt: now,
              status: 'PRESENT',
            },
          });
        }

        await prisma.attendanceEvent.create({
          data: {
            employeeId: locReq.employeeId,
            branchId: locReq.branchId,
            type: 'CHECK_IN',
            serverTimestamp: now,
            latitude: locReq.latitude,
            longitude: locReq.longitude,
            accuracy: locReq.accuracy,
            source: 'ADMIN_VERIFIED',
          },
        });
      } else if (locReq.operationType === 'CHECK_OUT') {
        const attRecord = await prisma.attendanceRecord.findFirst({
          where: {
            employeeId: locReq.employeeId,
            date: todayDateStr,
            checkOutAt: null,
          },
        });

        if (attRecord) {
          await prisma.attendanceRecord.update({
            where: { id: attRecord.id },
            data: {
              checkOutAt: now,
            },
          });
        }

        await prisma.attendanceEvent.create({
          data: {
            employeeId: locReq.employeeId,
            branchId: locReq.branchId,
            type: 'CHECK_OUT',
            serverTimestamp: now,
            latitude: locReq.latitude,
            longitude: locReq.longitude,
            accuracy: locReq.accuracy,
            source: 'ADMIN_VERIFIED',
          },
        });
      }

      // 4. إشعار الموظف فوراً
      try {
        await prisma.notification.create({
          data: {
            employeeId: locReq.employeeId,
            title: 'تأكيد الموقع الإداري',
            message: `✅ تم تأكيد وجودك من الإدارة وتسجيل عملية (${locReq.operationType}) بنجاح.`,
            type: 'SUCCESS',
          },
        });
      } catch (e) {}

      // 5. سجل الأمان audit log
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'LOCATION_VERIFICATION_APPROVED',
          entity: 'LocationVerificationRequest',
          entityId: locReq.id,
          newValue: JSON.stringify({
            employeeId: locReq.employeeId,
            operationType: locReq.operationType,
            reviewedBy: session.userId,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'تمت الموافقة على طلب تأكيد الموقع وتأكيد حضور الموظف بنجاح.',
        status: 'APPROVED',
      });
    } else {
      // حالة الرفض REJECT
      await prisma.locationVerificationRequest.update({
        where: { id: locReq.id },
        data: {
          status: 'REJECTED',
          reviewedAt: now,
          reviewedBy: session.userId,
          reviewNote: reviewNote || 'تم رفض طلب التأكيد من قبل الإدارة',
        },
      });

      try {
        await prisma.notification.create({
          data: {
            employeeId: locReq.employeeId,
            title: 'تأكيد الموقع الإداري',
            message: `❌ تم رفض طلب تأكيد الموقع من قبل الإدارة. ${reviewNote ? `(الملاحظة: ${reviewNote})` : ''}`,
            type: 'ERROR',
          },
        });
      } catch (e) {}

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'LOCATION_VERIFICATION_REJECTED',
          entity: 'LocationVerificationRequest',
          entityId: locReq.id,
          newValue: JSON.stringify({
            employeeId: locReq.employeeId,
            operationType: locReq.operationType,
            reviewedBy: session.userId,
            reviewNote,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'تم رفض طلب تأكيد الموقع.',
        status: 'REJECTED',
      });
    }
  } catch (error: any) {
    console.error('Review location verification error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء مراجعة الطلب.' }, { status: 500 });
  }
}
