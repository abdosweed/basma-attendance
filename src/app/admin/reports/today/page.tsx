'use client';

import React, { useEffect, useState } from 'react';
import { ReportFilterBar } from '@/components/ReportFilterBar';
import { TodayLiveReportResponse, TodayLiveRow } from '@/lib/reporting/types';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { ReportTable, ReportColumn } from '@/components/reports/report-table';
import { MetricCardSkeleton, ReportTableSkeleton } from '@/components/ui/skeleton';

export default function TodayLiveReportPage() {
  const [reportData, setReportData] = useState<TodayLiveReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (branchId) params.set('branchId', branchId);
      if (departmentId) params.set('departmentId', departmentId);

      const res = await fetch(`/api/reports/today?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (err) {
      console.error('Failed to load today report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [search, status, branchId, departmentId]);

  const summary = reportData?.summary;

  const handleExportExcel = () => {
    window.location.href = `/api/reports/daily/export`;
  };

  const columns: ReportColumn<TodayLiveRow>[] = [
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
          <div className="font-medium text-slate-800 dark:text-slate-200">{row.departmentName}</div>
          <div className="text-[10px] text-slate-400">{row.branchName}</div>
        </div>
      ),
    },
    {
      key: 'shift',
      header: 'الوردية',
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
      header: 'وقت الدخول',
      render: (row) => (
        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
          {row.checkInAt || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (row) => <StatusBadge status={row.status} label={row.statusLabel} size="sm" />,
    },
    {
      key: 'lateMinutes',
      header: 'التأخير',
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
      key: 'checkOutAt',
      header: 'وقت الخروج',
      render: (row) => (
        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
          {row.checkOutAt || (row.checkInAt ? 'في العمل' : '—')}
        </span>
      ),
    },
    {
      key: 'workedMinutes',
      header: 'ساعات العمل',
      render: (row) => (
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {row.workedMinutes ? `${Math.floor(row.workedMinutes / 60)}س ${row.workedMinutes % 60}د` : '—'}
        </span>
      ),
    },
    {
      key: 'flags',
      header: 'التنبيهات',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.flags.map((f, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 text-[9px] rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            >
              {f}
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Executive Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🔴</span> التقرير المباشر لحضور اليوم (Today Live)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            لوحة متابعة لحظية ومباشرة لدوام الموظفين والتأخير والاستراحات بتوقيت طرابلس.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
            📊 تصدير إلى Excel
          </Button>
        </div>
      </div>

      {/* KPI Summary Header Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard title="المتوقع حضورهم" value={summary?.expectedCount ?? 0} variant="default" />
          <MetricCard title="يعمل الآن" value={summary?.currentlyWorkingCount ?? 0} variant="emerald" />
          <MetricCard title="متأخرون" value={summary?.lateCount ?? 0} variant="amber" />
          <MetricCard title="في استراحة" value={summary?.onBreakCount ?? 0} variant="sky" />
          <MetricCard title="أنهى الدوام" value={summary?.checkedOutCount ?? 0} variant="emerald" />
          <MetricCard title="يحتاج مراجعة" value={summary?.needsReviewCount ?? 0} variant="rose" />
        </div>
      )}

      {/* Filter Bar */}
      <ReportFilterBar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        branchId={branchId}
        onBranchChange={setBranchId}
        departmentId={departmentId}
        onDepartmentChange={setDepartmentId}
      />

      {/* Table */}
      {loading ? (
        <ReportTableSkeleton rows={6} />
      ) : (
        <ReportTable
          columns={columns}
          data={reportData?.rows || []}
          loading={false}
          keyExtractor={(row) => row.employeeId}
        />
      )}
    </div>
  );
}
