'use client';

import React, { useState } from 'react';
import { X, Edit, Shield, Building, Key, AlertCircle, Save } from 'lucide-react';

interface EditEmployeeModalProps {
  employee: any;
  branches: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditEmployeeModal({
  employee,
  branches,
  onClose,
  onSuccess,
}: EditEmployeeModalProps) {
  const [firstName, setFirstName] = useState(employee.firstName || '');
  const [lastName, setLastName] = useState(employee.lastName || '');
  const [jobTitle, setJobTitle] = useState(employee.jobTitle || '');
  const [role, setRole] = useState(employee.user?.role || 'EMPLOYEE');
  const [status, setStatus] = useState(employee.status || 'ACTIVE');
  const [primaryBranchId, setPrimaryBranchId] = useState(
    employee.primaryBranchId || branches[0]?.id || ''
  );
  const [allowOutsideBranch, setAllowOutsideBranch] = useState(
    employee.allowOutsideBranch || false
  );
  const [newPassword, setNewPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);

    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          jobTitle,
          role,
          status,
          primaryBranchId,
          allowOutsideBranch,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'فشلت عملية التعديل');
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء تعديل بيانات الموظف.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">تعديل بيانات الموظف</h3>
              <p className="text-xs text-slate-400">
                {employee.firstName} {employee.lastName} ({employee.employeeNumber})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">الاسم الأول</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">الاسم الأخير</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">المسمى الوظيفي</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">الدور (Role)</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-bold"
              >
                <option value="EMPLOYEE">👤 موظف</option>
                <option value="SUPERVISOR">🔍 مشرف</option>
                <option value="BRANCH_MANAGER">🏢 مدير فرع</option>
                <option value="HR">📋 موارد بشرية</option>
                <option value="ADMIN">🔑 مدير نظام</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">حالة الحساب</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-bold"
              >
                <option value="ACTIVE">🟢 مفعّل (ACTIVE)</option>
                <option value="INACTIVE">⚪ معطّل (INACTIVE)</option>
                <option value="SUSPENDED">🔴 موقوف (SUSPENDED)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">الفرع الرئيسي</label>
            <select
              value={primaryBranchId}
              onChange={(e) => setPrimaryBranchId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-bold"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">السماح بالعمل خارج نطاق الفروع</span>
            </div>
            <input
              type="checkbox"
              checked={allowOutsideBranch}
              onChange={(e) => setAllowOutsideBranch(e.target.checked)}
              className="w-4 h-4 text-sky-600 bg-slate-900 border-slate-700"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">تغيير كلمة المرور (اتركه فارغاً إذا لم ترد التغيير)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="كلمة مرور جديدة..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-sky-600/20"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
