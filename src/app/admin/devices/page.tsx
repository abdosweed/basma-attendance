'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Ban,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  Monitor,
  ArrowRight,
  UserCheck,
  XCircle,
  FileText,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export default function AdminTrustedDevicesPage() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REVOKED' | 'BLOCKED'>('PENDING');
  const [trustedDevices, setTrustedDevices] = useState<any[]>([]);
  const [unboundEmployees, setUnboundEmployees] = useState<any[]>([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, revoked: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [modalType, setModalType] = useState<'APPROVE' | 'REJECT' | 'REVOKE' | 'BLOCK' | 'REPLACE' | null>(null);
  const [reviewNoteInput, setReviewNoteInput] = useState('');
  const [replacementInfo, setReplacementInfo] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/devices?status=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        setTrustedDevices(data.trustedDevices || []);
        setUnboundEmployees(data.employeesWithoutDevice || []);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paramStatus = params.get('status')?.toUpperCase();
      if (paramStatus && ['PENDING', 'APPROVED', 'REVOKED', 'BLOCKED'].includes(paramStatus)) {
        setActiveTab(paramStatus as any);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleDeviceAction = async (action: 'APPROVE' | 'REJECT' | 'REVOKE' | 'BLOCK' | 'REPLACE', forceApprove: boolean = false) => {
    if (!selectedDevice) return;

    setActionLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/admin/devices/${selectedDevice.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewNote: reviewNoteInput.trim() || undefined,
          forceApprove,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.requiresReplacement) {
        setReplacementInfo(data.existingApprovedDevice);
        setModalType('REPLACE');
        setActionLoading(false);
        return;
      }

      if (!res.ok) {
        setStatusMsg({ text: data.error || 'فشلت عملية تنفيذ الإجراء على الجهاز', type: 'error' });
      } else {
        setStatusMsg({ text: data.message || 'تمت العملية بنجاح 🟢', type: 'success' });
        closeModal();
        await fetchData();
      }
    } catch (err) {
      setStatusMsg({ text: 'حدث خطأ بالاتصال أثناء معالجة طلب الاعتماد', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedDevice(null);
    setModalType(null);
    setReviewNoteInput('');
    setReplacementInfo(null);
  };

  const filteredDevices = trustedDevices.filter((dev) => {
    const empName = `${dev.employee?.firstName} ${dev.employee?.lastName}`.toLowerCase();
    const empNum = dev.employee?.employeeNumber || '';
    const devName = (dev.deviceName || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    return empName.includes(search) || empNum.includes(search) || devName.includes(search);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 flex flex-col dir-rtl">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* الترويسة والعنوان الرئيسي */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <a
              href="/admin"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-sky-700 rounded-2xl border border-slate-200 transition-all active:scale-95 flex items-center justify-center shrink-0"
              title="العودة للوحة الإدارة الرئيسية"
            >
              <ArrowRight className="w-5 h-5" />
            </a>
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-sky-700">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">طلبات وإدارة أجهزة الموظفين الموثوقة</h1>
              <p className="text-xs text-slate-500 mt-1">
                مراجعة طلبات الاعتماد، موافقة الهواتف الجديدة، والتحكم في اقتران أجهزة التبصيم (Trusted Device Lock)
              </p>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 self-end sm:self-center"
          >
            <RefreshCw className={`w-4 h-4 text-sky-600 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث البيانات</span>
          </button>
        </div>

        {/* تنبيه حالة العمليات */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs font-medium flex items-center gap-2 shadow-sm transition-all ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* بطاقات المؤشرات السريعة */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setActiveTab('PENDING')}
            className={`cursor-pointer rounded-3xl p-5 space-y-2 border transition-all ${
              activeTab === 'PENDING'
                ? 'bg-amber-50 border-amber-300 shadow-md ring-1 ring-amber-400/20'
                : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>بانتظار الاعتماد</span>
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-3xl font-black text-amber-700">{counts.pending}</div>
            <p className="text-[10px] text-slate-500">طلبات تحتاج قرار من الإدارة</p>
          </div>

          <div
            onClick={() => setActiveTab('APPROVED')}
            className={`cursor-pointer rounded-3xl p-5 space-y-2 border transition-all ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-50 border-emerald-300 shadow-md ring-1 ring-emerald-400/20'
                : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>الأجهزة المعتمدة</span>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-emerald-700">{counts.approved}</div>
            <p className="text-[10px] text-slate-500">هواتف موثوقة مصرح لها</p>
          </div>

          <div
            onClick={() => setActiveTab('REVOKED')}
            className={`cursor-pointer rounded-3xl p-5 space-y-2 border transition-all ${
              activeTab === 'REVOKED'
                ? 'bg-rose-50 border-rose-300 shadow-md ring-1 ring-rose-400/20'
                : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>الأجهزة المرفوضة/الملغاة</span>
              <XCircle className="w-5 h-5 text-rose-600" />
            </div>
            <div className="text-3xl font-black text-rose-700">{counts.revoked}</div>
            <p className="text-[10px] text-slate-500">هواتف تم إلغاء صلاحيتها</p>
          </div>

          <div
            onClick={() => setActiveTab('BLOCKED')}
            className={`cursor-pointer rounded-3xl p-5 space-y-2 border transition-all ${
              activeTab === 'BLOCKED'
                ? 'bg-slate-100 border-slate-300 shadow-md'
                : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>الأجهزة المحظورة</span>
              <Ban className="w-5 h-5 text-slate-500" />
            </div>
            <div className="text-3xl font-black text-slate-800">{counts.blocked}</div>
            <p className="text-[10px] text-slate-500">هواتف ممنوعة كلياً</p>
          </div>
        </div>

        {/* التبويبات الفعالة */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              <button
                onClick={() => setActiveTab('PENDING')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'PENDING'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>طلبات بانتظار الاعتماد</span>
                {counts.pending > 0 && (
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px]">
                    {counts.pending}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('APPROVED')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'APPROVED'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>الأجهزة المعتمدة</span>
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full text-[10px]">
                  {counts.approved}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('REVOKED')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'REVOKED'
                    ? 'bg-rose-50 text-rose-800 border border-rose-200 shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>المرفوضة / الملغاة</span>
              </button>

              <button
                onClick={() => setActiveTab('BLOCKED')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'BLOCKED'
                    ? 'bg-slate-200 text-slate-900 border border-slate-300 shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Ban className="w-4 h-4" />
                <span>المحظورة</span>
              </button>
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

          {/* محتوى جدول أو كروت الأجهزة */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
              <p className="text-xs font-bold">جاري تحميل أجهزة الفلتر المحدد...</p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="p-12 text-center text-slate-500 border border-slate-200 rounded-2xl bg-slate-50">
              <Smartphone className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">لا توجد أجهزة ضمن هذا التبويب حالياً.</p>
              <p className="text-xs text-slate-500 mt-1">
                {activeTab === 'PENDING'
                  ? 'جميع طلبات الاعتماد الحالية تم إنجازها 🟢'
                  : 'يمكنك اختيار تبويب آخر لعرض الأجهزة المسجلة.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">الموظف والفرع</th>
                    <th className="p-4">تفاصيل الجهاز والنظام</th>
                    <th className="p-4">أول / آخر استخدام</th>
                    <th className="p-4">الحالة والملاحظات</th>
                    <th className="p-4 text-center">الإجراءات والقرار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredDevices.map((dev) => {
                    const emp = dev.employee;
                    const firstSeen = new Date(dev.createdAt || dev.firstSeenAt).toLocaleString('ar-EG', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    });
                    const lastSeen = new Date(dev.lastSeenAt).toLocaleString('ar-EG', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    });

                    return (
                      <tr key={dev.id} className="hover:bg-slate-50 transition-all">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {emp?.firstName} {emp?.lastName}
                          </div>
                          <div className="text-[11px] text-sky-700 font-mono mt-0.5">#{emp?.employeeNumber}</div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            {emp?.primaryBranch?.name || 'الفرع الرئيسي'} • {emp?.department?.name || 'غير محدد'}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Monitor className="w-4 h-4 text-sky-600" />
                            <span>{dev.deviceName || 'هاتف محمول'}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            المنصة: <span className="text-slate-700">{dev.platform || 'PWA'}</span> | OS:{' '}
                            <span className="text-slate-700">{dev.os || 'Unknown'}</span> | المتصفح:{' '}
                            <span className="text-slate-700">{dev.browser || 'Unknown'}</span>
                          </div>
                        </td>

                        <td className="p-4 text-[11px] text-slate-500 space-y-1">
                          <div>الطلب: <span className="text-slate-700">{firstSeen}</span></div>
                          <div>آخر استخدام: <span className="text-slate-700">{lastSeen}</span></div>
                        </td>

                        <td className="p-4">
                          {dev.status === 'PENDING' && (
                            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[11px] flex items-center gap-1 w-fit">
                              <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600" />
                              <span>بانتظار الاعتماد</span>
                            </span>
                          )}

                          {(dev.status === 'APPROVED' || dev.isApproved) && (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[11px] flex items-center gap-1 w-fit">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>معتمد ومقترن</span>
                            </span>
                          )}

                          {dev.status === 'REVOKED' && (
                            <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[11px] flex items-center gap-1 w-fit">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>ملغى / مرفوض</span>
                            </span>
                          )}

                          {dev.status === 'BLOCKED' && (
                            <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-bold text-[11px] flex items-center gap-1 w-fit">
                              <Ban className="w-3.5 h-3.5 text-slate-400" />
                              <span>محظور</span>
                            </span>
                          )}

                          {dev.reviewNote && (
                            <p className="text-[10px] text-slate-600 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                              💬 {dev.reviewNote}
                            </p>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {dev.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedDevice(dev);
                                    setModalType('APPROVE');
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>اعتماد الجهاز</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedDevice(dev);
                                    setModalType('REJECT');
                                  }}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>رفض</span>
                                </button>
                              </>
                            )}

                            {dev.status === 'APPROVED' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedDevice(dev);
                                    setModalType('REVOKE');
                                  }}
                                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>إلغاء الاعتماد</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedDevice(dev);
                                    setModalType('BLOCK');
                                  }}
                                  className="p-2 bg-slate-100 hover:bg-slate-200 text-rose-700 rounded-xl border border-slate-200 transition-all"
                                  title="حظر الجهاز نهائياً"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {(dev.status === 'REVOKED' || dev.status === 'BLOCKED') && (
                              <button
                                onClick={() => {
                                  setSelectedDevice(dev);
                                  setModalType('APPROVE');
                                }}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>إعادة الاعتماد</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal التأكيد والاعتماد والرفض */}
      {modalType && selectedDevice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 dir-rtl">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* عنوان المودال */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              {modalType === 'APPROVE' && <UserCheck className="w-6 h-6 text-emerald-600" />}
              {modalType === 'REJECT' && <XCircle className="w-6 h-6 text-rose-600" />}
              {modalType === 'REVOKE' && <RotateCcw className="w-6 h-6 text-amber-600" />}
              {modalType === 'BLOCK' && <Ban className="w-6 h-6 text-rose-600" />}
              {modalType === 'REPLACE' && <AlertTriangle className="w-6 h-6 text-amber-600 animate-bounce" />}

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {modalType === 'APPROVE' && 'تأكيد اعتماد الجهاز للموظف'}
                  {modalType === 'REJECT' && 'رفض طلب اعتماد الجهاز'}
                  {modalType === 'REVOKE' && 'إلغاء اعتماد الجهاز'}
                  {modalType === 'BLOCK' && 'حظر الجهاز نهائياً'}
                  {modalType === 'REPLACE' && 'استبدال الجهاز الرئيسي للموظف'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  الموظف: {selectedDevice.employee?.firstName} {selectedDevice.employee?.lastName} (#
                  {selectedDevice.employee?.employeeNumber})
                </p>
              </div>
            </div>

            {/* تفاصيل المودال والحالات */}
            <div className="space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">الجهاز المطلوب:</span>
                  <span className="font-bold text-sky-700">{selectedDevice.deviceName || 'هاتف محمول'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">نظام التشغيل:</span>
                  <span>{selectedDevice.os || 'غير محدد'} ({selectedDevice.platform || 'PWA'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">المتصفح:</span>
                  <span>{selectedDevice.browser || 'غير محدد'}</span>
                </div>
              </div>

              {/* تنبيه الاستبدال في حالة ONE_DEVICE_ONLY */}
              {modalType === 'REPLACE' && replacementInfo && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>الموظف لديه جهاز معتمد بالفعل!</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-800">
                    سياسة المنظومة تمكن جهازاً واحداً معتمداً فقط (`ONE_DEVICE_ONLY`). سيتم إلغاء اعتماد الجهاز القديم
                    تلقائياً واعتماد الجهاز الجديد كجهاز رئيسي في عملية واحدة.
                  </p>
                  <div className="bg-white p-3 rounded-xl border border-amber-200 text-xs text-slate-800">
                    الجهاز الحالي المقترن: <span className="font-bold text-slate-900">{replacementInfo.deviceName}</span>
                  </div>
                </div>
              )}

              {/* ملاحظات المراجعة الاختيارية */}
              {(modalType === 'REJECT' || modalType === 'REVOKE' || modalType === 'BLOCK') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-sky-600" />
                    <span>سبب أو ملاحظة الإدارة (اختياري):</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: الجهاز غير معروف، يرجى مراجعة إدارة تقنية المعلومات..."
                    value={reviewNoteInput}
                    onChange={(e) => setReviewNoteInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}
            </div>

            {/* أزرار الإجراءات في المودال */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all"
              >
                إلغاء
              </button>

              {modalType === 'APPROVE' && (
                <button
                  onClick={() => handleDeviceAction('APPROVE')}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>تأكيد الاعتماد</span>
                </button>
              )}

              {modalType === 'REPLACE' && (
                <button
                  onClick={() => handleDeviceAction('REPLACE', true)}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>استبدال الجهاز القديم بالجديد</span>
                </button>
              )}

              {modalType === 'REJECT' && (
                <button
                  onClick={() => handleDeviceAction('REJECT')}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  <span>تأكيد الرفض</span>
                </button>
              )}

              {modalType === 'REVOKE' && (
                <button
                  onClick={() => handleDeviceAction('REVOKE')}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>تأكيد إلغاء الاعتماد</span>
                </button>
              )}

              {modalType === 'BLOCK' && (
                <button
                  onClick={() => handleDeviceAction('BLOCK')}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  <span>تأكيد الحظر</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
