'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  Search,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Coffee,
  Loader2,
  Building,
  UserCheck,
} from 'lucide-react';
import SystemSettingsTab from '@/components/SystemSettingsTab';

interface PayrollReportsTabProps {
  branches?: any[];
  employees?: any[];
}

export default function PayrollReportsTab({ branches = [], employees = [] }: PayrollReportsTabProps) {
  const getTodayStr = () => new Date().toISOString().slice(0, 10);
  const getMonthStartStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const [startDate, setStartDate] = useState(getMonthStartStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [selectedBranchId, setSelectedBranchId] = useState('ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'excel' | 'csv' | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        branchId: selectedBranchId,
        employeeId: selectedEmployeeId,
        status: selectedStatus,
        search: searchQuery,
      });

      const res = await fetch(`/api/admin/reports/payroll?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (e) {
      console.error('Error fetching payroll report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedBranchId, selectedEmployeeId, selectedStatus]);

  // Quick Preset Date Helpers
  const applyPresetDate = (preset: 'today' | 'week' | 'month' | 'prevMonth') => {
    const now = new Date();
    if (preset === 'today') {
      const today = now.toISOString().slice(0, 10);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'week') {
      const startOfWeek = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      setStartDate(startOfWeek.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'month') {
      setStartDate(getMonthStartStr());
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'prevMonth') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(prev.toISOString().slice(0, 10));
      setEndDate(prevEnd.toISOString().slice(0, 10));
    }
  };

  // Handle Export File Download
  const handleExport = async (format: 'excel' | 'csv') => {
    if (exportingFormat) return; // Prevent double trigger
    setExportingFormat(format);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        branchId: selectedBranchId,
        employeeId: selectedEmployeeId,
        status: selectedStatus,
        search: searchQuery,
        format,
      });

      const response = await fetch(`/api/admin/reports/export?${params.toString()}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payroll-Report-${startDate}-to-${endDate}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
      alert('حدث خطأ أثناء تحميل الملف، يرجى المحاولة لاحقاً');
    } finally {
      setExportingFormat(null);
    }
  };

  const summary = reportData?.summary || {
    totalWorkedHours: '0س 0د',
    totalLateMinutes: 0,
    totalOvertimeHours: '0س 0د',
    totalAbsenceDays: 0,
    totalLeaveDays: 0,
    totalRecordsCount: 0,
  };

  const rows = reportData?.rows || [];
  const filteredRows = rows.filter(
    (r: any) =>
      r.employeeName.includes(searchQuery) ||
      r.employeeNumber.includes(searchQuery) ||
      r.branchName.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* 1. شريط الفلاتر المتقدمة المدمج Multi-Dimensional Filter Bar */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm dark:shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <span>محرك التقارير المتقدمة ومسيرات الرواتب (Payroll Engine)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              تتبع تفصيلي لساعات العمل الفعلية والتأخير والإضافي وتصدير الملفات المعتمدة للأنظمة المحاسبية
            </p>
          </div>

          {/* أزرار النطاق الزمني السريع */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs">
            <button
              type="button"
              onClick={() => applyPresetDate('today')}
              className="px-3 py-1.5 rounded-xl font-bold transition-all hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-95"
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => applyPresetDate('week')}
              className="px-3 py-1.5 rounded-xl font-bold transition-all hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-95"
            >
              هذا الأسبوع
            </button>
            <button
              type="button"
              onClick={() => applyPresetDate('month')}
              className="px-3 py-1.5 rounded-xl font-bold transition-all bg-sky-600 text-white shadow-sm"
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => applyPresetDate('prevMonth')}
              className="px-3 py-1.5 rounded-xl font-bold transition-all hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-95"
            >
              الشهر السابق
            </button>
          </div>
        </div>

        {/* حقول الفلاتر المتعددة الأبعاد */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* من تاريخ */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
            />
          </div>

          {/* إلى تاريخ */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
            />
          </div>

          {/* فلتر الفروع */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">الفرع</label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
            >
              <option value="ALL">جميع الفروع (الكل)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* فلتر الموظفين */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">الموظف</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
            >
              <option value="ALL">كافة الموظفين</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeNumber})
                </option>
              ))}
            </select>
          </div>

          {/* فلتر الحالة */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">حالة السجل</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
            >
              <option value="ALL">الكل</option>
              <option value="PRESENT">حاضر / مكتمل 🟢</option>
              <option value="LATE">متأخر 🟡</option>
              <option value="ABSENT">غائب غير مبرر 🔴</option>
              <option value="ON_LEAVE">إجازة معتمدة 🏖️</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. بطاقات الإحصائيات الذكية السريعة (Summary KPI Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-4 rounded-3xl shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
            <span>إجمالي ساعات العمل</span>
            <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{summary.totalWorkedHours}</span>
        </div>

        <div className="bg-white dark:bg-slate-900/90 border border-amber-500/30 p-4 rounded-3xl shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 mb-2 font-medium">
            <span>التأخير الصباحي</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{summary.totalLateMinutes} دقيقة</span>
        </div>

        <div className="bg-white dark:bg-slate-900/90 border border-emerald-500/30 p-4 rounded-3xl shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 mb-2 font-medium">
            <span>الساعات الإضافية</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.totalOvertimeHours}</span>
        </div>

        <div className="bg-white dark:bg-slate-900/90 border border-red-500/30 p-4 rounded-3xl shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between text-xs text-red-600 dark:text-red-400 mb-2 font-medium">
            <span>الغياب غير المبرر</span>
            <Users className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-2xl font-black text-red-600 dark:text-red-400">{summary.totalAbsenceDays} يوم</span>
        </div>
      </div>

      {/* 3. جدول تفاصيل السجلات وأزرار التصدير (Payroll Table & Export Controls) */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm dark:shadow-xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute top-3 right-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="تصفية بالاسم، رقم الموظف، أو الفرع..."
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* زر التصدير Excel */}
            <button
              onClick={() => handleExport('excel')}
              disabled={exportingFormat !== null}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
            >
              {exportingFormat === 'excel' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إنتاج Excel...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تصدير Excel (RTL)</span>
                </>
              )}
            </button>

            {/* زر التصدير CSV */}
            <button
              onClick={() => handleExport('csv')}
              disabled={exportingFormat !== null}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 active:scale-95 disabled:opacity-50"
            >
              {exportingFormat === 'csv' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إنتاج CSV...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>تصدير CSV (ERP)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* الجدول الرئيسي */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold bg-slate-100/90 dark:bg-slate-950/60">
                <th className="p-3">رقم الموظف</th>
                <th className="p-3">اسم الموظف</th>
                <th className="p-3">الفرع</th>
                <th className="p-3 text-center">التاريخ</th>
                <th className="p-3 text-center">الدخول</th>
                <th className="p-3 text-center">الخروج</th>
                <th className="p-3 text-center">ساعات العمل</th>
                <th className="p-3 text-center">التأخير</th>
                <th className="p-3 text-center">الإضافي</th>
                <th className="p-3 text-center">حالة اليوم</th>
                <th className="p-3">الملاحظات والإجازات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                      <span>جاري معالجة بيانات الرواتب والحضور...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((r: any, idx: number) => (
                  <tr key={`${r.employeeId}-${r.date}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-sky-600 dark:text-sky-400">{r.employeeNumber}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{r.employeeName}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{r.branchName}</td>
                    <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">{r.date}</td>
                    <td className="p-3 text-center font-mono text-emerald-600 dark:text-emerald-400">{r.checkInAt || '--:--'}</td>
                    <td className="p-3 text-center font-mono text-rose-600 dark:text-rose-400">{r.checkOutAt || '--:--'}</td>
                    <td className="p-3 text-center font-bold text-slate-900 dark:text-white">{r.workedHoursStr}</td>
                    <td className="p-3 text-center font-mono text-amber-600 dark:text-amber-400">
                      {r.lateMinutes > 0 ? `${r.lateMinutes}د` : '0'}
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-600 dark:text-emerald-400">{r.overtimeHoursStr}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                          r.status === 'PRESENT'
                            ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : r.status === 'LATE'
                            ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : r.status === 'ABSENT'
                            ? 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                            : 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                        }`}
                      >
                        {r.statusLabel}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px]">{r.notes || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="p-12 text-center bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <Calendar className="w-12 h-12 text-slate-400 mb-3" />
                      <h4 className="text-slate-800 font-bold text-base mb-1">لا توجد سجلات مطابقة</h4>
                      <p className="text-slate-500 text-xs leading-relaxed">
                        لم يتم العثور على أي سجلات حضور أو انصراف تطابق الفلاتر المختارة، جرب تغيير النطاق الزمني أو اختيار فرع آخر.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
