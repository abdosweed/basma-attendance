'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Shield, Building, Clock, Key, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddEmployeeModalProps {
  branches: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddEmployeeModal({ branches, onClose, onSuccess }: AddEmployeeModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'basic' | 'account' | 'work'>('basic');

  // البيانات الأساسية
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [hireDate, setHireDate] = useState(new Date().toISOString().slice(0, 10));

  // بيانات الحساب والدور
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [status, setStatus] = useState('ACTIVE');

  // الفروع والورديات
  const [primaryBranchId, setPrimaryBranchId] = useState(branches[0]?.id || '');
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(branches[0] ? [branches[0].id] : []);
  const [shiftId, setShiftId] = useState('');
  const [allowOutsideBranch, setAllowOutsideBranch] = useState(false);

  const [shifts, setShifts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // جلب الورديات والأقسام المتاحة
  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (res.ok) {
          const data = await res.json();
          // تعيين قيم افتراضية للأقسام
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadMeta();
  }, []);

  const handleBranchToggle = (bId: string) => {
    if (selectedBranchIds.includes(bId)) {
      if (selectedBranchIds.length === 1) return; // يجب إبقاء فرع واحد على الأقل
      setSelectedBranchIds(selectedBranchIds.filter((id) => id !== bId));
    } else {
      setSelectedBranchIds([...selectedBranchIds, bId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!firstName.trim() || !lastName.trim() || !employeeNumber.trim() || !email.trim() || !password) {
      setErrorMsg('يرجى ملء كافة البيانات الأساسية المطلوبة.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          employeeNumber,
          phone,
          email,
          password,
          role,
          jobTitle,
          departmentId: departmentId || null,
          primaryBranchId: primaryBranchId || branches[0]?.id,
          branchIds: selectedBranchIds,
          shiftId: shiftId || null,
          allowOutsideBranch,
          hireDate,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'فشلت إضافة الموظف');
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setErrorMsg('حدث خطأ بالاتصال بالسيرفر أثناء إنشاء الموظف.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* ترويسة المودال */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">إضافة موظف جديد</h3>
              <p className="text-xs text-slate-400">إنشاء ملف الموظف وحسابه التلقائي وتحديد صلاحيات الحضور</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* أزرار التنقل الفرعية للنموذج */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-4 pt-3 gap-2">
          <button
            onClick={() => setActiveSubTab('basic')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'basic'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            👤 البيانات الأساسية
          </button>
          <button
            onClick={() => setActiveSubTab('account')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'account'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🔑 الحساب والصلاحيات
          </button>
          <button
            onClick={() => setActiveSubTab('work')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'work'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🏢 الفروع والورديات
          </button>
        </div>

        {/* جسم النموذج */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. التبويب الأول: البيانات الأساسية */}
          {activeSubTab === 'basic' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الاسم الأول *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="مثال: أحمد"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الاسم الأخير *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="مثال: علي"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الرقم الوظيفي *</label>
                  <input
                    type="text"
                    required
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value)}
                    placeholder="EMP-101"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-sky-400 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+2189..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">المسمى الوظيفي</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="مهندس برمجيات"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">تاريخ التوظيف</label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. التبويب الثاني: الحساب والصلاحيات */}
          {activeSubTab === 'account' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">البريد الإلكتروني (لتسجيل الدخول) *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@basma.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور المؤقتة *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">تأكيد كلمة المرور *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">دور المستخدم (Role) *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500 font-bold"
                  >
                    <option value="EMPLOYEE">👤 موظف (EMPLOYEE)</option>
                    <option value="SUPERVISOR">🔍 مشرف (SUPERVISOR)</option>
                    <option value="BRANCH_MANAGER">🏢 مدير فرع (BRANCH_MANAGER)</option>
                    <option value="HR">📋 موارد بشرية (HR)</option>
                    <option value="ADMIN">🔑 مدير نظام (ADMIN)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">حالة الحساب *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500 font-bold"
                  >
                    <option value="ACTIVE">🟢 مفعّل (ACTIVE)</option>
                    <option value="INACTIVE">⚪ غير مفعّل (INACTIVE)</option>
                    <option value="SUSPENDED">🔴 موقوف (SUSPENDED)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 3. التبويب الثالث: الفروع والورديات */}
          {activeSubTab === 'work' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الفرع الرئيسي للموظف</label>
                <select
                  value={primaryBranchId}
                  onChange={(e) => setPrimaryBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500 font-bold"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (نطاق {b.geofenceRadius}m)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  الفروع المسموح للموظف بالحضور منها (Geofence Authorized Branches)
                </label>
                <div className="space-y-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  {branches.map((b) => (
                    <label key={b.id} className="flex items-center gap-3 p-2 hover:bg-slate-900 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBranchIds.includes(b.id)}
                        onChange={() => handleBranchToggle(b.id)}
                        className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-700"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-white">{b.name}</span>
                        <span className="text-[10px] text-slate-400 mx-2">• نطاق {b.geofenceRadius} متر</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-bold text-white block">السماح بالعمل خارج نطاق الفروع</span>
                  <span className="text-[10px] text-slate-400">مخصص للموظفين الميدانيين أو مندوبي المبيعات</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowOutsideBranch}
                  onChange={(e) => setAllowOutsideBranch(e.target.checked)}
                  className="w-5 h-5 rounded text-sky-600 bg-slate-900 border-slate-700"
                />
              </div>
            </div>
          )}

          {/* أزرار الإرسال والإلغاء */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="flex gap-2">
              {activeSubTab !== 'basic' && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveSubTab(activeSubTab === 'work' ? 'account' : 'basic')
                  }
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  السابق
                </button>
              )}
              {activeSubTab !== 'work' && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveSubTab(activeSubTab === 'basic' ? 'account' : 'work')
                  }
                  className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold"
                >
                  التالي
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-600/25 active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>حفظ وإنشاء الموظف</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
