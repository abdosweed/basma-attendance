export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getScopedReportingFilter } from '@/lib/reporting/permissions';
import { calculatePayrollReport, PayrollReportFilters } from '@/lib/reporting/payroll-engine';
import { generatePayrollExcelBuffer, generatePayrollCSVString } from '@/lib/export/payroll-export-builder';
import { getTripoliDateString } from '@/lib/reporting/attendance-day';

/**
 * GET /api/admin/reports/export
 * Phase 15: Advanced Attendance Reporting, Payroll Metrics & Excel/CSV Export Engine
 */
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
    const format = (searchParams.get('format') || 'excel').toLowerCase();

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

    const reportData = await calculatePayrollReport(scope, filters);

    if (format === 'csv') {
      const csvData = generatePayrollCSVString(reportData);
      const filename = `Payroll-Attendance-Report-${startDate}-to-${endDate}.csv`;

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8;',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    // Default: Excel .xlsx
    const excelBuffer = await generatePayrollExcelBuffer({ payrollData: reportData });
    const filename = `Payroll-Attendance-Report-${startDate}-to-${endDate}.xlsx`;

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('Error exporting Payroll Report:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تصدير كشف الرواتب' }, { status: 500 });
  }
}
