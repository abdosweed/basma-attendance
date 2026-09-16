/**
 * Test Excel Builder & Export Endpoint Integration Script
 * Basma Attendance System v1.14.0 - Phase 12B.2
 */

import { generateDailyAttendanceExcel } from '../src/lib/export/excel-builder';
import { DailyAttendanceReportResponse } from '../src/lib/reporting/types';

async function testExcelBuilder() {
  console.log('\n==================================================');
  console.log('🧪 TESTING EXCEL BUILDER (RTL ARABIC GENERATION)');
  console.log('==================================================\n');

  const mockReportData: DailyAttendanceReportResponse = {
    summary: {
      totalEmployees: 3,
      presentCount: 1,
      lateCount: 1,
      absentCount: 1,
      onLeaveCount: 0,
      notScheduledCount: 0,
      incompleteCount: 0,
      totalWorkedMinutes: 930,
      totalLateMinutes: 15,
      totalBreakExcessMinutes: 12,
    },
    rows: [
      {
        attendanceRecordId: 'rec-1',
        employeeId: 'emp-1',
        employeeName: 'أحمد محمود القذافي',
        employeeNumber: 'EMP-101',
        departmentName: 'الموارد البشرية',
        branchName: 'الفرع الرئيسي - طرابلس',
        shiftName: 'الوردية الصباحية',
        shiftType: 'FIXED',
        scheduledStart: '09:00',
        scheduledEnd: '17:00',
        checkInAt: '09:05',
        checkOutAt: '17:00',
        status: 'PRESENT',
        statusLabel: 'حاضر (في الوقت)',
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        totalBreakMinutes: 30,
        allowedBreakMinutes: 30,
        breakExcessMinutes: 0,
        workedMinutes: 480,
        workedMinutesFormatted: '8س',
        potentialOvertimeMinutes: 0,
        flags: [],
        isAdminAdjusted: false,
      },
      {
        attendanceRecordId: 'rec-2',
        employeeId: 'emp-2',
        employeeName: 'سارة سالم الشريفي',
        employeeNumber: 'EMP-102',
        departmentName: 'تقنية المعلومات',
        branchName: 'الفرع الرئيسي - طرابلس',
        shiftName: 'الوردية الصباحية',
        shiftType: 'FIXED',
        scheduledStart: '09:00',
        scheduledEnd: '17:00',
        checkInAt: '09:25',
        checkOutAt: '17:00',
        status: 'LATE',
        statusLabel: 'متأخر',
        lateMinutes: 15,
        earlyLeaveMinutes: 0,
        totalBreakMinutes: 42,
        allowedBreakMinutes: 30,
        breakExcessMinutes: 12,
        workedMinutes: 450,
        workedMinutesFormatted: '7س 30د',
        potentialOvertimeMinutes: 0,
        flags: ['LATE', 'BREAK_EXCEEDED'],
        isAdminAdjusted: false,
      },
      {
        attendanceRecordId: null,
        employeeId: 'emp-3',
        employeeName: 'محمد علي المبروك',
        employeeNumber: 'EMP-103',
        departmentName: 'العمليات والميدان',
        branchName: 'فرع بنغازي',
        shiftName: 'الوردية الصباحية',
        shiftType: 'FIXED',
        scheduledStart: '09:00',
        scheduledEnd: '17:00',
        checkInAt: null,
        checkOutAt: null,
        status: 'ABSENT',
        statusLabel: 'غائب',
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        totalBreakMinutes: 0,
        allowedBreakMinutes: 30,
        breakExcessMinutes: 0,
        workedMinutes: null,
        workedMinutesFormatted: 'غير مكتمل',
        potentialOvertimeMinutes: 0,
        flags: ['ABSENT'],
        isAdminAdjusted: false,
      },
    ],
    pagination: { page: 1, limit: 50, totalRows: 3, totalPages: 1 },
    appliedFilters: { date: '2026-09-17' },
  };

  const buffer = await generateDailyAttendanceExcel({
    reportData: mockReportData,
    dateStr: '2026-09-17',
  });

  console.log(`  ✅ Excel Buffer Generated Successfully! Byte Length: ${buffer.length} bytes`);
  console.log('==================================================\n');
}

testExcelBuilder().catch((err) => {
  console.error('Fatal error in Excel Test:', err);
  process.exit(1);
});
