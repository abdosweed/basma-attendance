import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: جلب الورديات والموظفين للتسكين
export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 403 });
    }

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 });
    }

    const shifts = await prisma.shift.findMany({
      where: { companyId: company.id },
      include: {
        _count: {
          select: { employeeShifts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        department: true,
        primaryBranch: true,
        employeeShifts: {
          include: { shift: true },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    return NextResponse.json({
      shifts,
      employees,
    });
  } catch (error) {
    console.error('Fetch shifts error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب بيانات الورديات' }, { status: 500 });
  }
}

// POST: إنشاء وردية جديدة مرنة / مقسمة / ثابتة لعام 2026
export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح بالإنشاء' }, { status: 403 });
    }

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      type,
      startTime,
      endTime,
      splitStartTime,
      splitEndTime,
      requiredHours,
      gracePeriodMins,
      maxBreakMins,
      isNightShift,
      workingDays,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'يرجى كتابة اسم الوردية' }, { status: 400 });
    }

    const newShift = await prisma.shift.create({
      data: {
        companyId: company.id,
        name: name.trim(),
        type: type || 'FIXED',
        startTime: startTime || '08:00',
        endTime: endTime || '16:00',
        splitStartTime: splitStartTime || null,
        splitEndTime: splitEndTime || null,
        requiredHours: Number(requiredHours) || 8.0,
        gracePeriodMins: Number(gracePeriodMins) || 15,
        maxBreakMins: Number(maxBreakMins) || 60,
        isNightShift: Boolean(isNightShift),
        workingDays: workingDays || 'SUN,MON,TUE,WED,THU',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'CREATE_SHIFT',
        entity: 'Shift',
        entityId: newShift.id,
        reason: `إنشاء وردية جديدة لعام 2026: ${name} (${type})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء الوردية بنجاح ✨',
      shift: newShift,
    });
  } catch (error: any) {
    console.error('Create shift error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الوردية' }, { status: 500 });
  }
}

// PUT: تعديل الوردية
export async function PUT(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح بالتعديل' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      name,
      type,
      startTime,
      endTime,
      splitStartTime,
      splitEndTime,
      requiredHours,
      gracePeriodMins,
      maxBreakMins,
      isNightShift,
      workingDays,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الوردية مطلوب' }, { status: 400 });
    }

    const updatedShift = await prisma.shift.update({
      where: { id },
      data: {
        name,
        type,
        startTime,
        endTime,
        splitStartTime,
        splitEndTime,
        requiredHours: requiredHours !== undefined ? Number(requiredHours) : undefined,
        gracePeriodMins: gracePeriodMins !== undefined ? Number(gracePeriodMins) : undefined,
        maxBreakMins: maxBreakMins !== undefined ? Number(maxBreakMins) : undefined,
        isNightShift: isNightShift !== undefined ? Boolean(isNightShift) : undefined,
        workingDays,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم تحديث الوردية بنجاح 🔄',
      shift: updatedShift,
    });
  } catch (error: any) {
    console.error('Update shift error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تعديل الوردية' }, { status: 500 });
  }
}
