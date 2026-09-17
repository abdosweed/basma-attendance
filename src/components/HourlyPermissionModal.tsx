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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">طلب استئذان ساعي ⏱️</h3>
              <p className="text-xs text-slate-400">خروج مؤقت للعمل أو استئذان خاص</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-300 mb-1">نوع الاستئذان</label>
            <select
              value={type}
              onChange={(e: any) => setType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-bold"
            >
              <option value="TEMPORARY_EXIT">☕ خروج مؤقت واسترواح</option>
              <option value="DELAY">⏰ استئذان تأخير عن بداية الدوام</option>
              <option value="EARLY_EXIT">🚪 خروج مبكر قبل الانتهاء</option>
              <option value="EXTERNAL_MISSION">💼 مهمة عمل خارجية</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">تاريخ الاستئذان *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">وقت المغادرة *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">وقت العودة المتوقع *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">السبب والملاحظات *</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب سبب طلب الاستئذان بالتفصيل..."
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
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/20 active:scale-95 disabled:opacity-50"
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
