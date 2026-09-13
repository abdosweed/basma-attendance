import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح للقيام بهذا الإجراء' }, { status: 403 });
    }

    const body = await request.json();
    const { action, actionReason } = body; // action: 'APPROVED' | 'REJECTED'

    const correction = await prisma.attendanceCorrectionRequest.findUnique({
      where: { id: params.id },
      include: { employee: true },
    });

    if (!correction) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. تحديث حالة الطلب
      await tx.attendanceCorrectionRequest.update({
        where: { id: correction.id },
        data: {
          status: action,
          actionByUserId: session.userId,
          actionReason: actionReason || null,
        },
      });

      // 2. إذا تمت الموافقة، تعديل سجل الحضور AttendanceRecord دون مسح السجل الأصلي
      if (action === 'APPROVED') {
        const checkInDateObj = correction.proposedCheckIn
          ? new Date(`${correction.date}T${correction.proposedCheckIn}:00`)
          : undefined;

        const checkOutDateObj = correction.proposedCheckOut
          ? new Date(`${correction.date}T${correction.proposedCheckOut}:00`)
          : undefined;

        await tx.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: correction.employeeId,
              date: correction.date,
            },
          },
          update: {
            ...(checkInDateObj ? { checkInAt: checkInDateObj } : {}),
            ...(checkOutDateObj ? { checkOutAt: checkOutDateObj } : {}),
            notes: `تم التصحيح يدوياً بموافقة الإدارة: ${correction.reason}`,
          },
          create: {
            employeeId: correction.employeeId,
            date: correction.date,
            checkInAt: checkInDateObj || new Date(),
            checkOutAt: checkOutDateObj || null,
            status: 'PRESENT',
            notes: `تم التصحيح يدوياً بموافقة الإدارة: ${correction.reason}`,
          },
        });
      }

      // 3. توثيق في AuditLog
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: `CORRECTION_${action}`,
          entity: 'AttendanceCorrectionRequest',
          entityId: correction.id,
          oldValue: JSON.stringify({ status: correction.status }),
          newValue: JSON.stringify({ status: action, actionReason }),
          reason: actionReason || `اتخاذ قرار ${action} بشأن تصحيح بصمة الموظف`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `تم ${action === 'APPROVED' ? 'الموافقة على' : 'رفض'} طلب تصحيح البصمة بنجاح`,
    });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في معالجة طلب التصحيح' }, { status: 500 });
  }
}
