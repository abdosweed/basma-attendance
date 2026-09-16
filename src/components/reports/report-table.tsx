'use client';

import React from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { DailyAttendanceRow, ReportFlag } from '@/lib/reporting/types';

export interface ReportColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

export interface ReportTableProps<T> {
  columns: ReportColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  keyExtractor: (row: T) => string;
  className?: string;
}

export function ReportTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'لا توجد سجلات تطابق الفلاتر المحددة',
  keyExtractor,
  className = '',
}: ReportTableProps<T>) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all ${className}`}
      dir="rtl"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`py-3.5 px-4 font-bold ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                    <svg className="animate-spin h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="text-xs font-semibold">جاري تحميل تقرير الحضور...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400 font-medium">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`py-3.5 px-4 ${col.className || ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Standard Default Columns Preset for Daily Attendance Reports
 */
export function createDailyAttendanceColumns(): ReportColumn<DailyAttendanceRow>[] {
  return [
    {
      key: 'employee',
      header: 'الموظف',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white">{row.employeeName}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.employeeNumber}</div>
        </div>
      ),
    },
    {
      key: 'org',
      header: 'الفرع / القسم',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200">{row.branchName}</div>
          <div className="text-[10px] text-slate-400">{row.departmentName}</div>
        </div>
      ),
    },
    {
      key: 'shift',
      header: 'الوردية المجدولة',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200">{row.shiftName}</div>
          {row.scheduledStart && (
            <div className="text-[10px] text-slate-400">
              {row.scheduledStart} - {row.scheduledEnd}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'checkInAt',
      header: 'الحضور الفعلي',
      render: (row) => (
        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
          {row.checkInAt || '—'}
        </span>
      ),
    },
    {
      key: 'checkOutAt',
      header: 'الانصراف الفعلي',
      render: (row) => (
        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
          {row.checkOutAt || (row.checkInAt ? 'في العمل' : '—')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'حالة السجل',
      render: (row) => <StatusBadge status={row.status} label={row.statusLabel} size="sm" />,
    },
    {
      key: 'lateMinutes',
      header: 'دقائق التأخير',
      render: (row) => (
        <span
          className={`font-semibold ${
            row.lateMinutes > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
          }`}
        >
          {row.lateMinutes > 0 ? `${row.lateMinutes} دقيقة` : '—'}
        </span>
      ),
    },
    {
      key: 'workedMinutes',
      header: 'ساعات العمل',
      render: (row) => (
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {row.workedMinutesFormatted || '—'}
        </span>
      ),
    },
    {
      key: 'flags',
      header: 'الملاحظات والتنبيهات',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.isAdminAdjusted && (
            <span className="px-1.5 py-0.5 text-[9px] rounded font-bold bg-violet-100 text-violet-800 border border-violet-300">
              تعديل إداري
            </span>
          )}
          {row.flags.map((flag: ReportFlag, i: number) => (
            <span
              key={i}
              className="px-1.5 py-0.5 text-[9px] rounded font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            >
              {flag}
            </span>
          ))}
        </div>
      ),
    },
  ];
}
