import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: جلب قائمة أجهزة الموظفين المعتمدة والمقترنة
export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 403 });
    }

    const trustedDevices = await prisma.trustedDevice.findMany({
      include: {
        employee: {
          include: {
            department: true,
            primaryBranch: true,
          },
        },
      },
      orderBy: { lastSeenAt: 'desc' },
    });

    const employeesWithoutDevice = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        trustedDevices: { none: {} },
      },
      include: {
        department: true,
        primaryBranch: true,
      },
      orderBy: { firstName: 'asc' },
    });

    return NextResponse.json({
      trustedDevices,
      employeesWithoutDevice,
    });
  } catch (error) {
    console.error('Fetch trusted devices error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب بيانات الأجهزة الموثوقة' }, { status: 500 });
  }
}
