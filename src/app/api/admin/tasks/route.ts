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

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ tasks: [] });
    }

    // جلب مهام الشركة مع تعيينات الموظفين
    const tasks = await prisma.task.findMany({
      where: { companyId: company.id },
      include: {
        assignments: {
          include: {
            employee: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'خطأ في جلب المهام' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح لك بإسناد المهام' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, priority, dueDate, employeeIds } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'يرجى إدخال عنوان المهمة' }, { status: 400 });
    }

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 });
    }

    const task = await prisma.task.create({
      data: {
        companyId: company.id,
        title: title.trim(),
        description: description ? description.trim() : null,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: session.userId,
        assignments: {
          create: (employeeIds || []).map((empId: string) => ({
            employeeId: empId,
          })),
        },
      },
      include: {
        assignments: {
          include: {
            employee: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, message: 'تم إسناد المهمة بنجاح 📋', task });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء المهمة' }, { status: 500 });
  }
}
