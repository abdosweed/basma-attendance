'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BranchLocationPickerModal from '@/components/BranchLocationPickerModal';
import AddEmployeeModal from '@/components/AddEmployeeModal';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import ImportEmployeesModal from '@/components/ImportEmployeesModal';
import SystemSettingsTab from '@/components/SystemSettingsTab';
import PayrollReportsTab from '@/components/PayrollReportsTab';
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

// Memory module cache for instant Stale-While-Revalidate loading (0s load time)
let cachedAdminData: {
  dashData?: any;
  liveData?: any[];
  employeesList?: any[];
  leavesList?: any[];
  correctionsList?: any[];
  reportData?: any;
  envMode?: 'DEMO' | 'LIVE';
  user?: any;
} = {};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(cachedAdminData.user || null);
  const [activeTab, setActiveTab] = useState<'live_activity' | 'team' | 'structure' | 'reports' | 'settings'>('live_activity');
  const [dashData, setDashData] = useState<any>(cachedAdminData.dashData || null);
  const [liveData, setLiveData] = useState<any[]>(cachedAdminData.liveData || []);
  const [employeesList, setEmployeesList] = useState<any[]>(cachedAdminData.employeesList || []);
  const [leavesList, setLeavesList] = useState<any[]>(cachedAdminData.leavesList || []);
  const [correctionsList, setCorrectionsList] = useState<any[]>(cachedAdminData.correctionsList || []);
  const [reportData, setReportData] = useState<any>(cachedAdminData.reportData || null);
  const [loading, setLoading] = useState(!cachedAdminData.dashData);
  const [searchQuery, setSearchQuery] = useState('');
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));

  // حالة المودالات
  const [selectedBranchForEdit, setSelectedBranchForEdit] = useState<any>(null);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showImportEmployeesModal, setShowImportEmployeesModal] = useState(false);
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<any>(null);

  const [envMode, setEnvMode] = useState<'DEMO' | 'LIVE'>(cachedAdminData.envMode || 'DEMO');
  const [resetLoading, setResetLoading] = useState(false);

  const activeAbortControllerRef = React.useRef<AbortController | null>(null);

  // استرجاع الكاش من sessionStorage لإخفاء شاشة التحميل فوراً
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('basma_admin_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.dashData) {
          cachedAdminData = parsed;
          setDashData(parsed.dashData);
          if (parsed.liveData) setLiveData(parsed.liveData);
          if (parsed.employeesList) setEmployeesList(parsed.employeesList);
          if (parsed.leavesList) setLeavesList(parsed.leavesList);
          if (parsed.reportData) setReportData(parsed.reportData);
          if (parsed.user) setUser(parsed.user);
          if (parsed.envMode) setEnvMode(parsed.envMode);
          setLoading(false);
        }
      }
    } catch (e) {}
  }, []);

  // مؤقت أمان حازم خارجي يضمن عدم التعليق نهائياً لكسر شاشة التحميل بعد 5 ثوانٍ كحد أقصى
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("Safety timeout triggered: Forcing dashboard mount.");
          return false;
        }
        return false;
      });
    }, 5000);

    return () => clearTimeout(safetyTimer);
  }, []);

  const fetchAdminData = async (signal?: AbortSignal) => {
    // مؤقت أمان داخلي يضمن كسر شاشة التحميل خلال 3 ثوانٍ كحد أقصى للطلب
    const fetchSafetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    try {
      const meRes = await fetch('/api/auth/me', { signal });
      if (!meRes.ok) {
        setLoading(false);
        router.push('/login');
        return;
      }
      const me = await meRes.json();
      if (!['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER', 'SUPERVISOR'].includes(me.user?.role)) {
        setLoading(false);
        router.push('/');
        return;
      }
      setUser(me.user);
      cachedAdminData.user = me.user;

      const results = await Promise.allSettled([
        fetch('/api/admin/dashboard', { signal }),
        fetch('/api/admin/live', { signal }),
        fetch(`/api/reports/monthly?month=${monthFilter}`, { signal }),
        fetch('/api/employees', { signal }),
        fetch('/api/leave-requests', { signal }),
        fetch('/api/corrections', { signal }),
        fetch('/api/admin/environment-switch', { signal }),
      ]);

      const [dashRes, liveRes, reportRes, empRes, leavesRes, correctionsRes, envRes] = results;

      if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
        const d = await dashRes.value.json();
        setDashData(d);
        cachedAdminData.dashData = d;
      }
      if (liveRes.status === 'fulfilled' && liveRes.value.ok) {
        const l = await liveRes.value.json();
        setLiveData(l.liveAttendance || []);
        cachedAdminData.liveData = l.liveAttendance || [];
      }
      if (reportRes.status === 'fulfilled' && reportRes.value.ok) {
        const r = await reportRes.value.json();
        setReportData(r);
        cachedAdminData.reportData = r;
      }
      if (empRes.status === 'fulfilled' && empRes.value.ok) {
        const e = await empRes.value.json();
        setEmployeesList(e.employees || []);
        cachedAdminData.employeesList = e.employees || [];
      }
      if (leavesRes.status === 'fulfilled' && leavesRes.value.ok) {
        const l = await leavesRes.value.json();
        setLeavesList(l.leaves || []);
        cachedAdminData.leavesList = l.leaves || [];
      }
      if (correctionsRes.status === 'fulfilled' && correctionsRes.value.ok) {
        const c = await correctionsRes.value.json();
        setCorrectionsList(c.corrections || []);
        cachedAdminData.correctionsList = c.corrections || [];
      }
      if (envRes.status === 'fulfilled' && envRes.value.ok) {
        const env = await envRes.value.json();
        if (env.environmentMode) {
          setEnvMode(env.environmentMode);
          cachedAdminData.envMode = env.environmentMode;
        }
      }

      // حفظ الكاش السريع
      try {
        sessionStorage.setItem('basma_admin_cache', JSON.stringify(cachedAdminData));
      } catch (err) {}
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Admin dashboard load error:', e);
      }
    } finally {
      clearTimeout(fetchSafetyTimeout);
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    fetchAdminData(controller.signal);

    const interval = setInterval(() => {
      fetchAdminData(controller.signal);
    }, 25000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-900 dark:text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400">جاري فتح لوحة التحكم الإدارية...</p>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 pt-8 pb-12 space-y-8">
        {/* الترويسة الرئيسية للوحة الإدارة */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              لوحة التحكم الإدارية
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                  envMode === 'LIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                }`}
              >
                {envMode === 'LIVE' ? '🟢 وضع الإنتاج الحقيقي' : '🧪 بيئة التجربة والاختبار'}
              </span>
            </h1>
            <p className="text-xs text-slate-600 mt-1">متابعة الحضور والانصراف، وإدارة فريق العمل، والفروع، والمطابقة المركزية</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* زر الاعتمادات الموحد مع شارة المعاملات المعلقة */}
            <button
              onClick={() => router.push('/admin/approvals')}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-sm active:scale-95 border border-rose-500/30"
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
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ إضافة موظف</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all border border-slate-300 active:scale-95"
                  title="تصدير سجلات وكشوف الحضور"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">تصدير السجلات</span>
                </button>
              </>
            )}

            <button
              onClick={() => fetchAdminData()}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-lg flex items-center justify-center transition-all border border-slate-300 text-sky-600 active:scale-95"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* بطاقات الإحصائيات السريعة اليومية (KPI Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <button
            onClick={() => setActiveTab('team')}
            className="text-right bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl p-4 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-600 text-xs mb-2 font-semibold">
              <span>إجمالي الموظفين</span>
              <Users className="w-4 h-4 text-sky-600" />
            </div>
            <span className="text-2xl font-black text-slate-900">{summary.totalEmployees || 0}</span>
          </button>

          <button
            onClick={() => setActiveTab('live_activity')}
            className="text-right bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl p-4 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
          >
            <div className="flex items-center justify-between text-emerald-700 text-xs mb-2 font-semibold">
              <span>🟢 حاضر الآن</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-2xl font-black text-emerald-700">{summary.presentCount || 0}</span>
          </button>

          <button
            onClick={() => setActiveTab('live_activity')}
            className="text-right bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl p-4 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
          >
            <div className="flex items-center justify-between text-amber-700 text-xs mb-2 font-semibold">
              <span>🟡 متأخر</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-2xl font-black text-amber-700">{summary.lateCount || 0}</span>
          </button>

          <button
            onClick={() => setActiveTab('live_activity')}
            className="text-right bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl p-4 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
          >
            <div className="flex items-center justify-between text-red-700 text-xs mb-2 font-semibold">
              <span>🔴 غائب</span>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-2xl font-black text-red-700">{summary.absentCount || 0}</span>
          </button>

          <button
            onClick={() => setActiveTab('live_activity')}
            className="text-right bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl p-4 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
          >
            <div className="flex items-center justify-between text-orange-700 text-xs mb-2 font-semibold">
              <span>🟠 في استراحة</span>
              <Coffee className="w-4 h-4 text-orange-600" />
            </div>
            <span className="text-2xl font-black text-orange-700">{summary.onBreakCount || 0}</span>
          </button>

          <button
            onClick={() => setActiveTab('live_activity')}
            className="text-right bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl p-4 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
          >
            <div className="flex items-center justify-between text-rose-700 text-xs mb-2 font-semibold">
              <span>⚠️ محاولات مشبوهة</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-2xl font-black text-rose-700">{summary.suspiciousAttemptsCount || 0}</span>
          </button>
        </div>

        {/* شريط التبويبات الخمسة الموحدة */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('live_activity')}
            className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              activeTab === 'live_activity'
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>1. النشاط المباشر ⚡</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              activeTab === 'team'
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. فريق العمل 👥</span>
          </button>

          <button
            onClick={() => setActiveTab('structure')}
            className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              activeTab === 'structure'
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>3. الهيكل والمواعيد 🏢</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              activeTab === 'reports'
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>4. التقارير والمطابقة 📑</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              activeTab === 'settings'
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>5. الإعدادات المركزية ⚙️</span>
          </button>
        </div>

        {/* 1. النشاط المباشر (live_activity) */}
        {activeTab === 'live_activity' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm dark:shadow-xl backdrop-blur-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    آخر عمليات الحضور والانصراف المسجلة
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">مباشر ⚡</span>
                </h3>

                <div className="space-y-3">
                  {dashData?.recentEvents?.map((evt: any) => (
                    <div
                      key={evt.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-300 dark:hover:border-slate-700/80 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            evt.type === 'CHECK_IN'
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : evt.type === 'CHECK_OUT'
                              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                              : 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                          }`}
                        >
                          {evt.type === 'CHECK_IN' ? 'حضر' : evt.type === 'CHECK_OUT' ? 'خرج' : 'استراحة'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {evt.employee?.firstName} {evt.employee?.lastName}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {evt.branch?.name || 'الفرع الرئيسي'} • المسافة:{' '}
                            {evt.distanceFromBranch ? `${Math.round(evt.distanceFromBranch)}m` : '0m'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400 font-bold">
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
              <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm dark:shadow-xl backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>جدول الحضور والغياب اللحظي اليوم</span>
                  </h3>
                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute top-2.5 right-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="بحث سريع..."
                      className="w-full pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold sticky top-0 bg-slate-100/90 dark:bg-slate-950">
                        <th className="p-2.5">الموظف</th>
                        <th className="p-2.5">حضر</th>
                        <th className="p-2.5">انصرف</th>
                        <th className="p-2.5">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                      {filteredLive.slice(0, 15).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">{item.name}</td>
                          <td className="p-2.5 font-mono text-emerald-600 dark:text-emerald-400">{item.checkInTime}</td>
                          <td className="p-2.5 font-mono text-rose-600 dark:text-rose-400">{item.checkOutTime}</td>
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
            <div className="bg-white dark:bg-slate-900/80 border border-rose-500/30 rounded-3xl p-5 space-y-4 shadow-sm dark:shadow-xl backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    <span>تقرير المحاولات المشبوهة وخروقات الموقع الجغرافي (Suspicious Audit Log)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    رصد تفصيلي لجميع محاولات التبصيم من أجهزة غير معتمدة أو خارج النطاق الجغرافي المحدد للفروع.
                  </p>
                </div>
                <span className="px-3 py-1 bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl border border-rose-500/30">
                  المحاولات المحظورة: {dashData?.suspiciousAttempts?.length || 0}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-100/90 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">الموظف</th>
                      <th className="p-3">السبب والتشخيص</th>
                      <th className="p-3">مستوى الخطورة</th>
                      <th className="p-3">ملاحظات دقة GPS</th>
                      <th className="p-3">الإجراء المتخذ</th>
                      <th className="p-3">التوقيت والتاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                    {dashData?.suspiciousAttempts?.length > 0 ? (
                      dashData.suspiciousAttempts.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            <div>
                              <span>{item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : 'غير معروف'}</span>
                              <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                #{item.employee?.employeeNumber || item.employeeId || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-rose-600 dark:text-rose-300 font-medium">
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
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
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40'
                                  : item.riskLevel === 'MEDIUM'
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {item.riskLevel === 'HIGH' ? '⚠️ عالي الخطورة' : item.riskLevel === 'MEDIUM' ? '⚡ متوسط' : item.riskLevel}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {item.latitude && item.longitude ? (
                              <div>
                                <span className="text-sky-600 dark:text-sky-400">
                                  Lat: {Number(item.latitude).toFixed(4)} | Lng: {Number(item.longitude).toFixed(4)}
                                </span>
                                <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                                  الدقة: {Math.round(item.accuracy || 0)}m
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">غ/م</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="px-2.5 py-1 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-bold rounded-xl text-[10px] border border-red-500/30">
                              🛡️ حظر التبصيم (BLOCKED)
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {new Date(item.createdAt || item.timestamp).toLocaleString('ar-EG', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
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
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-sm dark:shadow-xl backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute top-3 right-3" />
                <input
                  type="text"
                  value={empSearchQuery}
                  onChange={(e) => setEmpSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الموظف، الرقم الوظيفي، أو البريد الإلكتروني..."
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/admin/devices')}
                  className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700/80"
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
                      className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
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
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold bg-slate-100/90 dark:bg-slate-950/60">
                    <th className="p-3">رقم الموظف</th>
                    <th className="p-3">الاسم والوظيفة</th>
                    <th className="p-3">البريد الإلكتروني</th>
                    <th className="p-3">الفرع الرئيسي</th>
                    <th className="p-3">الدور (Role)</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-sky-600 dark:text-sky-400">{emp.employeeNumber}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{emp.jobTitle || 'موظف'}</div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">{emp.user?.email}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{emp.primaryBranch?.name || 'الفرع الرئيسي'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400 font-mono font-bold text-[10px] rounded-lg border border-sky-500/30">
                          {emp.user?.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                            emp.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                          }`}
                        >
                          {emp.status === 'ACTIVE' ? '🟢 مفعّل' : '🔴 معطّل'}
                        </span>
                      </td>
                      <td className="p-3 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedEmployeeForEdit(emp)}
                            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-400 rounded-lg text-xs"
                            title="تعديل الموظف"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDisableEmployee(emp.id, emp.status)}
                            className={`p-1.5 rounded-lg text-xs ${
                              emp.status === 'ACTIVE'
                                ? 'bg-red-500/10 dark:bg-red-500/20 hover:bg-red-500/20 dark:hover:bg-red-500/30 text-red-600 dark:text-red-400'
                                : 'bg-emerald-500/10 dark:bg-emerald-500/20 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400'
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
            <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-sm dark:shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">إدارة الورديات ومواعيد العمل</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">تحديد مواعيد الورديات الثابتة والمرنة ورسوم الحضور</p>
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

            <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-sm dark:shadow-xl backdrop-blur-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">إدارة وتعديل موقع الفرع ونطاق الحضور الجغرافي (Geofence)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashData?.branches?.map((branch: any) => (
                  <div key={branch.id} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{branch.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{branch.address || 'العنوان غير محدد'}</p>
                      <div className="text-[10px] text-sky-600 dark:text-sky-400 font-mono mt-1">Lat: {branch.latitude} | Lng: {branch.longitude}</div>
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

        {/* 4. التقارير والمطابقة وكشوفات الرواتب (reports) */}
        {activeTab === 'reports' && (
          <PayrollReportsTab
            branches={dashData?.branches || []}
            employees={employeesList}
          />
        )}

        {/* 5. الإعدادات المركزية وسياسات الجغرافيا والأجهزة (settings) */}
        {activeTab === 'settings' && (
          <SystemSettingsTab />
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
