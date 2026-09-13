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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">طلب تصحيح بصمة</h3>
              <p className="text-xs text-slate-400">تقديم وقت مقترح لبصمة مفقودة اعتماد الإدارة</p>
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
            <label className="block font-bold text-slate-300 mb-1">تاريخ اليوم المراد تصحيحه *</label>
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
              <label className="block font-bold text-slate-300 mb-1">وقت الحضور المقترح</label>
              <input
                type="time"
                value={proposedCheckIn}
                onChange={(e) => setProposedCheckIn(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">وقت الانصراف المقترح</label>
              <input
                type="time"
                value={proposedCheckOut}
                onChange={(e) => setProposedCheckOut(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">سبب التصحيح والملاحظة *</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: نسيت تسجيل الانصراف عند المغادرة..."
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
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-amber-600/20 active:scale-95 disabled:opacity-50"
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
