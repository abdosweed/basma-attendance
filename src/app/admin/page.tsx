'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BranchLocationPickerModal from '@/components/BranchLocationPickerModal';
import AddEmployeeModal from '@/components/AddEmployeeModal';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import ImportEmployeesModal from '@/components/ImportEmployeesModal';
import SystemSettingsTab from '@/components/SystemSettingsTab';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Coffee,
  Calendar,
  FileSpreadsheet,
  Printer,
  Search,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Clock,
  Building,
  Filter,
  Download,
  Edit3,
  UserPlus,
  UserCheck,
  UserX,
  Settings,
  Upload,
  Send,
  Smartphone,
  CheckSquare,
  Activity,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'live_activity' | 'team' | 'structure' | 'reports'>('live_activity');
  const [dashData, setDashData] = useState<any>(null);
  const [liveData, setLiveData] = useState<any[]>([]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [leavesList, setLeavesList] = useState<any[]>([]);
  const [correctionsList, setCorrectionsList] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));

  // حالة المودالات
  const [selectedBranchForEdit, setSelectedBranchForEdit] = useState<any>(null);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showImportEmployeesModal, setShowImportEmployeesModal] = useState(false);
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<any>(null);

  const [envMode, setEnvMode] = useState<'DEMO' | 'LIVE'>('DEMO');
  const [resetLoading, setResetLoading] = useState(false);

  const fetchAdminData = async () => {
    // مؤقت أمان يضمن كسر شاشة التحميل السوداء خلال 4 ثوانٍ كحد أقصى حتى لو تأخر أحد المسارات
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 4000);

    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        clearTimeout(safetyTimeout);
        setLoading(false);
        router.push('/login');
        return;
      }
      const me = await meRes.json();
      if (!['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER', 'SUPERVISOR'].includes(me.user?.role)) {
        clearTimeout(safetyTimeout);
        setLoading(false);
        router.push('/');
        return;
      }
      setUser(me.user);

      const results = await Promise.allSettled([
        fetch('/api/admin/dashboard'),
        fetch('/api/admin/live'),
        fetch(`/api/reports/monthly?month=${monthFilter}`),
        fetch('/api/employees'),
        fetch('/api/leave-requests'),
        fetch('/api/corrections'),
        fetch('/api/admin/environment-switch'),
      ]);

      const [dashRes, liveRes, reportRes, empRes, leavesRes, correctionsRes, envRes] = results;

      if (dashRes.status === 'fulfilled' && dashRes.value.ok) setDashData(await dashRes.value.json());
      if (liveRes.status === 'fulfilled' && liveRes.value.ok) {
        const l = await liveRes.value.json();
        setLiveData(l.liveAttendance || []);
      }
      if (reportRes.status === 'fulfilled' && reportRes.value.ok) setReportData(await reportRes.value.json());
      if (empRes.status === 'fulfilled' && empRes.value.ok) {
        const e = await empRes.value.json();
        setEmployeesList(e.employees || []);
      }
      if (leavesRes.status === 'fulfilled' && leavesRes.value.ok) {
        const l = await leavesRes.value.json();
        setLeavesList(l.leaves || []);
      }
      if (correctionsRes.status === 'fulfilled' && correctionsRes.value.ok) {
        const c = await correctionsRes.value.json();
        setCorrectionsList(c.corrections || []);
      }
      if (envRes.status === 'fulfilled' && envRes.value.ok) {
        const env = await envRes.value.json();
        if (env.environmentMode) setEnvMode(env.environmentMode);
      }
    } catch (e) {
      console.error('Admin dashboard load error:', e);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  };

  const handleToggleEnvMode = async () => {
    const nextMode = envMode === 'DEMO' ? 'LIVE' : 'DEMO';
    const label = nextMode === 'LIVE' ? 'التحويل للوضع الحقيقي والعمل الفعلي' : 'التحويل لوضع التجربة والاختبار';
    if (!window.confirm(`هل أنت متأكد من ${label}؟`)) return;

    try {
      const res = await fetch('/api/admin/environment-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: nextMode }),
      });
      if (res.ok) {
        const data = await res.json();
        setEnvMode(data.mode);
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetDemoData = async () => {
    if (!window.confirm('⚠️ تحذير مهم: هل أنت متأكد من تصفير وإلغاء جميع سجلات البصمات والمحاولات التجريبية بالكامل لتنقية النظام للعمل الفعلي؟')) return;

    setResetLoading(true);
    try {
      const res = await fetch('/api/admin/environment-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_DEMO' }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();

    const interval = setInterval(() => {
      fetchAdminData();
    }, 25000);

    return () => clearInterval(interval);
  }, [monthFilter]);

  const handleDisableEmployee = async (empId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = newStatus === 'INACTIVE' ? 'تعطيل' : 'إعادة تفعيل';
    if (!window.confirm(`هل أنت متأكد من ${actionLabel} حساب هذا الموظف؟`)) return;

    try {
      const res = await fetch(`/api/employees/${empId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveAction = async (leaveId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/leave-requests/${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCorrectionAction = async (corrId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/corrections/${corrId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCSV = () => {
    if (!reportData?.reportRows) return;
    const headers = 'رقم الموظف,اسم الموظف,القسم,الفرع,أيام العمل,الحضور,الغياب,التأخير,ساعات العمل,الساعات الإضافية\n';
    const rows = reportData.reportRows
      .map(
        (r: any) =>
          `"${r.employeeNumber}","${r.name}","${r.department}","${r.branch}",${r.workingDays},${r.attendanceDays},${r.absenceDays},"${r.lateStr}","${r.workedHoursStr}","${r.overtimeStr}"`
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_الحضور_الشهري_${monthFilter}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">جاري فتح لوحة التحكم الإدارية...</p>
        </div>
      </div>
    );
  }

  const summary = dashData?.summary || {};
  const filteredLive = liveData.filter(
    (e) =>
      e.name.includes(searchQuery) ||
      e.employeeNumber.includes(searchQuery) ||
      e.department.includes(searchQuery)
  );

  const filteredEmployees = employeesList.filter(
    (emp) =>
      `${emp.firstName} ${emp.lastName}`.includes(empSearchQuery) ||
      emp.employeeNumber.includes(empSearchQuery) ||
      (emp.user?.email && emp.user.email.includes(empSearchQuery))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-[98%] w-full mx-auto p-3 sm:p-6 space-y-6">
        {/* الترويسة الرئيسية للوحة الإدارة */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-950/90 border border-slate-800/80 p-5 rounded-3xl shadow-xl backdrop-blur-md">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              لوحة التحكم الإدارية
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                  envMode === 'LIVE'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/20'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/20 animate-pulse'
                }`}
              >
                {envMode === 'LIVE' ? '🟢 وضع الإنتاج الحقيقي' : '🧪 بيئة التجربة والاختبار'}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">متابعة الحضور والانصراف، وإدارة فريق العمل، والفروع، والمطابقة المركزية</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* زر الاعتمادات الموحد مع شارة المعاملات المعلقة */}
            <button
              onClick={() => router.push('/admin/approvals')}
              className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-rose-600/25 active:scale-95 border border-rose-400/30"
              title="مركز الاعتماد السريع لجميع الطلبات والمعاملات"
            >
              <CheckSquare className="w-4 h-4 text-white" />
              <span>الاعتمادات</span>
              {((dashData?.summary?.pendingDevicesCount || 0) + (leavesList.filter((l) => l.status === 'PENDING').length || 0)) > 0 && (
                <span className="bg-white text-rose-600 px-2 py-0.5 rounded-full text-[10px] font-extrabold animate-pulse">
                  {(dashData?.summary?.pendingDevicesCount || 0) + (leavesList.filter((l) => l.status === 'PENDING').length || 0)}
                </span>
              )}
            </button>

            {['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user?.role) && (
              <>
                <button
                  onClick={() => setShowAddEmployeeModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-all shadow-lg shadow-sky-600/20 active:scale-95 border border-sky-400/30"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ إضافة موظف</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700/90 text-emerald-400 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-all border border-slate-700/80 active:scale-95"
                  title="تصدير سجلات وكشوف الحضور"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">تصدير السجلات</span>
                </button>
              </>
            )}

            <button
              onClick={fetchAdminData}
              className="p-2.5 bg-slate-800/90 hover:bg-slate-700/90 text-xs font-bold rounded-2xl flex items-center justify-center transition-all border border-slate-700/80 text-sky-400 active:scale-95"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* بطاقات الإحصائيات السريعة اليومية */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <button
            onClick={() => setActiveTab('team')}
            className="text-right bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/90 p-4 rounded-3xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2 font-medium">
              <span>إجمالي الموظفين</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <span className="text-2xl font-black text-white">{summary.totalEmployees || 0}</span>
          </button>

          <button
            onClick={() => setActiveTab('live_activity')}
            className="text-right bg-slate-900/60 hover:bg-slate-900/90 border border-emerald-500/30 p-4 rounded-3xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center justify-between text-emerald-400 text-xs mb-2 font-medium">
              <span>🟢 حاضر الآن</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-emerald-400">{summary.presentCount || 0}</span>
          </button>

          <button
            onClick={() => setActiveTab('live_activity')}
            className="text-right bg-slate-900/60 hover:bg-slate-900/90 border border-yellow-500/30 p-4 rounded-3xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center justify-between text-yellow-400 text-xs mb-2 font-medium">
              <span>🟡 متأخر</span>
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-yellow-400">{summary.lateCount || 0}</span>
          </button>

          <button
            onClick={() => setActiveTab('live_activity')}
            className="text-right bg-slate-900/60 hover:bg-slate-900/90 border border-red-500/30 p-4 rounded-3xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center justify-between text-red-400 text-xs mb-2 font-medium">
              <span>🔴 غائب</span>
              <XCircle className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-red-400">{summary.absentCount || 0}</span>
          </button>

          <button
            onClick={() => setActiveTab('live_activity')}
            className="text-right bg-slate-900/60 hover:bg-slate-900/90 border border-orange-500/30 p-4 rounded-3xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center justify-between text-orange-400 text-xs mb-2 font-medium">
              <span>🟠 في استراحة</span>
              <Coffee className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-orange-400">{summary.onBreakCount || 0}</span>
          </button>

          <button
            onClick={() => setActiveTab('live_activity')}
            className="text-right bg-slate-900/60 hover:bg-slate-900/90 border border-rose-500/40 p-4 rounded-3xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center justify-between text-rose-400 text-xs mb-2 font-medium">
              <span>⚠️ محاولات مشبوهة</span>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-rose-400">{summary.suspiciousAttemptsCount || 0}</span>
          </button>
        </div>

        {/* شريط التبويبات الأربعة الموحدة (Consolidated 4 Tabs Navigation) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-800/80 pb-3">
          <button
            onClick={() => setActiveTab('live_activity')}
            className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
              activeTab === 'live_activity'
                ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white border-sky-400/50 shadow-lg shadow-sky-600/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800/80 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>1. النشاط المباشر ⚡</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
              activeTab === 'team'
                ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white border-sky-400/50 shadow-lg shadow-sky-600/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800/80 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. فريق العمل 👥</span>
          </button>

          <button
            onClick={() => setActiveTab('structure')}
            className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
              activeTab === 'structure'
                ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white border-sky-400/50 shadow-lg shadow-sky-600/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800/80 hover:bg-slate-800/60'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>3. الهيكل والمواعيد 🏢</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
              activeTab === 'reports'
                ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white border-sky-400/50 shadow-lg shadow-sky-600/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800/80 hover:bg-slate-800/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>4. التقارير والمطابقة 📑</span>
          </button>
        </div>

        {/* 1. النشاط المباشر (live_activity) */}
        {activeTab === 'live_activity' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-xl backdrop-blur-sm">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" />
                    آخر عمليات الحضور والانصراف المسجلة
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">مباشر ⚡</span>
                </h3>

                <div className="space-y-3">
                  {dashData?.recentEvents?.map((evt: any) => (
                    <div
                      key={evt.id}
                      className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700/80 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            evt.type === 'CHECK_IN'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : evt.type === 'CHECK_OUT'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }`}
                        >
                          {evt.type === 'CHECK_IN' ? 'حضر' : evt.type === 'CHECK_OUT' ? 'خرج' : 'استراحة'}
                        </div>
                        <div>
                          <span className="font-bold text-white block">
                            {evt.employee?.firstName} {evt.employee?.lastName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {evt.branch?.name || 'الفرع الرئيسي'} • المسافة:{' '}
                            {evt.distanceFromBranch ? `${Math.round(evt.distanceFromBranch)}m` : '0m'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-sky-400 font-bold">
                        {new Date(evt.serverTimestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* جدولة الحضور اللحظي */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-xl backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>جدول الحضور والغياب اللحظي اليوم</span>
                  </h3>
                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute top-2.5 right-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="بحث سريع..."
                      className="w-full pr-8 pl-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold sticky top-0 bg-slate-950">
                        <th className="p-2.5">الموظف</th>
                        <th className="p-2.5">حضر</th>
                        <th className="p-2.5">انصرف</th>
                        <th className="p-2.5">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredLive.slice(0, 15).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-2.5 font-bold text-white">{item.name}</td>
                          <td className="p-2.5 font-mono text-emerald-400">{item.checkInTime}</td>
                          <td className="p-2.5 font-mono text-rose-400">{item.checkOutTime}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${item.statusBadge}`}>
                              {item.statusLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* سجل المحاولات المشبوهة High-Clarity Audit Log */}
            <div className="bg-slate-900/80 border border-rose-500/30 rounded-3xl p-5 space-y-4 shadow-xl backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                    <span>تقرير المحاولات المشبوهة وخروقات الموقع الجغرافي (Suspicious Audit Log)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    رصد تفصيلي لجميع محاولات التبصيم من أجهزة غير معتمدة أو خارج النطاق الجغرافي المحدد للفروع.
                  </p>
                </div>
                <span className="px-3 py-1 bg-rose-500/20 text-rose-400 font-bold text-xs rounded-xl border border-rose-500/30">
                  المحاولات المحظورة: {dashData?.suspiciousAttempts?.length || 0}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 text-[11px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">الموظف</th>
                      <th className="p-3">السبب والتشخيص</th>
                      <th className="p-3">مستوى الخطورة</th>
                      <th className="p-3">ملاحظات دقة GPS</th>
                      <th className="p-3">الإجراء المتخذ</th>
                      <th className="p-3">التوقيت والتاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {dashData?.suspiciousAttempts?.length > 0 ? (
                      dashData.suspiciousAttempts.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-bold text-white">
                            <div>
                              <span>{item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : 'غير معروف'}</span>
                              <span className="block text-[10px] text-slate-400 font-mono">
                                #{item.employee?.employeeNumber || item.employeeId || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-rose-300 font-medium">
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                              <span>
                                {item.reason === 'GPS_OUT_OF_BOUNDS' || item.reason?.includes('خارج')
                                  ? '📍 محاولة تبصيم من خارج النطاق الجغرافي المصرح'
                                  : item.reason === 'LOW_ACCURACY' || item.reason?.includes('دقة')
                                  ? '📡 دقة الـ GPS ضئيلة جداً أو غير موثوقة'
                                  : item.reason === 'UNAUTHORIZED_DEVICE' || item.reason?.includes('جهاز')
                                  ? '📱 استخدام هاتف غير معتمد بحساب الموظف'
                                  : item.reason}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                item.riskLevel === 'HIGH'
                                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                  : item.riskLevel === 'MEDIUM'
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {item.riskLevel === 'HIGH' ? '⚠️ عالي الخطورة' : item.riskLevel === 'MEDIUM' ? '⚡ متوسط' : item.riskLevel}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] font-mono text-slate-400">
                            {item.latitude && item.longitude ? (
                              <div>
                                <span className="text-sky-400">
                                  Lat: {Number(item.latitude).toFixed(4)} | Lng: {Number(item.longitude).toFixed(4)}
                                </span>
                                <span className="block text-[10px] text-slate-500">
                                  الدقة: {Math.round(item.accuracy || 0)}m
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">غ/م</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="px-2.5 py-1 bg-red-500/20 text-red-400 font-bold rounded-xl text-[10px] border border-red-500/30">
                              🛡️ حظر التبصيم (BLOCKED)
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">
                            {new Date(item.createdAt || item.timestamp).toLocaleString('ar-EG', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                          🎉 ممتاز! لا توجد أي محاولات مشبوهة أو خروقات موقع سجلت مؤخراً.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. فريق العمل (team) */}
        {activeTab === 'team' && (
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                <input
                  type="text"
                  value={empSearchQuery}
                  onChange={(e) => setEmpSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الموظف، الرقم الوظيفي، أو البريد الإلكتروني..."
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/admin/devices')}
                  className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-emerald-400 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 border border-slate-700/80"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>الأجهزة المعتمدة</span>
                </button>

                {['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user?.role) && (
                  <>
                    <button
                      onClick={() => setShowAddEmployeeModal(true)}
                      className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ إضافة موظف</span>
                    </button>

                    <button
                      onClick={() => setShowImportEmployeesModal(true)}
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 border border-slate-700"
                    >
                      <Upload className="w-4 h-4" />
                      <span>استيراد CSV</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/60">
                    <th className="p-3">رقم الموظف</th>
                    <th className="p-3">الاسم والوظيفة</th>
                    <th className="p-3">البريد الإلكتروني</th>
                    <th className="p-3">الفرع الرئيسي</th>
                    <th className="p-3">الدور (Role)</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-sky-400">{emp.employeeNumber}</td>
                      <td className="p-3">
                        <div className="font-bold text-white">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-[10px] text-slate-400">{emp.jobTitle || 'موظف'}</div>
                      </td>
                      <td className="p-3 text-slate-300 font-mono text-[11px]">{emp.user?.email}</td>
                      <td className="p-3 text-slate-300">{emp.primaryBranch?.name || 'الفرع الرئيسي'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 font-mono font-bold text-[10px] rounded-lg border border-sky-500/30">
                          {emp.user?.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                            emp.status === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {emp.status === 'ACTIVE' ? '🟢 مفعّل' : '🔴 معطّل'}
                        </span>
                      </td>
                      <td className="p-3 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedEmployeeForEdit(emp)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-xs"
                            title="تعديل الموظف"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDisableEmployee(emp.id, emp.status)}
                            className={`p-1.5 rounded-lg text-xs ${
                              emp.status === 'ACTIVE'
                                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                            }`}
                            title={emp.status === 'ACTIVE' ? 'تعطيل الحساب' : 'إعادة تفعيل'}
                          >
                            {emp.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. الهيكل والمواعيد (structure) */}
        {activeTab === 'structure' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">إدارة الورديات ومواعيد العمل</h3>
                  <p className="text-xs text-slate-400 mt-0.5">تحديد مواعيد الورديات الثابتة والمرنة ورسوم الحضور</p>
                </div>
                <button
                  onClick={() => router.push('/admin/shifts')}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-600/20"
                >
                  <Clock className="w-4 h-4" />
                  <span>فتح إدارة الورديات والمواعيد ➔</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-xl backdrop-blur-sm">
              <h3 className="text-base font-bold text-white">إدارة وتعديل موقع الفرع ونطاق الحضور الجغرافي (Geofence)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashData?.branches?.map((branch: any) => (
                  <div key={branch.id} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-white">{branch.name}</h4>
                      <p className="text-xs text-slate-400">{branch.address || 'العنوان غير محدد'}</p>
                      <div className="text-[10px] text-sky-400 font-mono mt-1">Lat: {branch.latitude} | Lng: {branch.longitude}</div>
                    </div>
                    <button
                      onClick={() => setSelectedBranchForEdit(branch)}
                      className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>تعديل موقع الفرع ونطاق Geofence على الخريطة</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. التقارير والمطابقة (reports) */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 space-y-5 shadow-xl backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">كشف الحضور والغياب الشهري للموظفين</h3>
                  <p className="text-xs text-slate-400 mt-0.5">مطابقة الساعات الفعلية والإضافية والتأخيرات لكل موظف</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                  <button onClick={handleExportCSV} className="px-3.5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20">
                    <Download className="w-4 h-4" />
                    <span>تصدير Excel / CSV</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/60">
                      <th className="p-3">رقم الموظف</th>
                      <th className="p-3">اسم الموظف</th>
                      <th className="p-3 text-center">أيام الحضور</th>
                      <th className="p-3 text-center">أيام الغياب</th>
                      <th className="p-3 text-center">التأخير</th>
                      <th className="p-3 text-center">ساعات العمل</th>
                      <th className="p-3 text-center">الإضافي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {reportData?.reportRows?.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-sky-400">{row.employeeNumber}</td>
                        <td className="p-3 font-bold text-white">{row.name}</td>
                        <td className="p-3 text-center font-bold text-emerald-400">{row.attendanceDays}</td>
                        <td className="p-3 text-center font-bold text-rose-400">{row.absenceDays}</td>
                        <td className="p-3 text-center font-mono text-yellow-400">{row.lateStr}</td>
                        <td className="p-3 text-center font-bold text-slate-200">{row.workedHoursStr}</td>
                        <td className="p-3 text-center font-mono text-sky-400">{row.overtimeStr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* إعدادات المنظومة والمطابقة الحسابية */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-xl backdrop-blur-sm">
              <SystemSettingsTab />
            </div>
          </div>
        )}
      </main>

      {/* المودالات الفاعلة */}
      {selectedBranchForEdit && (
        <BranchLocationPickerModal
          branch={selectedBranchForEdit}
          onClose={() => setSelectedBranchForEdit(null)}
          onSuccess={() => fetchAdminData()}
        />
      )}

      {showAddEmployeeModal && (
        <AddEmployeeModal
          branches={dashData?.branches || []}
          onClose={() => setShowAddEmployeeModal(false)}
          onSuccess={() => fetchAdminData()}
        />
      )}

      {showImportEmployeesModal && (
        <ImportEmployeesModal
          branches={dashData?.branches || []}
          onClose={() => setShowImportEmployeesModal(false)}
          onSuccess={() => fetchAdminData()}
        />
      )}

      {selectedEmployeeForEdit && (
        <EditEmployeeModal
          employee={selectedEmployeeForEdit}
          branches={dashData?.branches || []}
          onClose={() => setSelectedEmployeeForEdit(null)}
          onSuccess={() => fetchAdminData()}
        />
      )}
    </div>
  );
}
