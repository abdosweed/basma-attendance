'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LeaveRequestModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function LeaveRequestModal({ onClose, onSuccess }: LeaveRequestModalProps) {
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [leaveTypes, setLeaveTypes] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [balances, setBalances] = useState<{ annualRemaining: number; sickRemaining: number } | null>(null);

  useEffect(() => {
    // جلب أنواع الإجازات وأرصدة الإجازات من السيرفر
    async function loadTypes() {
      try {
        const res = await fetch('/api/leave-requests');
        if (res.ok) {
          const data = await res.json();
          if (data.leaveTypes && data.leaveTypes.length > 0) {
            setLeaveTypes(data.leaveTypes);
            setLeaveTypeId(data.leaveTypes[0].id);
          }
          if (data.balances) {
            setBalances(data.balances);
          }
        }
      } catch (e) {}
    }
    loadTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!startDate || !endDate || !reason.trim()) {
      setErrorMsg('يرجى تحديد تواريخ الإجازة وكتابة السبب بشكل واضح.');
      return;
    }

    // التحقق من تجاوز الأيام المتاحة ما لم تكن بدون مرتب
    const start = new Date(startDate);
    const end = new Date(endDate);
    const requestedDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const selectedType = leaveTypes.find((t) => t.id === leaveTypeId);

    if (selectedType && selectedType.code !== 'UNPAID' && !selectedType.name.includes('بدون مرتب')) {
      if (selectedType.code === 'ANNUAL' || selectedType.name.includes('سنوية')) {
        if (balances && requestedDays > balances.annualRemaining) {
          setErrorMsg(`طلبك (${requestedDays} أيام) يتجاوز رصيدك السنوي المتبقي (${balances.annualRemaining} يوم). يمكنك تقديم إجازة بدون مرتب.`);
          return;
        }
      } else if (selectedType.code === 'SICK' || selectedType.name.includes('مرضية')) {
        if (balances && requestedDays > balances.sickRemaining) {
          setErrorMsg(`طلبك (${requestedDays} أيام) يتجاوز رصيدك المرضي المتبقي (${balances.sickRemaining} يوم).`);
          return;
        }
      }
    }

    setSaving(true);

    try {
      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveTypeId: leaveTypeId || undefined,
          startDate,
          endDate,
          reason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'فشل إرسال طلب الإجازة');
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setErrorMsg('حدث خطأ بالاتصال بالسيرفر أثناء تقديم الطلب.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">تقديم طلب إجازة</h3>
              <p className="text-xs text-slate-500">إرسال الطلب للمراجعة والموافقة من الإدارة</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Leave Balance Banner */}
          {balances && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium">الرصيد المتبقي لك:</span>
              <span className="font-bold text-sky-700">
                {balances.annualRemaining} يوم سنوي | {balances.sickRemaining} يوم مرضي
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-800 font-bold text-xs mb-1.5">نوع الإجازة</label>
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none"
            >
              {leaveTypes.length > 0 ? (
                leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.code})
                  </option>
                ))
              ) : (
                <>
                  <option value="ANNUAL">🌴 إجازة سنوية (Annual)</option>
                  <option value="SICK">🏥 إجازة مرضية (Sick)</option>
                  <option value="EMERGENCY">⚡ إجازة اضطرارية (Emergency)</option>
                  <option value="UNPAID">📄 إجازة بدون مرتب (Unpaid)</option>
                </>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-800 font-bold text-xs mb-1.5">من تاريخ</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-800 font-bold text-xs mb-1.5">إلى تاريخ</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-800 font-bold text-xs mb-1.5">سبب الإجازة والملاحظات *</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب سبب طلب الإجازة باختصار..."
              className="w-full p-3 bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-lg text-sm placeholder:text-slate-400 focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-lg border border-slate-200 transition-colors text-sm">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>إرسال الطلب</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
