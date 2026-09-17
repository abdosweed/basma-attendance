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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">استيراد جماعي للموظفين من Excel / CSV</h3>
              <p className="text-xs text-slate-500">معاينة البيانات وإنشاء حسابات الموظفين دفعة واحدة</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-800 font-bold text-xs mb-1.5">الفرع الرئيسي الافتراضي للموظفين المستوردين</label>
            <select
              value={defaultBranchId}
              onChange={(e) => setDefaultBranchId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-800 font-bold text-xs mb-1.5">بيانات CSV النصية (العمود الأول: الاسم، الثاني: العائلة، الثالث: الرقم الوظيفي، الرابع: البريد)</label>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 text-slate-900 font-mono text-xs rounded-lg outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {/* المعاينة */}
          <div>
            <div className="text-slate-800 font-bold text-xs mb-2 flex items-center justify-between">
              <span>معاينة الصفوف المستخرجة:</span>
              <span className="text-sky-600 font-mono font-bold">({parsedList.length} موظف)</span>
            </div>

            <div className="max-h-36 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 p-2 space-y-1">
              {parsedList.map((row, idx) => (
                <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">
                    {row.firstName} {row.lastName} ({row.employeeNumber})
                  </span>
                  <span className="font-mono text-sky-700 font-medium">{row.email}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-lg border border-slate-200 transition-colors text-sm">
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || parsedList.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all text-sm flex items-center gap-2 disabled:opacity-50"
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
