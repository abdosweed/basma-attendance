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

// POST: إنشاء وردية جديدة
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
      startTime,
      endTime,
      gracePeriodMins,
      isNightShift,
      maxBreaksPerShift,
      workingDays,
    } = body;

    if (!name || !startTime || !endTime) {
      return NextResponse.json({ error: 'اسم الوردية وتوقيت البداية والنهاية حقول إجبارية' }, { status: 400 });
    }

    const newShift = await prisma.shift.create({
      data: {
        companyId: company.id,
        name,
        startTime,
        endTime,
        gracePeriodMins: Number(gracePeriodMins) || 15,
        isNightShift: Boolean(isNightShift),
        maxBreaksPerShift: Number(maxBreaksPerShift) || 1,
        workingDays: workingDays || 'SUN,MON,TUE,WED,THU',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'CREATE_SHIFT',
        entity: 'Shift',
        entityId: newShift.id,
        reason: `إنشاء وردية جديدة: ${name} (${startTime} - ${endTime})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء الوردية بنجاح',
      shift: newShift,
    });
  } catch (error) {
    console.error('Create shift error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إنشاء الوردية' }, { status: 500 });
  }
}

// PUT: تحديث وردية قائمة
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
      startTime,
      endTime,
      gracePeriodMins,
      isNightShift,
      maxBreaksPerShift,
      workingDays,
    } = body;

    if (!id || !name || !startTime || !endTime) {
      return NextResponse.json({ error: 'بيانات الوردية غير مكتملة' }, { status: 400 });
    }

    const updatedShift = await prisma.shift.update({
      where: { id },
      data: {
        name,
        startTime,
        endTime,
        gracePeriodMins: Number(gracePeriodMins) || 15,
        isNightShift: Boolean(isNightShift),
        maxBreaksPerShift: Number(maxBreaksPerShift) || 1,
        workingDays: workingDays || 'SUN,MON,TUE,WED,THU',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'UPDATE_SHIFT',
        entity: 'Shift',
        entityId: updatedShift.id,
        reason: `تحديث الوردية: ${name}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم تعديل بيانات الوردية بنجاح',
      shift: updatedShift,
    });
  } catch (error) {
    console.error('Update shift error:', error);
    return NextResponse.json({ error: 'حدث خطأ في تعديل الوردية' }, { status: 500 });
  }
}
