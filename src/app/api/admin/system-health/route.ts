import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSystemHealthReport } from '@/lib/system-health';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAuthenticatedUser();
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح - يرجى تسجيل الدخول' }, { status: 401 });
  }

  // Strict RBAC Enforcement: EMPLOYEE is forbidden
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER', 'SUPERVISOR'];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json(
      { error: 'غير مصرح لك بالوصول لشاشة صحة المنظومة', role: session.role },
      { status: 403 }
    );
  }

  try {
    const report = await getSystemHealthReport();
    return NextResponse.json(report, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error: any) {
    console.error('[API system-health] Failed to generate system health report:', error);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع أثناء فحص صحة المنظومة' },
      { status: 500 }
    );
  }
}
