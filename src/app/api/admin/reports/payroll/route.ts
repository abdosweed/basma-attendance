export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getScopedReportingFilter } from '@/lib/reporting/permissions';
import { calculatePayrollReport, PayrollReportFilters } from '@/lib/reporting/payroll-engine';
import { getTripoliDateString } from '@/lib/reporting/attendance-day';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const todayStr = getTripoliDateString(new Date());

    const startDate = searchParams.get('startDate') || `${todayStr.substring(0, 7)}-01`;
    const endDate = searchParams.get('endDate') || todayStr;
    const branchId = searchParams.get('branchId') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const scope = await getScopedReportingFilter(session, branchId, employeeId);
    if (scope.isForbidden) {
      return NextResponse.json({ error: 'غير مصرح للوصول لهذه البيانات' }, { status: 403 });
    }

    const filters: PayrollReportFilters = {
      startDate,
      endDate,
      branchId,
      employeeId,
      status,
      search,
    };

    const report = await calculatePayrollReport(scope, filters);
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error in Payroll Report API:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء معالجة تقرير الرواتب' }, { status: 500 });
  }
}
