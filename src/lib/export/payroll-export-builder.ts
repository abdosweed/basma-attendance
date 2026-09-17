import ExcelJS from 'exceljs';
import { PayrollReportResult } from '@/lib/reporting/payroll-engine';

export interface GeneratePayrollExcelOptions {
  payrollData: PayrollReportResult;
  companyName?: string;
}

/**
 * Excel Generator for Phase 15 Advanced Attendance & Payroll Reporting
 */
export async function generatePayrollExcelBuffer(
  options: GeneratePayrollExcelOptions
): Promise<Buffer> {
  const { payrollData, companyName = 'منظومة تطبيق البصمة الذكي - Basma Attendance System' } = options;
  const { summary, rows, appliedFilters } = payrollData;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Basma Attendance System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('كشف الرواتب والحضور', {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
    },
  });

  // 1. Title Header
  worksheet.mergeCells('A1:K1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = companyName;
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }, // Slate 900
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. Subtitle & Filter Range Info
  worksheet.mergeCells('A2:K2');
  const subCell = worksheet.getCell('A2');
  subCell.value = `تقرير الحضور والانصراف وكشوفات الرواتب التفصيلي للفترة من: ${appliedFilters.startDate} إلى: ${appliedFilters.endDate}`;
  subCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  subCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' }, // Slate 200
  };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.addRow([]);

  // 3. Summary KPI Block (Row 4)
  worksheet.addRow([
    'إجمالي ساعات العمل',
    summary.totalWorkedHours,
    'دقائق التأخير',
    `${summary.totalLateMinutes} دقيقة`,
    'الساعات الإضافية',
    summary.totalOvertimeHours,
    'أيام الغياب غير المبرر',
    summary.totalAbsenceDays,
    'أيام الإجازات المعتمدة',
    summary.totalLeaveDays,
    `إجمالي السجلات: ${summary.totalRecordsCount}`,
  ]);

  const kpiRow = worksheet.getRow(4);
  kpiRow.font = { name: 'Arial', size: 10, bold: true };
  kpiRow.alignment = { horizontal: 'center', vertical: 'middle' };
  kpiRow.eachCell((cell, colNum) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    };
    if (colNum % 2 === 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    }
  });

  worksheet.addRow([]);

  // 4. Data Table Column Headers (Row 6)
  const headers = [
    'رقم الموظف',
    'اسم الموظف',
    'الفرع',
    'التاريخ',
    'وقت الدخول',
    'وقت الخروج',
    'ساعات العمل',
    'دقائق التأخير',
    'ساعات الإضافي',
    'حالة اليوم',
    'الملاحظات / نوع الإجازة',
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0284C7' }, // Brand Sky Blue
    };
    cell.border = {
      top: { style: 'thin', color: { argb: '0284C7' } },
      left: { style: 'thin', color: { argb: 'FFFFFF' } },
      bottom: { style: 'medium', color: { argb: '0369A1' } },
      right: { style: 'thin', color: { argb: 'FFFFFF' } },
    };
  });

  // 5. Data Rows
  rows.forEach((r) => {
    const row = worksheet.addRow([
      r.employeeNumber,
      r.employeeName,
      r.branchName,
      r.date,
      r.checkInAt || '--:--',
      r.checkOutAt || '--:--',
      r.workedHoursStr,
      r.lateMinutes > 0 ? `${r.lateMinutes} دقيقة` : '0',
      r.overtimeHoursStr,
      r.statusLabel,
      r.notes || '-',
    ]);

    row.font = { name: 'Arial', size: 10 };
    row.alignment = { vertical: 'middle' };

    // Align numbers/times to center
    [1, 4, 5, 6, 7, 8, 9, 10].forEach((colIdx) => {
      row.getCell(colIdx).alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Style Status Badge Colors
    const statusCell = row.getCell(10);
    if (r.status === 'PRESENT') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } }; // Light Emerald
      statusCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '065F46' } };
    } else if (r.status === 'LATE') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } }; // Light Amber
      statusCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '92400E' } };
    } else if (r.status === 'ABSENT') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } }; // Light Red
      statusCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '991B1B' } };
    } else if (r.status === 'ON_LEAVE') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0F2FE' } }; // Light Sky
      statusCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '075985' } };
    }

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } },
      };
    });
  });

  // Set explicit column widths
  const colWidths = [14, 24, 18, 14, 14, 14, 16, 14, 16, 18, 30];
  worksheet.columns.forEach((col, idx) => {
    col.width = colWidths[idx] || 15;
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * CSV Generator for Phase 15 Advanced Attendance & Payroll Reporting
 */
export function generatePayrollCSVString(payrollData: PayrollReportResult): string {
  const { rows } = payrollData;
  const headers = [
    'رقم الموظف',
    'اسم الموظف',
    'الفرع',
    'التاريخ',
    'وقت الدخول',
    'وقت الخروج',
    'ساعات العمل',
    'دقائق التأخير',
    'ساعات الإضافي',
    'حالة اليوم',
    'الملاحظات / نوع الإجازة',
  ].join(',');

  const csvRows = rows.map((r) => {
    return [
      `"${r.employeeNumber}"`,
      `"${r.employeeName}"`,
      `"${r.branchName}"`,
      `"${r.date}"`,
      `"${r.checkInAt || '--:--'}"`,
      `"${r.checkOutAt || '--:--'}"`,
      `"${r.workedHoursStr}"`,
      `"${r.lateMinutes}"`,
      `"${r.overtimeHoursStr}"`,
      `"${r.statusLabel}"`,
      `"${r.notes.replace(/"/g, '""')}"`,
    ].join(',');
  });

  return '\uFEFF' + headers + '\n' + csvRows.join('\n');
}
