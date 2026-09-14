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
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'employees' | 'live' | 'map' | 'leaves' | 'suspicious' | 'reports' | 'settings'>('stats');
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
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const me = await meRes.json();
      if (!['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER', 'SUPERVISOR'].includes(me.user?.role)) {
        router.push('/');
        return;
      }
      setUser(me.user);

      const [dashRes, liveRes, reportRes, empRes, leavesRes, correctionsRes, envRes] = await Promise.all([
        fetch('/api/admin/dashboard'),
        fetch('/api/admin/live'),
        fetch(`/api/reports/monthly?month=${monthFilter}`),
        fetch('/api/employees'),
        fetch('/api/leave-requests'),
        fetch('/api/corrections'),
        fetch('/api/admin/environment-switch'),
      ]);

      if (dashRes.ok) setDashData(await dashRes.json());
      if (liveRes.ok) {
        const l = await liveRes.json();
        setLiveData(l.liveAttendance || []);
      }
      if (reportRes.ok) setReportData(await reportRes.json());
      if (empRes.ok) {
        const e = await empRes.json();
        setEmployeesList(e.employees || []);
      }
      if (leavesRes.ok) {
        const l = await leavesRes.json();
        setLeavesList(l.leaves || []);
      }
      if (correctionsRes.ok) {
        const c = await correctionsRes.json();
        setCorrectionsList(c.corrections || []);
      }
      if (envRes.ok) {
        const env = await envRes.json();
        if (env.environmentMode) setEnvMode(env.environmentMode);
      }
    } catch (e) {
      console.error(e);
    } finally {
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

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* الترويسة الرئيسية للوحة الإدارة */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl">
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
            <p className="text-xs text-slate-400 mt-1">متابعة الحضور والانصراف وإدارة الموظفين والفروع وتحديد بيئة المنظومة</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['SUPER_ADMIN', 'ADMIN'].includes(user?.role) && (
              <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
                <button
                  onClick={handleToggleEnvMode}
                  title="التبديل بين بيئة الإنتاج والوضع التجريبي"
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                    envMode === 'LIVE'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{envMode === 'LIVE' ? 'التحويل للتجريبي 🧪' : 'التحويل للحقيقي 🟢'}</span>
                </button>

                <button
                  onClick={handleResetDemoData}
                  disabled={resetLoading}
                  title="تصفير وسحق جميع البصمات وسجلات الاختبار للبدء بصفحة ناصعة البياض"
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{resetLoading ? 'جاري التصفير...' : 'تصفير بيانات الاختبار 🧹'}</span>
                </button>
              </div>
            )}

            {['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user?.role) && (
              <>
                <button
                  onClick={() => router.push('/admin/shifts')}
                  className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95"
                >
                  <Clock className="w-4 h-4" />
                  <span>إدارة الورديات</span>
                </button>

                <button
                  onClick={() => router.push('/admin/devices')}
                  className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95"
                >
                  <Users className="w-4 h-4" />
                  <span>الأجهزة الموثوقة</span>
                </button>

                <button
                  onClick={() => setShowAddEmployeeModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-sky-600/20 active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ إضافة موظف</span>
                </button>

                <button
                  onClick={() => setShowImportEmployeesModal(true)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 transition-all border border-slate-700"
                >
                  <Upload className="w-4 h-4" />
                  <span>استيراد CSV</span>
                </button>
              </>
            )}

            <button
              onClick={fetchAdminData}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 transition-all border border-slate-700"
            >
              <RefreshCw className="w-4 h-4 text-sky-400" />
              <span>تحديث</span>
            </button>
          </div>
        </div>

        {/* بطاقات الإحصائيات السريعة اليومية */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>الموظفين</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <span className="text-2xl font-black text-white">{summary.totalEmployees || 0}</span>
          </div>

          <div className="bg-slate-900/80 border border-emerald-500/20 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-emerald-400 text-xs mb-2">
              <span>🟢 حاضر</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-emerald-400">{summary.presentCount || 0}</span>
          </div>

          <div className="bg-slate-900/80 border border-yellow-500/20 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-yellow-400 text-xs mb-2">
              <span>🟡 متأخر</span>
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-yellow-400">{summary.lateCount || 0}</span>
          </div>

          <div className="bg-slate-900/80 border border-red-500/20 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-red-400 text-xs mb-2">
              <span>🔴 غائب</span>
              <XCircle className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-red-400">{summary.absentCount || 0}</span>
          </div>

          <div className="bg-slate-900/80 border border-orange-500/20 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-orange-400 text-xs mb-2">
              <span>🟠 استراحة</span>
              <Coffee className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-orange-400">{summary.onBreakCount || 0}</span>
          </div>

          <div className="bg-slate-900/80 border border-rose-500/30 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-rose-400 text-xs mb-2">
              <span>⚠️ محاولات مشبوهة</span>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-rose-400">{summary.suspiciousAttemptsCount || 0}</span>
          </div>
        </div>

        {/* شريط التبويبات الرئيسي للوحة التحكم */}
        <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'stats'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/25'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            📊 النشاط المباشر
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'employees'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/25'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            👥 إدارة الموظفين ({employeesList.length})
          </button>

          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'leaves'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/25'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            📅 الإجازات والتصحيح ({leavesList.filter((l) => l.status === 'PENDING').length})
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'live'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/25'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            🟢 الحضور المباشر
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'map'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/25'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            🗺️ الفروع والـ Geofence
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'reports'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/25'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            📑 التقارير الشهيرة
          </button>

          <button
            onClick={() => router.push('/admin/shifts')}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all bg-slate-900 text-amber-400 hover:text-amber-300 border border-amber-500/30 flex items-center gap-1.5"
          >
            ⏰ إدارة الورديات والمواعيد
          </button>

          <button
            onClick={() => router.push('/admin/devices')}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all bg-slate-900 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5"
          >
            📱 الأجهزة المقترنة الموثوقة
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'settings'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/25'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            ⚙️ إعدادات المنظومة
          </button>
        </div>

        {/* TABS CONTENT */}

        {/* 1. النشاط اليومي */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>آخر عمليات الحضور والانصراف المسجلة</span>
              </h3>

              <div className="space-y-3">
                {dashData?.recentEvents?.map((evt: any) => (
                  <div
                    key={evt.id}
                    className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs"
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

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-400" />
                <span>الفروع المصرحة ونطاقات الحضور الجغرافية</span>
              </h3>

              <div className="space-y-3">
                {dashData?.branches?.map((b: any) => (
                  <div
                    key={b.id}
                    className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <h4 className="font-bold text-white">{b.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{b.address || 'العنوان غير محدد'}</p>
                      <div className="text-[10px] text-sky-400 font-mono mt-1">
                        Lat: {b.latitude} | Lng: {b.longitude}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 font-bold rounded-xl text-xs border border-emerald-500/30">
                        نطاق: {b.geofenceRadius}m
                      </span>
                      <button
                        onClick={() => setSelectedBranchForEdit(b)}
                        className="p-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold flex items-center gap-1 text-xs"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>تعديل</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. إدارة الموظفين */}
        {activeTab === 'employees' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
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

              {['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user?.role) && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddEmployeeModal(true)}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ إضافة موظف جديد</span>
                  </button>

                  <button
                    onClick={() => setShowImportEmployeesModal(true)}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <Upload className="w-4 h-4" />
                    <span>استيراد CSV</span>
                  </button>
                </div>
              )}
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

        {/* 3. الإجازات والتصحيح */}
        {activeTab === 'leaves' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white mb-3">طلبات الإجازات والتصحيح المعلقة للموافقة</h3>
              
              <div className="space-y-3">
                {leavesList.map((leave) => (
                  <div key={leave.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{leave.employee?.firstName} {leave.employee?.lastName}</span>
                        <span className="text-[10px] bg-sky-500/20 text-sky-400 font-bold px-2 py-0.5 rounded-full">{leave.leaveType?.name}</span>
                        <span className="text-slate-400 font-mono text-[10px]">({leave.totalDays} أيام)</span>
                      </div>
                      <p className="text-slate-300 mt-1">{leave.reason}</p>
                      <div className="text-[10px] text-slate-500 mt-1 font-mono">
                        من: {new Date(leave.startDate).toISOString().slice(0, 10)} ➔ إلى: {new Date(leave.endDate).toISOString().slice(0, 10)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {leave.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => handleLeaveAction(leave.id, 'APPROVED')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-lg shadow-emerald-600/20"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>موافقة</span>
                          </button>
                          <button
                            onClick={() => handleLeaveAction(leave.id, 'REJECTED')}
                            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold rounded-xl text-xs flex items-center gap-1 border border-red-500/30"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>رفض</span>
                          </button>
                        </>
                      ) : (
                        <span className={`px-3 py-1 font-bold rounded-xl text-[11px] ${leave.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {leave.status === 'APPROVED' ? 'تمت الموافقة' : 'مرفوض'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. الحضور المباشر */}
        {activeTab === 'live' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الموظف أو الرقم الوظيفي..."
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/50">
                    <th className="p-3">رقم الموظف</th>
                    <th className="p-3">الاسم والوظيفة</th>
                    <th className="p-3">القسم والفرع</th>
                    <th className="p-3">وقت الحضور</th>
                    <th className="p-3">وقت الانصراف</th>
                    <th className="p-3">ساعات العمل</th>
                    <th className="p-3">الحالة الحالية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLive.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-sky-400">{item.employeeNumber}</td>
                      <td className="p-3 font-bold text-white">{item.name}</td>
                      <td className="p-3 text-slate-400">{item.department} - {item.branch}</td>
                      <td className="p-3 font-mono text-emerald-400">{item.checkInTime}</td>
                      <td className="p-3 font-mono text-rose-400">{item.checkOutTime}</td>
                      <td className="p-3 font-bold text-slate-200">{item.workedHours}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${item.statusBadge}`}>
                          {item.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. الفروع والـ Geofence */}
        {activeTab === 'map' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white">إدارة وتعديل موقع الفرع ونطاق الحضور الجغرافي</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashData?.branches?.map((branch: any) => (
                <div key={branch.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">{branch.name}</h4>
                    <p className="text-xs text-slate-400">{branch.address}</p>
                    <div className="text-[10px] text-sky-400 font-mono mt-1">Lat: {branch.latitude} | Lng: {branch.longitude}</div>
                  </div>
                  <button
                    onClick={() => setSelectedBranchForEdit(branch)}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>تعديل موقع الفرع ونطاق Geofence على الخريطة</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. التقارير الشهيرة */}
        {activeTab === 'reports' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-base font-bold text-white">كشف الحضور والغياب الشهري للموظفين</h3>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
                <button onClick={handleExportCSV} className="px-3.5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2">
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
                    <tr key={row.id}>
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
        )}

        {/* 7. إعدادات المنظومة */}
        {activeTab === 'settings' && <SystemSettingsTab />}
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
