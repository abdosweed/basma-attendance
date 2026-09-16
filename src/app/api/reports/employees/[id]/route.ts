export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getScopedReportingFilter } from '@/lib/reporting/permissions';
import { getEmployeeAttendanceProfileReport } from '@/lib/reporting/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const employeeId = params.id;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const scope = await getScopedReportingFilter(session, undefined, employeeId);
    if (scope.isForbidden) {
      return NextResponse.json({ error: 'غير مصرح للوصول لبيانات هذا الموظف' }, { status: 403 });
    }

    const report = await getEmployeeAttendanceProfileReport(scope, employeeId, {
      date,
      startDate,
      endDate,
    });

    if (!report) {
      return NextResponse.json({ error: 'الموظف غير موجود أو غير تابع للشركة' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error fetching Employee Profile Report:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب ملف الموظف' }, { status: 500 });
  }
}
