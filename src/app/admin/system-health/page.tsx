'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  Activity,
  Database,
  Server,
  ShieldCheck,
  Smartphone,
  MapPin,
  Bell,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lock,
  Clock,
  Layers,
  FileCheck,
  ExternalLink,
  Info,
  Key,
} from 'lucide-react';

export default function SystemHealthPage() {
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);

  const [envMode, setEnvMode] = useState<'DEMO' | 'LIVE'>('DEMO');
  const [resetLoading, setResetLoading] = useState(false);

  const fetchUserAndHealth = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const userRes = await fetch('/api/auth/me');
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user || userData);
      }

      const healthRes = await fetch('/api/admin/system-health');
      if (healthRes.status === 403) {
        setErrorMsg('غير مصرح لك بالوصول لهذه الصفحة (تطلب صلاحيات الإدارة)');
        setLoading(false);
        return;
      }
      if (!healthRes.ok) {
        setErrorMsg('فشل استدعاء بيانات فحص صحة المنظومة');
        setLoading(false);
        return;
      }

      const data = await healthRes.json();
      setReport(data);
      setLastRefreshed(new Date().toLocaleTimeString('ar-SA'));

      const envRes = await fetch('/api/admin/environment-switch');
      if (envRes.ok) {
        const envData = await envRes.json();
        if (envData.environmentMode) setEnvMode(envData.environmentMode);
      }
    } catch (err) {
      setErrorMsg('حدث خطأ في الاتصال بالخادم');
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
        fetchUserAndHealth();
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
        fetchUserAndHealth();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndHealth();
  }, []);

  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      fetchUserAndHealth();
    }, 45000); // تحديث آلي كل 45 ثانية
    return () => clearInterval(interval);
  }, [isAutoRefresh]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            سليم (HEALTHY)
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            مستقر جزئياً (DEGRADED)
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            عطل حرج (ERROR)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <HelpCircle className="w-3.5 h-3.5" />
            غير مؤكد (UNKNOWN)
          </span>
        );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'DATABASE':
        return <Database className="w-4 h-4 text-sky-400" />;
      case 'INFRASTRUCTURE':
        return <Server className="w-4 h-4 text-cyan-400" />;
      case 'REALTIME':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'DEVICES':
        return <Smartphone className="w-4 h-4 text-purple-400" />;
      case 'LOCATION':
        return <MapPin className="w-4 h-4 text-amber-400" />;
      case 'NOTIFICATIONS':
        return <Bell className="w-4 h-4 text-blue-400" />;
      case 'SECURITY':
        return <ShieldCheck className="w-4 h-4 text-rose-400" />;
      case 'OTP':
        return <Key className="w-4 h-4 text-indigo-400" />;
      case 'BACKUP':
        return <Layers className="w-4 h-4 text-yellow-400" />;
      default:
        return <FileCheck className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  صحة المنظومة التشغيلية
                  <span className="text-xs bg-slate-800 text-sky-400 px-2 py-0.5 rounded-full font-mono border border-slate-700">
                    v1.7.0
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  لوحة المراقبة التشخيصية والاعتمادية المركزية (System Health & Operations Dashboard)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {['SUPER_ADMIN', 'ADMIN'].includes(user?.role) && (
              <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800">
                <button
                  onClick={handleToggleEnvMode}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                    envMode === 'LIVE'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{envMode === 'LIVE' ? 'وضع حقيقي 🟢' : 'بيئة تجريبية 🧪'}</span>
                </button>

                <button
                  onClick={handleResetDemoData}
                  disabled={resetLoading}
                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{resetLoading ? 'تصفير...' : 'تصفير الاختبار'}</span>
                </button>
              </div>
            )}

            <button
              onClick={() => fetchUserAndHealth()}
              disabled={loading}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-sky-600/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              تحديث الآن
            </button>
            <div className="text-right text-[11px] text-slate-400 border-r border-slate-800 pr-3 hidden sm:block">
              <div>آخر تحديث: <span className="font-semibold text-slate-200">{lastRefreshed || '--:--'}</span></div>
              <label className="flex items-center gap-1.5 cursor-pointer mt-0.5">
                <input
                  type="checkbox"
                  checked={isAutoRefresh}
                  onChange={(e) => setIsAutoRefresh(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
                />
                تحديث آلي (45s)
              </label>
            </div>
          </div>
        </div>

        {/* Error Guard View */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
            <Lock className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">{errorMsg}</p>
              <p className="text-xs text-rose-300/80 mt-0.5">
                تطلب هذه الصفحة تسجيل الدخول بحساب مسؤول (SUPER_ADMIN / ADMIN / HR).
              </p>
            </div>
          </div>
        )}

        {/* Critical Incident Banner */}
        {report?.hasCriticalIncident && (
          <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-600 text-rose-200 shadow-2xl animate-pulse flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base text-rose-100 mb-0.5">تنبيه حرج بالمنظومة!</h3>
              <p className="text-xs text-rose-200 leading-relaxed">{report.criticalIncidentMessage}</p>
            </div>
          </div>
        )}

        {/* System Summary KPI Dashboard */}
        {report && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Score Metric Card */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">مؤشر الصحة العام</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-white font-mono">{report.score}</span>
                    <span className="text-xs text-slate-500 font-semibold">/ 100</span>
                  </div>
                  <div className="w-28 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full ${
                        report.score >= 85 ? 'bg-emerald-400' : report.score >= 60 ? 'bg-amber-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${report.score}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">{getStatusBadge(report.overallStatus)}</div>
              </div>

              {/* Checked In Employees */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-xs text-slate-400 font-medium">الموظفون المتواجدون حالياً</span>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                  {report.summary.totalCheckedIn}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  خارج النطاق: <span className="text-amber-400 font-bold">{report.summary.outsideGeofenceCount}</span> | عدم تأكد: <span className="text-amber-400 font-bold">{report.summary.uncertainLocationCount}</span>
                </p>
              </div>

              {/* Pending Device Approvals */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-xs text-slate-400 font-medium">طلبات الأجهزة المعلقة</span>
                <div className="text-2xl font-black text-purple-400 font-mono mt-1">
                  {report.summary.pendingDeviceApprovals}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  تنتظر موافقة المسؤول من لوحة الأجهزة
                </p>
              </div>

              {/* Backup Verification Notice */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 bg-amber-500/5">
                <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> النسخ الاحتياطي (Backup)
                </span>
                <div className="text-sm font-bold text-amber-300 font-mono mt-1">
                  NOT VERIFIED
                </div>
                <p className="text-[10px] text-amber-400/80 mt-1">
                  في انتظار التوثيق في المرحلة 8 Phase 8
                </p>
              </div>
            </div>

            {/* Quick Actions Navigation Bar */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 border-y border-slate-800/80">
              <span className="text-xs font-bold text-slate-400 shrink-0 ml-2">روابط سريعة:</span>
              <a
                href="/admin/devices"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-1"
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                إدارة الأجهزة
              </a>
              <a
                href="/admin"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                المحاولات المشبوهة
              </a>
              <a
                href="/admin/shifts"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-1"
              >
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                الورديات
              </a>
              <a
                href="/admin/tasks"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-1"
              >
                <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                مهام الموظفين
              </a>
            </div>

            {/* Comprehensive Diagnostic Checks Grid */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-sky-400" />
                نتائج التشخيص الفني ومكونات المنظومة ({report.checks.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {report.checks.map((check: any) => (
                  <div
                    key={check.id}
                    className={`p-4 rounded-2xl bg-slate-900/90 border transition-all flex flex-col justify-between ${
                      check.status === 'ERROR'
                        ? 'border-rose-500/50 bg-rose-950/10'
                        : check.status === 'DEGRADED'
                        ? 'border-amber-500/40 bg-amber-950/10'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700/60">
                            {getCategoryIcon(check.category)}
                          </div>
                          <h3 className="font-bold text-xs text-white leading-tight">{check.name}</h3>
                        </div>
                        {getStatusBadge(check.status)}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed my-2">{check.message}</p>

                      {check.latencyMs !== undefined && (
                        <div className="text-[11px] text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded-lg border border-slate-800/80 inline-block mb-2">
                          استجابة الـ Latency: <span className="text-sky-400 font-bold">{check.latencyMs}ms</span>
                        </div>
                      )}
                    </div>

                    {/* Metadata Summary */}
                    {check.metadata && (
                      <div className="border-t border-slate-800/80 pt-2 mt-2 text-[10px] text-slate-400 space-y-1 font-mono">
                        {Object.entries(check.metadata).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between">
                            <span className="text-slate-500">{k}:</span>
                            <span className="text-slate-300 truncate max-w-[160px]">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Known Limitations Card */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Info className="w-4 h-4" />
                القيود التشغيلية المعروفة بالنظام (Known System Limitations)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.knownLimitations.map((lim: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-200">{lim.title}</span>
                      <span className="text-[9px] bg-slate-800 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-slate-700">
                        {lim.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{lim.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Environment Footer Information */}
            <div className="text-center text-xs text-slate-500 py-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                منظومة تطبيق البصمة الذكي — النسخة البرمجية <span className="font-mono text-slate-300">v1.7.0</span>
              </div>
              <div className="flex items-center gap-3">
                <span>الاستضافة: <strong className="text-slate-400">Vercel Serverless Edge</strong></span>
                <span>•</span>
                <span>قاعدة البيانات: <strong className="text-slate-400">Supabase Cloud PostgreSQL</strong></span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
