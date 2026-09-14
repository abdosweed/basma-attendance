import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST: تسكين وتعيين الموظف/الموظفين في وردية معينة
export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح بالتسكين' }, { status: 403 });
    }

    const body = await request.json();
    const { employeeIds, shiftId } = body; // Array of employee IDs or single ID string

    if (!employeeIds || !shiftId) {
      return NextResponse.json({ error: 'يرجى اختيار الموظفين والوردية المحددة' }, { status: 400 });
    }

    const targetShift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!targetShift) {
      return NextResponse.json({ error: 'الوردية غير موجودة' }, { status: 404 });
    }

    const empIdArray: string[] = Array.isArray(employeeIds) ? employeeIds : [employeeIds];

    for (const empId of empIdArray) {
      const existing = await prisma.employeeShift.findFirst({
        where: { employeeId: empId },
      });

      if (existing) {
        await prisma.employeeShift.update({
          where: { id: existing.id },
          data: { shiftId: targetShift.id, startDate: new Date() },
        });
      } else {
        await prisma.employeeShift.create({
          data: {
            employeeId: empId,
            shiftId: targetShift.id,
            startDate: new Date(),
          },
        });
      }

      // توثيق في سجل التدقيق
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'ASSIGN_SHIFT',
          entity: 'EmployeeShift',
          entityId: empId,
          reason: `تسكين الموظف في وردية: ${targetShift.name}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `تم تسكين ${empIdArray.length} موظف في الوردية (${targetShift.name}) بنجاح`,
    });
  } catch (error) {
    console.error('Assign shift error:', error);
    return NextResponse.json({ error: 'حدث خطأ في تسكين الموظفين بالوردية' }, { status: 500 });
  }
}
