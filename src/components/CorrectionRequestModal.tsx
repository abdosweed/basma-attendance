'use client';

import React, { useState } from 'react';
import { X, Clock, Send, AlertCircle } from 'lucide-react';

interface CorrectionRequestModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CorrectionRequestModal({ onClose, onSuccess }: CorrectionRequestModalProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [proposedCheckIn, setProposedCheckIn] = useState('09:00');
  const [proposedCheckOut, setProposedCheckOut] = useState('16:00');
  const [reason, setReason] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!date || !reason.trim()) {
      setErrorMsg('يرجى تحديد التاريخ وكتابة سبب تصحيح البصمة.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          proposedCheckIn,
          proposedCheckOut,
          reason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'فشلت إضافة طلب التصحيح');
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء إرسال طلب تصحيح البصمة.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">طلب تصحيح بصمة</h3>
              <p className="text-xs text-slate-500">تقديم وقت مقترح لبصمة مفقودة اعتماد الإدارة</p>
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
            <label className="block text-slate-800 font-bold text-xs mb-1.5">تاريخ اليوم المراد تصحيحه *</label>
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
              <label className="block text-slate-800 font-bold text-xs mb-1.5">وقت الحضور المقترح</label>
              <input
                type="time"
                value={proposedCheckIn}
                onChange={(e) => setProposedCheckIn(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-800 font-bold text-xs mb-1.5">وقت الانصراف المقترح</label>
              <input
                type="time"
                value={proposedCheckOut}
                onChange={(e) => setProposedCheckOut(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-800 font-bold text-xs mb-1.5">سبب التصحيح والملاحظة *</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: نسيت تسجيل الانصراف عند المغادرة..."
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
              className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>إرسال طلب التصحيح</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
