'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Smartphone,
  User,
  Settings,
  AlertCircle,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  Database,
  Globe,
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  details?: any;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    role: string;
    employee?: {
      firstName: string;
      lastName: string;
      employeeNumber: string;
      avatarUrl?: string;
    } | null;
  };
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeActionFilter, setActiveActionFilter] = useState('ALL');
  const [activeEntityFilter, setActiveEntityFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (activeActionFilter !== 'ALL') params.append('action', activeActionFilter);
      if (activeEntityFilter !== 'ALL') params.append('entity', activeEntityFilter);

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeActionFilter, activeEntityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('APPROV') || act === 'CREATE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {action}
        </span>
      );
    }
    if (act.includes('REJECT') || act.includes('DELETE') || act.includes('UNBIND')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
          <XCircle className="w-3.5 h-3.5" />
          {action}
        </span>
      );
    }
    if (act.includes('SHIFT') || act.includes('UPDATE')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
          <Clock className="w-3.5 h-3.5" />
          {action}
        </span>
      );
    }
    if (act.includes('DEVICE')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
          <Smartphone className="w-3.5 h-3.5" />
          {action}
        </span>
      );
    }
    if (act.includes('SYNC')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
          <RefreshCw className="w-3.5 h-3.5" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
        <Settings className="w-3.5 h-3.5" />
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ترويسة سجل التدقيق */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-800 text-amber-400 flex items-center justify-center font-bold shadow-lg shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              سجل التدقيق الإداري الشامل (Admin Audit Trail)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              تتبع زمني مشدد لكافة العمليات الإدارية، تغييرات النظام، واعتمادات الحضور
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center gap-2 transition-all border border-slate-200 dark:border-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث السجل
        </button>
      </div>

      {/* الفلاتر والبحث */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، نوع الإجراء، أو الكيان المستهدف..."
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-2xl shadow-md transition-colors shrink-0"
          >
            بحث
          </button>
        </form>

        {/* أزرار تصفية الإجراءات */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0 ml-2">
            <Filter className="w-3.5 h-3.5" /> الفلتر:
          </span>
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'APPROVED', label: 'الموافقات ✅' },
            { id: 'REJECTED', label: 'الرفض ❌' },
            { id: 'SHIFT_UPDATE', label: 'الورديات ⏱️' },
            { id: 'DEVICE_BIND', label: 'ربط الأجهزة 📱' },
            { id: 'OFFLINE_SYNC', label: 'المزامنة 🔄' },
            { id: 'SYSTEM_SETTING', label: 'إعدادات النظام ⚙️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveActionFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeActionFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* التغذية الزمنية (Timeline Feed) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">جاري تحميل سجل التدقيق الأمن المحصن...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد سجلات تدقيق تطابق معايير البحث الحالية</p>
          </div>
        ) : (
          <div className="relative border-r-2 border-slate-200 dark:border-slate-800 mr-4 space-y-6 pr-6">
            {logs.map((log) => {
              const adminName = log.user?.employee
                ? `${log.user.employee.firstName} ${log.user.employee.lastName}`
                : log.user?.email || 'النظام الإداري';
              const isExpanded = expandedId === log.id;

              return (
                <div key={log.id} className="relative group">
                  {/* عقدة الجدول الزمني */}
                  <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full bg-amber-500 ring-4 ring-white dark:ring-slate-900 shadow-md" />

                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 transition-all hover:border-amber-500/40 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 text-xs font-bold">
                          <User className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">{adminName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                              {log.user?.role || 'ADMIN'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>الكيان: <strong className="text-slate-700 dark:text-slate-300">{log.entity}</strong></span>
                            {log.ipAddress && (
                              <span className="flex items-center gap-1 dir-ltr">
                                <Globe className="w-3 h-3 text-slate-400" />
                                {log.ipAddress}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {getActionBadge(log.action)}
                        <span className="text-[11px] text-slate-400 font-medium dir-ltr">
                          {new Date(log.createdAt).toLocaleString('ar-LY', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* السبب أو التوضيح */}
                    {log.reason && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium">
                        <strong>الملاحظة / السبب:</strong> {log.reason}
                      </div>
                    )}

                    {/* التفاصيل القابلة للتوسيع */}
                    {(log.details || log.oldValue || log.newValue) && (
                      <div>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 pt-1"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {isExpanded ? 'إخفاء الفروقات والتفاصيل الفنية' : 'عرض التفاصيل والبيانات التقنية'}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-xl overflow-x-auto space-y-2 border border-slate-800">
                            {log.details && (
                              <div>
                                <span className="text-amber-400 font-bold">// التفاصيل الفنية (Details):</span>
                                <pre className="mt-1 dir-ltr">{JSON.stringify(log.details, null, 2)}</pre>
                              </div>
                            )}
                            {log.oldValue && (
                              <div>
                                <span className="text-rose-400 font-bold">// القيمة السابقة (Old Value):</span>
                                <pre className="mt-1 dir-ltr">{log.oldValue}</pre>
                              </div>
                            )}
                            {log.newValue && (
                              <div>
                                <span className="text-emerald-400 font-bold">// القيمة الجديدة (New Value):</span>
                                <pre className="mt-1 dir-ltr">{log.newValue}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
