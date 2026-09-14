import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح للوصول إلى لوحة التحكم الإدارية' }, { status: 403 });
    }

    const todayDateStr = new Date().toISOString().split('T')[0];

    const [
      totalEmployees,
      todayRecords,
      activeBreaksCount,
      pendingLeavesCount,
      suspiciousAttemptsCount,
      pendingDevicesCount,
      suspiciousAttemptsList,
      recentEvents,
      branches,
    ] = await Promise.all([
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.attendanceRecord.findMany({
        where: { date: todayDateStr },
        include: {
          employee: {
            include: { primaryBranch: true, department: true },
          },
        },
      }),
      prisma.breakRecord.count({ where: { status: 'ACTIVE' } }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.suspiciousAttempt.count({ where: { actionTaken: 'BLOCKED' } }),
      prisma.trustedDevice.count({ where: { status: 'PENDING' } }),
      prisma.suspiciousAttempt.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            include: { primaryBranch: true, department: true },
          },
        },
      }),
      prisma.attendanceEvent.findMany({
        take: 10,
        orderBy: { serverTimestamp: 'desc' },
        include: {
          employee: true,
          branch: true,
        },
      }),
      prisma.branch.findMany({
        where: { isActive: true },
      }),
    ]);

    const presentCount = todayRecords.filter((r) => r.checkInAt && !r.checkOutAt && r.status === 'PRESENT').length;
    const lateCount = todayRecords.filter((r) => r.status === 'LATE').length;
    const checkedOutCount = todayRecords.filter((r) => r.checkOutAt).length;
    const checkedInTotal = todayRecords.length;
    const absentCount = Math.max(0, totalEmployees - checkedInTotal - pendingLeavesCount);

    return NextResponse.json({
      summary: {
        totalEmployees,
        todayCheckedIn: checkedInTotal,
        presentCount,
        lateCount,
        absentCount,
        onBreakCount: activeBreaksCount,
        pendingLeavesCount,
        pendingDevicesCount,
        suspiciousAttemptsCount,
        checkedOutCount,
      },
      todayRecords,
      suspiciousAttempts: suspiciousAttemptsList,
      recentEvents,
      branches,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب بيانات لوحة التحكم' }, { status: 500 });
  }
}
