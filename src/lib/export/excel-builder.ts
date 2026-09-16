import ExcelJS from 'exceljs';
import { DailyAttendanceReportResponse } from '@/lib/reporting/types';

export interface CreateDailyAttendanceExcelOptions {
  reportData: DailyAttendanceReportResponse;
  companyName?: string;
  dateStr: string;
}

/**
 * Excel Builder Helper for Basma Attendance System v1.14.0
 * Phase 12B.2 Executive Analytics & Exports
 *
 * Generates an RTL-configured Excel workbook formatted for Arabic reporting.
 */
export async function generateDailyAttendanceExcel(
  options: CreateDailyAttendanceExcelOptions
): Promise<Buffer> {
  const { reportData, companyName = 'منظومة تطبيق البصمة الذكي - Basma Attendance', dateStr } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Basma Attendance System';
  workbook.created = new Date();

  // Create worksheet with Right-To-Left view enabled for Arabic
  const worksheet = workbook.addWorksheet('تقرير الحضور اليومي', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
    },
  });

  // 1. Company Header Title Block
  worksheet.mergeCells('A1:K1');
  const companyCell = worksheet.getCell('A1');
  companyCell.value = companyName;
  companyCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  companyCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Dark Slate
  };
  companyCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. Report Subtitle & Date
  worksheet.mergeCells('A2:K2');
  const subtitleCell = worksheet.getCell('A2');
  subtitleCell.value = `تقرير الحضور والانصراف اليومي التفصيلي - بتاريخ: ${dateStr}`;
  subtitleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  subtitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEDF2F7' }, // Light Gray/Slate
  };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 3: Empty spacing
  worksheet.addRow([]);

  // 3. KPI Summary Row
  const { summary } = reportData;
  worksheet.addRow([
    'إجمالي الموظفين',
    summary.totalEmployees,
    'حاضر',
    summary.presentCount,
    'متأخر',
    summary.lateCount,
    'غائب',
    summary.absentCount,
    'غير مكتمل',
    summary.incompleteCount,
    `إجمالي العمل: ${Math.floor(summary.totalWorkedMinutes / 60)}س ${summary.totalWorkedMinutes % 60}د`,
  ]);

  const kpiRowIndex = 4;
  const kpiRow = worksheet.getRow(kpiRowIndex);
  kpiRow.font = { name: 'Arial', size: 10, bold: true };
  kpiRow.alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Style KPI cells
  kpiRow.eachCell((cell, colNumber) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    };
    if (colNumber % 2 === 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    }
  });

  // Row 5: Empty spacing
  worksheet.addRow([]);

  // 4. Data Table Column Headers (Row 6)
  const headers = [
    'كود الموظف',
    'اسم الموظف',
    'الفرع / القسم',
    'الوردية المجدولة',
    'وقت الحضور الفعلي',
    'وقت الانصراف الفعلي',
    'دقائق التأخير',
    'ساعات العمل الفعلية',
    'الاستراحة المستغرقة',
    'حالة السجل',
    'ملاحظات وتنبيهات',
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;
  headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' }, // Deep Teal Header
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0D9488' } },
      bottom: { style: 'medium', color: { argb: 'FF0D9488' } },
      left: { style: 'thin', color: { argb: 'CCFFFFFF' } },
      right: { style: 'thin', color: { argb: 'CCFFFFFF' } },
    };
  });

  // 5. Populate Data Rows
  reportData.rows.forEach((row) => {
    // Format Break Text
    let breakText = `${row.totalBreakMinutes} دقيقة`;
    if (row.breakExcessMinutes > 0) {
      breakText += ` (تجاوز: ${row.breakExcessMinutes}د)`;
    }

    // Format Scheduled Shift
    const shiftText = row.scheduledStart && row.scheduledEnd
      ? `${row.shiftName} (${row.scheduledStart} - ${row.scheduledEnd})`
      : row.shiftName;

    // Format Flags / Notes
    let notesText = row.flags.map((f) => {
      switch (f) {
        case 'LATE': return 'تأخير';
        case 'ABSENT': return 'غياب';
        case 'EARLY_LEAVE': return 'خروج مبكر';
        case 'MISSING_CHECKOUT': return 'بدون بصمة انصراف';
        case 'BREAK_EXCEEDED': return 'تجاوز استراحة';
        case 'GPS_VERIFIED': return 'تأكيد إداري للموقع';
        case 'ADMIN_ADJUSTED': return 'معدل إدارياً';
        case 'WORK_HOURS_DEFICIT': return 'عجز ساعات';
        default: return f;
      }
    }).join(' | ');

    if (row.isAdminAdjusted) {
      notesText = notesText ? `معدل إدارياً | ${notesText}` : 'معدل إدارياً';
    }

    const dataRowValues = [
      row.employeeNumber,
      row.employeeName,
      `${row.branchName} - ${row.departmentName}`,
      shiftText,
      row.checkInAt || '—',
      row.checkOutAt || '—',
      row.lateMinutes > 0 ? row.lateMinutes : 0,
      row.workedMinutesFormatted || '—',
      breakText,
      row.statusLabel,
      notesText || '—',
    ];

    const dataRow = worksheet.addRow(dataRowValues);
    dataRow.height = 22;
    dataRow.font = { name: 'Arial', size: 10 };
    dataRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Format individual cells based on status
    dataRow.eachCell((cell, colIndex) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } },
      };

      // Status column formatting (Col 10)
      if (colIndex === 10) {
        cell.font = { name: 'Arial', size: 10, bold: true };
        if (row.status === 'PRESENT' || row.status === 'ON_TIME') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } }; // Light Green
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '065F46' } };
        } else if (row.status === 'LATE') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } }; // Light Amber
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '92400E' } };
        } else if (row.status === 'ABSENT') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } }; // Light Red
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '991B1B' } };
        } else if (row.status === 'INCOMPLETE_ATTENDANCE') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3E8FF' } }; // Light Purple
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '6B21A8' } };
        }
      }

      // Late Minutes column highlight (Col 7)
      if (colIndex === 7 && row.lateMinutes > 0) {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'D97706' } };
      }
    });
  });

  // 6. Adjust Column Widths Dynamically
  worksheet.columns.forEach((column) => {
    let maxLen = 12;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value ? cell.value.toString().length : 0;
      if (len > maxLen) {
        maxLen = len;
      }
    });
    column.width = Math.min(Math.max(maxLen + 4, 14), 40);
  });

  // Generate binary Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
