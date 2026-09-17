'use client';

import React, { useState } from 'react';
import { X, Clock, Send, AlertCircle, Coffee } from 'lucide-react';

interface HourlyPermissionModalProps {
  onClose: () => void;
  onSuccess: () => void;
  shiftStart?: string;
  shiftEnd?: string;
}

export default function HourlyPermissionModal({
  onClose,
  onSuccess,
  shiftStart = '08:00',
  shiftEnd = '16:00',
}: HourlyPermissionModalProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<'TEMPORARY_EXIT' | 'DELAY' | 'EARLY_EXIT' | 'EXTERNAL_MISSION'>('TEMPORARY_EXIT');
  const [startTime, setStartTime] = useState('11:00');
  const [endTime, setEndTime] = useState('12:30');
  const [reason, setReason] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!date || !startTime || !endTime || !reason.trim()) {
      setErrorMsg('يرجى استكمال جميع بيانات طلب الاستئذان.');
      return;
    }

    if (startTime >= endTime) {
      setErrorMsg('وقت بداية الاستئذان يجب أن يكون قبل وقت العودة المتوقع.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPermission: true,
          date,
          type,
          startTime,
          endTime,
          reason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'فشل إرسال طلب الاستئذان');
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setErrorMsg('حدث خطأ بالاتصال بالسيرفر أثناء إرسال الطلب.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">طلب استئذان ساعي ⏱️</h3>
              <p className="text-xs text-slate-500">خروج مؤقت للعمل أو استئذان خاص</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-800 font-bold text-xs mb-1.5">نوع الاستئذان</label>
            <select
              value={type}
              onChange={(e: any) => setType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none"
            >
              <option value="TEMPORARY_EXIT">☕ خروج مؤقت واسترواح</option>
              <option value="DELAY">⏰ استئذان تأخير عن بداية الدوام</option>
              <option value="EARLY_EXIT">🚪 خروج مبكر قبل الانتهاء</option>
              <option value="EXTERNAL_MISSION">💼 مهمة عمل خارجية</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-800 font-bold text-xs mb-1.5">تاريخ الاستئذان *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-800 font-bold text-xs mb-1.5">وقت المغادرة *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-800 font-bold text-xs mb-1.5">وقت العودة المتوقع *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-800 font-bold text-xs mb-1.5">السبب والملاحظات *</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب سبب طلب الاستئذان بالتفصيل..."
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
              className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>تقديم طلب الاستئذان</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
