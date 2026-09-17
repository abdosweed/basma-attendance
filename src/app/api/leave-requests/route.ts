import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    // جلب أنواع الإجازات المتاحة
    const leaveTypes = await prisma.leaveType.findMany();

    // الموظف العادي يرى طلباته مع حساب الرصيد المتبقي
    if (session.role === 'EMPLOYEE' && session.employeeId) {
      const leaves = await prisma.leaveRequest.findMany({
        where: { employeeId: session.employeeId },
        include: { leaveType: true },
        orderBy: { createdAt: 'desc' },
      });

      // حساب أيام الإجازات المستهلكة المعتمدة للعام الحالي
      const currentYear = new Date().getFullYear();
      const approvedLeavesThisYear = leaves.filter(
        (l) => l.status === 'APPROVED' && new Date(l.startDate).getFullYear() === currentYear
      );

      const annualUsed = approvedLeavesThisYear
        .filter((l) => l.leaveType.code === 'ANNUAL' || l.leaveType.name.includes('سنوية'))
        .reduce((sum, l) => sum + l.totalDays, 0);

      const sickUsed = approvedLeavesThisYear
        .filter((l) => l.leaveType.code === 'SICK' || l.leaveType.name.includes('مرضية'))
        .reduce((sum, l) => sum + l.totalDays, 0);

      const annualRemaining = Math.max(0, 21 - annualUsed);
      const sickRemaining = Math.max(0, 14 - sickUsed);

      return NextResponse.json({
        leaves,
        leaveTypes,
        balances: {
          annualRemaining,
          sickRemaining,
          annualMax: 21,
          sickMax: 14,
        },
      });
    }

    // الإدارة ترى طلبات الموظفين
    const leaves = await prisma.leaveRequest.findMany({
      where: status ? { status } : {},
      include: {
        employee: {
          include: { primaryBranch: true, department: true },
        },
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ leaves, leaveTypes });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في جلب الإجازات' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { leaveTypeId, startDate, endDate, reason, attachmentUrl } = body;

    if (!startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'يرجى استكمال بيانات طلب الإجازة (التواريخ والسبب).' }, { status: 400 });
    }

    // دمج تحليل معرّف الإجازة أو إنشاء نوع افتراضي إذا لم يتوفر
    let resolvedLeaveTypeId = leaveTypeId;
    let targetType = await prisma.leaveType.findFirst({
      where: {
        OR: [
          { id: leaveTypeId || '' },
          { code: (leaveTypeId || '').toUpperCase() },
          { name: { contains: leaveTypeId || '' } },
        ],
      },
    });

    if (!targetType) {
      // البحث عن أي نوع إجازة متاح أو استخدام أول إجازة
      targetType = await prisma.leaveType.findFirst();
    }

    if (!targetType) {
      const company = await prisma.company.findFirst();
      if (!company) {
        return NextResponse.json({ error: 'لم يتم العثور على شركة مسجلة' }, { status: 400 });
      }
      // إنشاء إجازة سنوية افتراضية إن لم تكن موجودة
      targetType = await prisma.leaveType.create({
        data: {
          companyId: company.id,
          name: 'إجازة سنوية',
          code: 'ANNUAL',
          isPaid: true,
        },
      });
    }

    resolvedLeaveTypeId = targetType.id;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return NextResponse.json({ error: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية.' }, { status: 400 });
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: session.employeeId,
        leaveTypeId: resolvedLeaveTypeId,
        startDate: start,
        endDate: end,
        totalDays,
        reason: reason.trim(),
        attachmentUrl: attachmentUrl || null,
        status: 'PENDING',
      },
      include: { leaveType: true },
    });

    // إشعار للمدراء والـ HR
    const employee = await prisma.employee.findUnique({ where: { id: session.employeeId } });
    const hrUsers = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'HR', 'SUPER_ADMIN'] } },
      include: { employee: true },
    });

    for (const hr of hrUsers) {
      if (hr.employee) {
        await prisma.notification.create({
          data: {
            employeeId: hr.employee.id,
            title: 'طلب إجازة جديد يحتاج موافقة',
            message: `قدم الموظف ${employee?.firstName} ${employee?.lastName} طلب إجازة ${leaveRequest.leaveType.name} لمدة ${totalDays} أيام.`,
            type: 'INFO',
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم تقديم طلب الإجازة بنجاح، وهو بانتظار موافقة الإدارة.',
      leaveRequest,
    });
  } catch (error) {
    console.error('Create leave error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تقديم طلب الإجازة' }, { status: 500 });
  }
}
