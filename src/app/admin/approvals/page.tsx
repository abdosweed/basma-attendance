'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Smartphone,
  Edit3,
  Filter,
  RefreshCw,
  Search,
  Building,
  User,
  AlertCircle,
  Check,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface ApprovalItem {
  id: string;
  category: 'LEAVE' | 'HOURLY_PERMISSION' | 'CORRECTION' | 'DEVICE';
  employeeName: string;
  employeeId: string;
  avatarUrl?: string;
  jobTitle: string;
  branchName: string;
  departmentName: string;
  typeLabel: string;
  details: string;
  reason?: string;
  createdAt: string;
}

export default function AdminApprovalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, leave: 0, hourlyPermission: 0, correction: 0, device: 0 });
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'LEAVE' | 'HOURLY_PERMISSION' | 'CORRECTION' | 'DEVICE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // حالة مودال الرفض مع كتابة السبب
  const [rejectModalItem, setRejectModalItem] = useState<ApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchApprovals = async () => {
    setLoading(true);
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

      const res = await fetch('/api/admin/approvals');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setCounts(data.counts || { total: 0, leave: 0, hourlyPermission: 0, correction: 0, device: 0 });
      }
    } catch (err) {
      console.error('Error loading approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  // القرار المباشر (قبول أو رفض)
  const handleDecision = async (item: ApprovalItem, action: 'APPROVED' | 'REJECTED', reasonNote?: string) => {
    setProcessingId(item.id);

    // Optimistic UI Update: إخفاء البطاقة فوراً لتجربة سلسة وخدمة متفائلة
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setCounts((prev) => {
      const next = { ...prev, total: Math.max(0, prev.total - 1) };
      if (item.category === 'LEAVE') next.leave = Math.max(0, next.leave - 1);
      if (item.category === 'HOURLY_PERMISSION') next.hourlyPermission = Math.max(0, next.hourlyPermission - 1);
      if (item.category === 'CORRECTION') next.correction = Math.max(0, next.correction - 1);
      if (item.category === 'DEVICE') next.device = Math.max(0, next.device - 1);
      return next;
    });

    try {
      const res = await fetch('/api/admin/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          category: item.category,
          action,
          actionReason: reasonNote || undefined,
        }),
      });

      if (!res.ok) {
        // إعادة تحميل البيانات في حال فشل السيرفر
        fetchApprovals();
      }
    } catch (err) {
      fetchApprovals();
    } finally {
      setProcessingId(null);
      setRejectModalItem(null);
      setRejectReason('');
    }
  };

  // تصفية الطلبات المعروضة
  const filteredItems = items.filter((item) => {
    const matchesFilter = activeFilter === 'ALL' || item.category === activeFilter;
    const matchesSearch =
      item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.branchName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 pb-20">
      <Navbar user={user} />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* ترويسة المركز */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl backdrop-blur-md shadow-sm dark:shadow-2xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg shadow-sky-500/20 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                مركز الاعتماد السريع للمدير
                {counts.total > 0 && (
                  <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs px-2.5 py-0.5 rounded-full border border-rose-500/20 font-bold animate-pulse">
                    {counts.total} طلب معلق
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">اتخاذ القرارات المباشرة على طلبات الإجازات والاستئذان والتصحيح والأجهزة</p>
            </div>
          </div>

          <button
            onClick={fetchApprovals}
            disabled={loading}
            className="self-start sm:self-auto px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-2xl flex items-center gap-2 transition-all border border-slate-200 dark:border-slate-700/80"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث البيانات</span>
          </button>
        </div>

        {/* شريط الفلترة والأبحاث السريعة */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all border ${
                activeFilter === 'ALL'
                  ? 'bg-sky-600 text-white border-sky-400 shadow-md'
                  : 'bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>الكل</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {counts.total}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('LEAVE')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all border ${
                activeFilter === 'LEAVE'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                  : 'bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>الإجازات 📅</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeFilter === 'LEAVE' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {counts.leave}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('HOURLY_PERMISSION')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all border ${
                activeFilter === 'HOURLY_PERMISSION'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                  : 'bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>الاستئذان الساعي ⏱️</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeFilter === 'HOURLY_PERMISSION' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {counts.hourlyPermission}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('CORRECTION')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all border ${
                activeFilter === 'CORRECTION'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                  : 'bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>تصحيح البصمة ✍️</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeFilter === 'CORRECTION' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {counts.correction}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('DEVICE')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all border ${
                activeFilter === 'DEVICE'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                  : 'bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>اعتماد الأجهزة 📱</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeFilter === 'DEVICE' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {counts.device}
              </span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث باسم الموظف أو الفرع أو نوع الطلب..."
              className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        {/* قائمة الطلبات بنظام البطاقات المتجاوبة Mobile Card Feed */}
        {loading ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-3xl space-y-3">
            <RefreshCw className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">جاري جلب الطلبات المعلقة...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-3xl space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-80" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">لا توجد طلبات معلقة حالياً!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">تم الانتهاء من مراجعة واعتماد جميع الطلبات بنجاح 🎉</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/80 p-5 rounded-3xl shadow-sm dark:shadow-xl flex flex-col justify-between transition-all space-y-4 animate-in fade-in duration-200"
              >
                {/* رأس البطاقة: بيانات الموظف والنوع */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700/60 text-sm overflow-hidden">
                      {item.avatarUrl ? (
                        <img src={item.avatarUrl} alt={item.employeeName} className="w-full h-full object-cover" />
                      ) : (
                        item.employeeName.charAt(0)
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{item.employeeName}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          {item.branchName}
                        </span>
                        <span>•</span>
                        <span>{item.departmentName}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold shrink-0 border ${
                      item.category === 'LEAVE'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                        : item.category === 'HOURLY_PERMISSION'
                        ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20'
                        : item.category === 'CORRECTION'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20'
                    }`}
                  >
                    {item.typeLabel}
                  </span>
                </div>

                {/* تفاصيل الطلب والملاحظة */}
                <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-bold">
                    <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>{item.details}</span>
                  </div>

                  {item.reason && (
                    <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-800/60 pt-2">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{item.reason}</span>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 font-mono text-left pt-1">
                    مقدم بتاريخ: {new Date(item.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>

                {/* أزرار اتخاذ القرار الفوري */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleDecision(item, 'APPROVED')}
                    disabled={processingId === item.id}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {processingId === item.id ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>قبول فوري</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setRejectModalItem(item)}
                    disabled={processingId === item.id}
                    className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-rose-500/20 active:scale-95 transition-all"
                  >
                    <X className="w-4 h-4" />
                    <span>رفض</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* نافذة الرفض المنبثقة لكتابة السبب */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                رفض طلب {rejectModalItem.employeeName}
              </h3>
              <button onClick={() => setRejectModalItem(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">سبب الرفض (ملاحظة للموظف) *</label>
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="اكتب سبب الرفض بوضوح ليتم إرساله في الإشعار..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setRejectModalItem(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl">
                إلغاء
              </button>
              <button
                onClick={() => handleDecision(rejectModalItem, 'REJECTED', rejectReason)}
                disabled={!rejectReason.trim()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                تأكيد الرفض والإشعار
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
