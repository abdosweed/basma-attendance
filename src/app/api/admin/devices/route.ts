import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: جلب قائمة أجهزة الموظفين المعتمدة والمقترنة مع الفلترة حسب الصلاحية والحالة
export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح للوصول إلى إدارة الأجهزة.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let branchConstraint: any = {};

    // تصفية الفروع لمدير الفرع BRANCH_MANAGER
    if (session.role === 'BRANCH_MANAGER') {
      const managerEmp = await prisma.employee.findUnique({
        where: { userId: session.userId },
        select: { primaryBranchId: true },
      });

      if (managerEmp?.primaryBranchId) {
        branchConstraint = {
          employee: {
            primaryBranchId: managerEmp.primaryBranchId,
          },
        };
      }
    }

    let whereClause: any = { ...branchConstraint };
    if (statusFilter && ['PENDING', 'APPROVED', 'REVOKED', 'BLOCKED'].includes(statusFilter)) {
      whereClause.status = statusFilter;
    }

    const trustedDevices = await prisma.trustedDevice.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            department: true,
            primaryBranch: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // حساب الإحصائيات لكل الحالات
    const allDevicesForStats = await prisma.trustedDevice.findMany({
      where: branchConstraint,
      select: { status: true, isApproved: true },
    });

    const pendingCount = allDevicesForStats.filter((d) => d.status === 'PENDING').length;
    const approvedCount = allDevicesForStats.filter((d) => d.status === 'APPROVED' || d.isApproved).length;
    const revokedCount = allDevicesForStats.filter((d) => d.status === 'REVOKED').length;
    const blockedCount = allDevicesForStats.filter((d) => d.status === 'BLOCKED').length;

    const employeesWithoutDevice = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        ...(session.role === 'BRANCH_MANAGER' && branchConstraint.employee
          ? { primaryBranchId: branchConstraint.employee.primaryBranchId }
          : {}),
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
      counts: {
        total: allDevicesForStats.length,
        pending: pendingCount,
        approved: approvedCount,
        revoked: revokedCount,
        blocked: blockedCount,
      },
    });
  } catch (error) {
    console.error('Fetch trusted devices error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب بيانات الأجهزة الموثوقة' }, { status: 500 });
  }
}
