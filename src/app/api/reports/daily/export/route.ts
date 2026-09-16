export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getScopedReportingFilter } from '@/lib/reporting/permissions';
import { getDailyAttendanceReport } from '@/lib/reporting/queries';
import { generateDailyAttendanceExcel } from '@/lib/export/excel-builder';
import { getTripoliDateString } from '@/lib/reporting/attendance-day';

/**
 * GET /api/reports/daily/export
 * Phase 12B.2 Executive Analytics & Exports
 *
 * Exports Daily Attendance Report (P0-02) as a formatted RTL Arabic Excel (.xlsx) file.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication Check
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    // 2. Extract Query Parameters
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getTripoliDateString(new Date());
    const branchId = searchParams.get('branchId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;
    const shiftId = searchParams.get('shiftId') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    // 3. Server-side RBAC Permission Scoping
    const scope = await getScopedReportingFilter(session, branchId, employeeId);
    if (scope.isForbidden) {
      return NextResponse.json({ error: 'غير مصرح للوصول لهذه البيانات' }, { status: 403 });
    }

    // 4. Fetch Report Data from Central Reporting Engine (Limit 5000 rows for Export)
    const reportData = await getDailyAttendanceReport(scope, {
      date,
      branchId,
      departmentId,
      shiftId,
      employeeId,
      status,
      search,
      page: 1,
      limit: 5000,
    });

    // 5. Generate Excel Buffer
    const excelBuffer = await generateDailyAttendanceExcel({
      reportData,
      dateStr: date,
    });

    // 6. Return Response with Excel Headers
    const filename = `Daily-Attendance-Report-${date}.xlsx`;
    
    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('Error exporting Daily Attendance Excel:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تصدير تقرير الحضور إلى Excel' },
      { status: 500 }
    );
  }
}
