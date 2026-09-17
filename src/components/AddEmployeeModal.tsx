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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
        {/* ترويسة المودال */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">إضافة موظف جديد</h3>
              <p className="text-xs text-slate-500">إنشاء ملف الموظف وحسابه التلقائي وتحديد صلاحيات الحضور</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* أزرار التنقل الفرعية للنموذج */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-4 pt-3 gap-2">
          <button
            onClick={() => setActiveSubTab('basic')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'basic'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            👤 البيانات الأساسية
          </button>
          <button
            onClick={() => setActiveSubTab('account')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'account'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🔑 الحساب والصلاحيات
          </button>
          <button
            onClick={() => setActiveSubTab('work')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'work'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🏢 الفروع والورديات
          </button>
        </div>

        {/* جسم النموذج */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. التبويب الأول: البيانات الأساسية */}
          {activeSubTab === 'basic' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold text-xs mb-1.5">الاسم الأول *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="مثال: أحمد"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-lg px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold text-xs mb-1.5">الاسم الأخير *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="مثال: علي"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-lg px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold text-xs mb-1.5">الرقم الوظيفي *</label>
                  <input
                    type="text"
                    required
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value)}
                    placeholder="EMP-101"
                    className="w-full bg-slate-50 border border-slate-300 text-sky-700 font-mono font-bold rounded-lg px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold text-xs mb-1.5">رقم الهاتف</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+2189..."
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-lg px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold text-xs mb-1.5">المسمى الوظيفي</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="مهندس برمجيات"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-lg px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold text-xs mb-1.5">تاريخ التوظيف</label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. التبويب الثاني: الحساب والصلاحيات */}
          {activeSubTab === 'account' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-slate-800 font-bold text-xs mb-1.5">البريد الإلكتروني (لتسجيل الدخول) *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@basma.com"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-lg px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold text-xs mb-1.5">كلمة المرور المؤقتة *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-lg px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 font-bold text-xs mb-1.5">تأكيد كلمة المرور *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-lg px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold text-xs mb-1.5">دور المستخدم (Role) *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                  >
                    <option value="EMPLOYEE">👤 موظف (EMPLOYEE)</option>
                    <option value="SUPERVISOR">🔍 مشرف (SUPERVISOR)</option>
                    <option value="BRANCH_MANAGER">🏢 مدير فرع (BRANCH_MANAGER)</option>
                    <option value="HR">📋 موارد بشرية (HR)</option>
                    <option value="ADMIN">🔑 مدير نظام (ADMIN)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold text-xs mb-1.5">حالة الحساب *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none"
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
                <label className="block text-slate-800 font-bold text-xs mb-1.5">الفرع الرئيسي للموظف</label>
                <select
                  value={primaryBranchId}
                  onChange={(e) => setPrimaryBranchId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-lg px-3.5 py-2.5 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (نطاق {b.geofenceRadius}m)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-800 font-bold text-xs mb-2">
                  الفروع المسموح للموظف بالحضور منها (Geofence Authorized Branches)
                </label>
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {branches.map((b) => (
                    <label key={b.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                      <input
                        type="checkbox"
                        checked={selectedBranchIds.includes(b.id)}
                        onChange={() => handleBranchToggle(b.id)}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-900">{b.name}</span>
                        <span className="text-[10px] text-slate-500 mx-2">• نطاق {b.geofenceRadius} متر</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">السماح بالعمل خارج نطاق الفروع</span>
                  <span className="text-[10px] text-slate-500">مخصص للموظفين الميدانيين أو مندوبي المبيعات</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowOutsideBranch}
                  onChange={(e) => setAllowOutsideBranch(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          {/* أزرار الإرسال والإلغاء */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex gap-2">
              {activeSubTab !== 'basic' && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveSubTab(activeSubTab === 'work' ? 'account' : 'basic')
                  }
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-lg border border-slate-200 transition-colors text-xs"
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
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition-all text-xs"
                >
                  التالي
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-lg border border-slate-200 transition-colors text-sm"
              >
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
