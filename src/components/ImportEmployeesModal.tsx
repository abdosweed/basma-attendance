'use client';

import React, { useState } from 'react';
import { X, FileSpreadsheet, Upload, CheckCircle2, AlertCircle, Play } from 'lucide-react';

interface ImportEmployeesModalProps {
  branches: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportEmployeesModal({
  branches,
  onClose,
  onSuccess,
}: ImportEmployeesModalProps) {
  const [csvText, setCsvText] = useState(
    `الاسم الأول,الاسم الأخير,الرقم الوظيفي,البريد الإلكتروني,الهاتف,المسمى الوظيفي\n` +
      `سالم,المهدي,EMP-201,salem@basma.com,+218910000021,مهندس دعم فني\n` +
      `منى,عبدالسلام,EMP-202,mona@basma.com,+218910000022,محللة موارد بشرية`
  );
  const [defaultBranchId, setDefaultBranchId] = useState(branches[0]?.id || '');
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const parseCsv = () => {
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) return [];

    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length >= 4) {
        result.push({
          firstName: parts[0] || 'موظف',
          lastName: parts[1] || 'جديد',
          employeeNumber: parts[2] || `EMP-${i}`,
          email: parts[3] || `emp_${i}@basma.com`,
          phone: parts[4] || null,
          jobTitle: parts[5] || 'موظف',
        });
      }
    }
    return result;
  };

  const handleImport = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    const parsedEmployees = parseCsv();
    if (parsedEmployees.length === 0) {
      setErrorMsg('يرجى التأكد من صياغة البيانات وإدخال موظف واحد على الأقل.');
      return;
    }

    setImporting(true);

    try {
      const res = await fetch('/api/employees/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: parsedEmployees,
          defaultBranchId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'فشلت عملية الاستيراد');
      } else {
        setSuccessMsg(data.message || 'تم الاستيراد بنجاح!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء الاتصال بالسيرفر للاستيراد.');
    } finally {
      setImporting(false);
    }
  };

  const parsedList = parseCsv();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">استيراد جماعي للموظفين من Excel / CSV</h3>
              <p className="text-xs text-slate-400">معاينة البيانات وإنشاء حسابات الموظفين دفعة واحدة</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-300 mb-1">الفرع الرئيسي الافتراضي للموظفين المستوردين</label>
            <select
              value={defaultBranchId}
              onChange={(e) => setDefaultBranchId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-bold"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">بيانات CSV النصية (العمود الأول: الاسم، الثاني: العائلة، الثالث: الرقم الوظيفي، الرابع: البريد)</label>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono text-[11px]"
            />
          </div>

          {/* المعاينة */}
          <div>
            <div className="font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>معاينة الصفوف المستخرجة:</span>
              <span className="text-sky-400 font-mono">({parsedList.length} موظف)</span>
            </div>

            <div className="max-h-36 overflow-y-auto bg-slate-950 rounded-xl border border-slate-800 p-2 space-y-1">
              {parsedList.map((row, idx) => (
                <div key={idx} className="p-2 bg-slate-900/60 rounded-lg flex items-center justify-between text-[11px]">
                  <span className="font-bold text-white">
                    {row.firstName} {row.lastName} ({row.employeeNumber})
                  </span>
                  <span className="font-mono text-sky-400">{row.email}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl">
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || parsedList.length === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
            >
              {importing ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>بدء الاستيراد الجماعي ({parsedList.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
