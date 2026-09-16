export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getScopedReportingFilter } from '@/lib/reporting/permissions';
import { getLateAndAbsenceReport } from '@/lib/reporting/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const branchId = searchParams.get('branchId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const scope = await getScopedReportingFilter(session, branchId, employeeId);
    if (scope.isForbidden) {
      return NextResponse.json({ error: 'غير مصرح للوصول لهذه البيانات' }, { status: 403 });
    }

    const report = await getLateAndAbsenceReport(scope, {
      startDate,
      endDate,
      branchId,
      departmentId,
      employeeId,
      search,
      page,
      limit,
    });

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error fetching Late & Absence Report:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب تقرير التأخير والغياب' }, { status: 500 });
  }
}
