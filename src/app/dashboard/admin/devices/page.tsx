'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Unlock,
  Ban,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  Monitor,
} from 'lucide-react';

export default function AdminTrustedDevicesPage() {
  const [trustedDevices, setTrustedDevices] = useState<any[]>([]);
  const [unboundEmployees, setUnboundEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/devices');
      if (res.ok) {
        const data = await res.json();
        setTrustedDevices(data.trustedDevices || []);
        setUnboundEmployees(data.employeesWithoutDevice || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResetDevice = async (deviceId: string, employeeName: string) => {
    if (!confirm(`هل أنت تأكد من فك اقتران هاتف الموظف (${employeeName})؟ ستمكنه هذه العملية من اقتران هاتفه الجديد عند التبصيم القادم.`)) {
      return;
    }

    setActionLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/admin/devices/${deviceId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMsg({ text: data.error || 'فشلت عملية فك الاقتران', type: 'error' });
      } else {
        setStatusMsg({ text: data.message || 'تم فك اقتران الجهاز بنجاح 🟢', type: 'success' });
        await fetchData();
      }
    } catch (err) {
      setStatusMsg({ text: 'حدث خطأ بالاتصال أثناء فك اقتران الجهاز', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleApproval = async (deviceId: string, currentApproved: boolean) => {
    setActionLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/admin/devices/${deviceId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_APPROVAL' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMsg({ text: data.error || 'فشلت عملية تعديل الاعتماد', type: 'error' });
      } else {
        setStatusMsg({ text: data.message || 'تمت العملية بنجاح 🟢', type: 'success' });
        await fetchData();
      }
    } catch (err) {
      setStatusMsg({ text: 'حدث خطأ بالاتصال أثناء تعديل الاعتماد', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredDevices = trustedDevices.filter((dev) => {
    const empName = `${dev.employee?.firstName} ${dev.employee?.lastName}`.toLowerCase();
    const empNum = dev.employee?.employeeNumber || '';
    const devName = (dev.deviceName || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    return empName.includes(search) || empNum.includes(search) || devName.includes(search);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900 dir-rtl">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
          <p className="text-xs text-slate-500">جاري تحميل واجهة أجهزة الموظفين الموثوقة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col dir-rtl">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* العنوان والترويسة */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-sky-600">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">اعتماد وتقييد أجهزة الموظفين المقترنة</h1>
              <p className="text-xs text-slate-500 mt-1">
                منع التبصيم من أي هاتف آخر والتحكم في اقتران أجهزة الموظفين (Trusted Device Lock)
              </p>
            </div>
          </div>
        </div>

        {/* تنبيه الحالة */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs font-medium flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* بطاقات المؤشرات السريعة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>الأجهزة المعتمدة والمقترنة</span>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{trustedDevices.filter((d) => d.isApproved).length}</div>
            <p className="text-[10px] text-slate-500">هواتف موثوقة تعمل بدون عوائق</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>الأجهزة المحظورة</span>
              <ShieldAlert className="w-5 h-5 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600">
              {trustedDevices.filter((d) => !d.isApproved).length}
            </div>
            <p className="text-[10px] text-slate-500">هواتف تم حظرها من التبصيم</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>موظفون ينظرون الاقتران الأول</span>
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600">{unboundEmployees.length}</div>
            <p className="text-[10px] text-slate-500">سيقترن هاتفهم تلقائياً عند أول تبصيم</p>
          </div>
        </div>

        {/* شاشة الأجهزة المقترنة */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-600" />
                <span>قائمة هواتف الموظفين المقترنة بـ Basma</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                يمكنك إعادة ضبط أو فك اقتران الجهاز لمنح الموظف إمكانية اقتران هاتف جديد عند الاستبدال
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute top-3.5 right-3.5" />
              <input
                type="text"
                placeholder="ابحث باسم الموظف، الرقم الوظيفي..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* جدول أجهزة الموظفين */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">الموظف</th>
                  <th className="p-4">الفرع والقسم</th>
                  <th className="p-4">تفاصيل الهاتف والنظام</th>
                  <th className="p-4">آخر استخدام</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">الإجراءات والتحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      لا توجد أجهزة موثوقة مطابقة للبحث حالياً.
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((dev) => {
                    const emp = dev.employee;
                    const lastSeen = new Date(dev.lastSeenAt).toLocaleString('ar-EG', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    });

                    return (
                      <tr key={dev.id} className="hover:bg-slate-50 transition-all">
                        <td className="p-4">
                          <div className="font-bold text-slate-900">
                            {emp?.firstName} {emp?.lastName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{emp?.employeeNumber}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-800 font-medium">{emp?.primaryBranch?.name || 'الفرع الرئيسي'}</div>
                          <div className="text-[10px] text-slate-500">{emp?.department?.name || 'غير محدد'}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-sky-700 flex items-center gap-1.5">
                            <Monitor className="w-3.5 h-3.5 text-sky-600" />
                            <span>{dev.deviceName || 'هاتف محمول'}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dir-ltr text-right font-mono">
                            {dev.os} | {dev.browser}
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 text-[11px] font-mono">{lastSeen}</td>
                        <td className="p-4">
                          {dev.isApproved ? (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[11px] flex items-center gap-1 w-fit">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>معتمد ومقترن</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[11px] flex items-center gap-1 w-fit">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                              <span>محظور</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleResetDevice(dev.id, `${emp?.firstName} ${emp?.lastName}`)}
                              disabled={actionLoading}
                              title="فك اقتران الجهاز لتمكين الموظف من ربط هاتف جديد"
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              <Unlock className="w-3.5 h-3.5 text-amber-600" />
                              <span>فك الاقتران (اعادة ضبط)</span>
                            </button>

                            <button
                              onClick={() => handleToggleApproval(dev.id, dev.isApproved)}
                              disabled={actionLoading}
                              title={dev.isApproved ? 'حظر هذا الجهاز' : 'إلغاء حظر الجهاز'}
                              className={`p-1.5 rounded-xl border text-[11px] font-bold transition-all disabled:opacity-50 ${
                                dev.isApproved
                                  ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                              }`}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
