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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">تقديم طلب إجازة</h3>
              <p className="text-xs text-slate-400">إرسال الطلب للمراجعة والموافقة من الإدارة</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Leave Balance Banner */}
          {balances && (
            <div className="p-3 bg-sky-950/60 border border-sky-500/30 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">الرصيد المتبقي لك:</span>
              <span className="font-bold text-sky-400">
                {balances.annualRemaining} يوم سنوي | {balances.sickRemaining} يوم مرضي
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-300 mb-1">نوع الإجازة</label>
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-bold"
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
              <label className="block font-bold text-slate-300 mb-1">من تاريخ</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">إلى تاريخ</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">سبب الإجازة والملاحظات *</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب سبب طلب الإجازة باختصار..."
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none placeholder-slate-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/20 active:scale-95 disabled:opacity-50"
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
