'use client';

import React from 'react';

export interface ReportFilterProps {
  datePreset?: string;
  onDatePresetChange?: (preset: string) => void;
  startDate?: string;
  endDate?: string;
  onDateRangeChange?: (start: string, end: string) => void;
  branchId?: string;
  onBranchChange?: (branchId: string) => void;
  departmentId?: string;
  onDepartmentChange?: (deptId: string) => void;
  status?: string;
  onStatusChange?: (status: string) => void;
  search?: string;
  onSearchChange?: (text: string) => void;
  branches?: { id: string; name: string }[];
  departments?: { id: string; name: string }[];
}

export function ReportFilterBar({
  datePreset = 'TODAY',
  onDatePresetChange,
  startDate = '',
  endDate = '',
  onDateRangeChange,
  branchId = '',
  onBranchChange,
  departmentId = '',
  onDepartmentChange,
  status = '',
  onStatusChange,
  search = '',
  onSearchChange,
  branches = [],
  departments = [],
}: ReportFilterProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-6 transition-all space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Date Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: 'TODAY', label: 'اليوم' },
            { key: 'YESTERDAY', label: 'الأمس' },
            { key: 'THIS_WEEK', label: 'هذا الأسبوع' },
            { key: 'THIS_MONTH', label: 'هذا الشهر' },
            { key: 'LAST_MONTH', label: 'الشهر الماضي' },
          ].map((preset) => (
            <button
              key={preset.key}
              onClick={() => onDatePresetChange?.(preset.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                datePreset === preset.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Search */}
        {onSearchChange && (
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="بحث باسم الموظف أو الرقم..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-slate-200"
            />
            <span className="absolute right-3 top-2 text-slate-400 text-xs">🔍</span>
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        {onBranchChange && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              الفرع
            </label>
            <select
              value={branchId}
              onChange={(e) => onBranchChange(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-slate-200"
            >
              <option value="">جميع الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {onDepartmentChange && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              القسم
            </label>
            <select
              value={departmentId}
              onChange={(e) => onDepartmentChange(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-slate-200"
            >
              <option value="">جميع الأقسام</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {onStatusChange && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              حالة الحضور
            </label>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-slate-200"
            >
              <option value="">جميع الحالات</option>
              <option value="PRESENT">حاضر</option>
              <option value="LATE">متأخر</option>
              <option value="ABSENT">غائب</option>
              <option value="ON_LEAVE">في إجازة</option>
              <option value="INCOMPLETE_ATTENDANCE">غير مكتمل</option>
              <option value="WORK_HOURS_DEFICIT">عجز ساعات</option>
            </select>
          </div>
        )}

        {onDateRangeChange && (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                من
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onDateRangeChange(e.target.value, endDate)}
                className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-slate-200"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                إلى
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onDateRangeChange(startDate, e.target.value)}
                className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-slate-200"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
